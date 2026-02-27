import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

const sharedConfig = {
  bundle: true,
  sourcemap: false,
  minify: true,
  target: 'chrome120',
  define: {
    'process.env.NODE_ENV': '"production"',
    '__VERSION__': `"${pkg.version}"`,
  },
  drop: ['console', 'debugger'],
  treeShaking: true,
  legalComments: 'none',
};

const configs = [
  {
    ...sharedConfig,
    entryPoints: ['src/background/service-worker.ts'],
    outfile: 'dist/background/service-worker.js',
    format: 'esm',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/content/page-world.ts'],
    outfile: 'dist/content/page-world.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/content/main.ts'],
    outfile: 'dist/content/main.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/popup/popup.ts'],
    outfile: 'dist/popup/popup.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/sidepanel/sidepanel.ts'],
    outfile: 'dist/sidepanel/sidepanel.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/offscreen/offscreen.ts'],
    outfile: 'dist/offscreen/offscreen.js',
    format: 'iife',
  },
];

await Promise.all(configs.map((c) => esbuild.build(c)));
console.log('[esbuild] build complete');
