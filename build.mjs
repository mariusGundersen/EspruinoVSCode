import * as esbuild from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

try {
  await mkdir(join('out', 'prebuilt'), { recursive: true });
  await copyFile(join('node_modules', 'noble-winrt', 'prebuilt', 'BLEServer.exe'), join('out', 'prebuilt', 'BLEServer.exe'));
} catch (e) {
  console.warn(e);
}

const argv = process.argv;

const minify = argv.includes('--minify');
const sourcemap = argv.includes('--sourcemap');
const watch = argv.includes('--watch');

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: 'out/main.js',
  external: [
    'vscode',
    'nw.gui',
    'noble' // not external, but shouldn't be used either
  ],
  platform: 'node',
  format: 'cjs',
  sourcemap,
  minify,
  loader: { ".node": "file" },
};

if (watch) {
  const context = await esbuild.context(buildOptions);
  await context.watch();

  process.on("SIGINT", () => context.cancel());
} else {
  const result = await esbuild.build(buildOptions);
  console.log(result);
}