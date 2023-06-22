<script setup lang="ts">
import { Button } from "@/components/universal"
import { useDroppableForFile } from "@/modules/drag"
import { useImportContext } from "@/services/main/import"

const { operators: { openDialog } } = useImportContext()

const dropEvents = useDroppableForFile()

</script>

<template>
    <div class="h-100 has-text-centered relative" v-bind="dropEvents">
        <p class="secondary-text"><i>没有任何暂存的导入项目</i></p>
        <div class="absolute center">
            <Button mode="light" type="success" icon="file" @click="openDialog">添加文件</Button>
            <p class="mt-2 has-text-secondary">或拖曳文件到此处</p>
        </div>
    </div>
</template>