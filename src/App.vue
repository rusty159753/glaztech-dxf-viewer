<template>
  <div id="app-root">
    <!-- Branded upload screen until a file is chosen -->
    <div v-if="!store.selectedFile" class="upload-screen">
      <GtiFileUpload @file-select="handleFileSelect" />
    </div>

    <!-- Full CAD viewer once a file is selected -->
    <div v-else>
      <MlCadViewer
        locale="en"
        theme="dark"
        :local-file="store.selectedFile"
        :mode="openMode"
        :base-url="cadDataBaseUrl"
        @create="onViewerCreate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'

import GtiFileUpload from './components/GtiFileUpload.vue'
import { store } from './store'
import { applyGlaztechCustomizations } from './viewerCustomizations'

// Write mode so office staff can add text notes and dimensions
const openMode = AcEdOpenMode.Write

// Fonts/templates are self-hosted under the site root (see
// scripts/fetch-cad-data.mjs) so the viewer works on networks that block
// public CDNs. Trailing slash required: upstream appends 'fonts/'.
const cadDataBaseUrl = new URL('cad-data/', document.baseURI).href

const handleFileSelect = (file: File) => {
  store.selectedFile = file
}

// Runs once the viewer is initialized. Installs Glaz-Tech behavior:
// white-background printing, and "New Drawing" returning to the file picker.
const onViewerCreate = () => {
  applyGlaztechCustomizations(() => {
    // Full page reload back to the upload screen. Returning by toggling
    // store.selectedFile would unmount MlCadViewer, and its onUnmounted calls
    // AcApDocManager.destroy() which unloads the lazy export plugins
    // (cpdf/csvg/chtml) without re-registering them on remount — that broke
    // "Export to PDF" after New Drawing. A fresh load registers them cleanly.
    window.location.reload()
  })
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}

.upload-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: safe center;
  overflow-y: auto;
  /* Dark slate gradient echoing glaztech.com's dark navigation */
  background: linear-gradient(135deg, #16222e 0%, #2c4257 100%);
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}
</style>
