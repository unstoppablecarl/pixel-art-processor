<script setup lang="ts">
import fileSaver from 'file-saver'
import { useTemplateRef } from 'vue'
import { loadSaveFileData, makeSaveFileData } from '../lib/store/helpers/store-save-load.ts'
import { jsonFileParser } from '../lib/vue/file-upload.ts'

const fileUpload = useTemplateRef<HTMLInputElement>('file-upload')

function saveFile(fileName: string, data: object) {
  let payload = JSON.stringify(data)
  let blob = new Blob([payload], { type: 'text/plain;charset=utf-8' })
  fileSaver.saveAs(blob, `${fileName}.json`)
}

function saveToFile() {
  saveFile('pixel-art-processor', makeSaveFileData())
}

const fileUploadChange = jsonFileParser((jsonData: object) => {
  loadSaveFileData(jsonData)
  if (fileUpload.value) {
    fileUpload.value.value = ''
  }
})
</script>
<template>
  <button role="button" class="btn btn-sm btn-secondary ms-2" @click="saveToFile">Save</button>
  <button role="button" class="btn btn-sm btn-secondary ms-2" @click="() => fileUpload?.click()">Load</button>
  <input ref="file-upload" type="file" @change="fileUploadChange" accept="application/json" hidden>

</template>
<style lang="scss">

</style>