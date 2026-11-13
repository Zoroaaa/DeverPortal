import type { APIRoute, GetStaticPaths } from 'astro';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadContentGraph } from '../../lib/content-graph';

const WIDTH = 1200;
const HEIGHT = 630;

let fontCache: Buffer | null = null;

async function loadFont(): Promise<Buffer> {
  if (!fontCache) {
    // 字体随仓库提交，构建期不联网。
    fontCache = await readFile(path.join(process.cwd(), 'public', 'fonts', 'NotoSansSC-Regular.otf'));
  }
  return fontCache;
}

export const getStaticPaths = (async () => {
  const graph = await loadContentGraph();
  return graph.products.map((product, index) => ({
    params: { slug: product.slug },
    props: {
      name: product.entry.data.name,
      tagline: product.entry.data.tagline,
      status: product.entry.data.status,
      index: index + 1,
      stars: product.snapshot?.data?.stars ?? null,
      commits: product.snapshot?.data?.commitCount ?? null,
      tech: product.tech.slice(0, 3),
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const font = await loadFont();
  const { name, tagline, status, index, stars, commits, tech } = props as {
    name: string;
    tagline: string;
    status: string;
    index: number;
    stars: number | null;
    commits: number | null;
    tech: string[];
  };

  const meta = [
    stars !== null ? `★ ${stars}` : null,
    commits !== null ? `${commits} commits` : null,
    tech.length > 0 ? tech.join(' · ') : null,
  ]
    .filter(Boolean)
    .join('   /   ');

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: `${WIDTH}px`,
          height: `${HEIGHT}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#f7f5ef',
          padding: '72px 80px',
          fontFamily: 'Noto Sans SC',
          color: '#1a1a1a',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 22, letterSpacing: '2px', color: '#6b6b6b' },
                    children: `FIG. ${String(index).padStart(2, '0')}`,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 20,
                      color: status === 'live' ? '#1f4fd8' : '#6b6b6b',
                      border: '1px solid #d5d1c4',
                      padding: '4px 14px',
                    },
                    children: status.toUpperCase(),
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: '28px' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 84, fontWeight: 400, lineHeight: 1.1 },
                    children: name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 34, lineHeight: 1.5, color: '#3c3c3c', display: 'flex' },
                    children: tagline,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                borderTop: '1px solid #d5d1c4',
                paddingTop: '24px',
                fontSize: 22,
                color: '#6b6b6b',
              },
              children: [
                { type: 'div', props: { style: { display: 'flex' }, children: meta || 'wort.uk' } },
                { type: 'div', props: { style: { display: 'flex' }, children: 'wort.uk' } },
              ],
            },
          },
        ],
      },
    },
    { width: WIDTH, height: HEIGHT, fonts: [{ name: 'Noto Sans SC', data: font, weight: 400, style: 'normal' }] },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
};
