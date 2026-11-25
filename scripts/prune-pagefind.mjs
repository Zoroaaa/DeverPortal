#!/usr/bin/env node
/**
 * Pagefind 会顺带输出官方 UI 组件包；本站用的是自己写的轻量搜索界面，不需要这些文件。
 * 构建后删除它们，避免把 ~400 KB 用不到的 JS/CSS 一起发布。
 * 文件不存在时静默跳过（兼容 Pagefind 小版本差异）。
 */
import { rm } from 'node:fs/promises';
import path from 'node:path';

const bundleDir = path.join(process.cwd(), 'dist', 'pagefind');
const unused = [
  'pagefind-ui.js',
  'pagefind-ui.css',
  'pagefind-component-ui.js',
  'pagefind-component-ui.css',
  'pagefind-modular-ui.js',
  'pagefind-modular-ui.css',
];

for (const name of unused) {
  await rm(path.join(bundleDir, name), { force: true });
}
console.log('Pagefind: 已移除未使用的官方 UI 资源');
