import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/
  base: './',
  plugins: [
    vue(),
    // The viewer resolves its parser workers at ./assets/<name>-worker.js
    // relative to the page, so they must be copied out of node_modules.
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-html-plugin/dist/viewer-runtime.iife.js',
          dest: 'assets'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    modulePreload: false
  }
})
