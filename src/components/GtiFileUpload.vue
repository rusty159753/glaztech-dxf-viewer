<template>
  <div class="gti-upload-panel">
    <img
      class="gti-logo"
      src="/gti-logo-white.png"
      alt="Glaz-Tech Industries"
    />
    <h1 class="gti-title">DXF Viewer</h1>
    <p class="gti-subtitle">
      View, measure, and annotate DWG/DXF drawings — no CAD license required.
    </p>

    <el-upload
      class="gti-dropzone"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept=".dwg,.dxf"
      :on-change="handleFileChange"
    >
      <div class="gti-dropzone-content">
        <el-icon :size="36" class="gti-upload-icon">
          <UploadFilled />
        </el-icon>
        <p class="gti-drop-title">Drop your drawing here</p>
        <p class="gti-drop-hint">
          or <span class="gti-link">browse files</span>
        </p>
        <div class="gti-format-tags">
          <span class="gti-format-tag">DWG</span>
          <span class="gti-format-tag">DXF</span>
        </div>
      </div>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ElIcon, ElMessage, ElUpload, type UploadFile } from 'element-plus'

const emit = defineEmits<{
  (e: 'file-select', file: File): void
}>()

const handleFileChange = (uploadFile: UploadFile) => {
  const raw = uploadFile.raw
  if (!raw) {
    return
  }
  const name = raw.name.toLowerCase()
  if (!name.endsWith('.dwg') && !name.endsWith('.dxf')) {
    ElMessage.error('Please select a DWG or DXF file')
    return
  }
  emit('file-select', raw)
}
</script>

<style scoped>
.gti-upload-panel {
  width: min(520px, 92vw);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 40px 36px;
  text-align: center;
  backdrop-filter: blur(6px);
}

.gti-logo {
  width: 275px;
  max-width: 80%;
  height: auto;
  margin-bottom: 8px;
}

.gti-title {
  color: #fff;
  font-size: 26px;
  font-weight: 600;
  margin: 4px 0 8px;
  letter-spacing: 0.04em;
}

.gti-subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  margin: 0 0 28px;
}

.gti-dropzone :deep(.el-upload-dragger) {
  background: rgba(255, 255, 255, 0.04);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 36px 16px;
  transition: border-color 0.2s ease;
}

.gti-dropzone :deep(.el-upload-dragger:hover) {
  border-color: #3182bf;
}

.gti-upload-icon {
  color: #3182bf;
  margin-bottom: 8px;
}

.gti-drop-title {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px;
}

.gti-drop-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 0 0 16px;
}

.gti-link {
  color: #6fa7d2;
  text-decoration: underline;
}

.gti-format-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.gti-format-tag {
  background: rgba(49, 130, 191, 0.25);
  color: #c1daec;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
</style>
