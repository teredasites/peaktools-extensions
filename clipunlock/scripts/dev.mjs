import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

const sharedConfig = {
  bundle: true,
  sourcemap: 'inline',
  minify: false,
  target: 'chrome120',
  define: {
    'process.env.NODE_ENV': '"development"',
    '__VERSION__': `"${pkg.version}"`,
  },
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
    entryPoints: ['src/options/options.ts'],
    outfile: 'dist/options/options.js',
    format: 'iife',
  },
  {
    ...sharedConfig,
    entryPoints: ['src/offscreen/offscreen.ts'],
    outfile: 'dist/offscreen/offscreen.js',
    format: 'iife',
  },
];

const contexts = await Promise.all(configs.map((c) => esbuild.context(c)));
await Promise.all(contexts.map((ctx) => ctx.watch()));
console.log('[esbuild] watching for changes...');
