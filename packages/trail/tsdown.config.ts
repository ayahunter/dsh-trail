/**
 * Browser client bundle for dsh-trail. Mirrors the harness client-bundle
 * contract: a CJS artifact wrapped in
 * `window.__ModuleLoader__.load({ id, factory: (require) => … })`, with
 * platform modules (react) left external for the shell's module table.
 */
import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'dsh-trail/client',
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  deps: { neverBundle: ['react'] },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: "dsh-trail", factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
