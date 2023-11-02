<script setup lang="ts">
import { Button } from "@/components/universal"
import { useDroppableForFile } from "@/modules/drag"
import { useImportContext } from "@/services/main/import"

const { operators: { openDialog, historyMode } } = useImportContext()

const dropEvents = useDroppableForFile()

</script>

<template>
    <div class="has-text-centered" v-bind="dropEvents">
        <p class="secondary-text"><i>{{ historyMode ? "没有任何历史记录" : "没有任何导入记录" }}</i></p>
        <div v-if="!historyMode" class="absolute center">
            <Button mode="light" type="success" icon="file" @click="openDialog">添加文件</Button>
            <p class="mt-2 has-text-secondary">或拖曳文件到此处</p>
        </div>
    </div>
</template>