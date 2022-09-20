<script setup lang="ts">
import { Block } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { TaskConfig } from "@/functions/http-client/api/find-similar"

const props = defineProps<{
    config: TaskConfig
}>()

const emit = defineEmits<{
    (e: "update:config", v: TaskConfig): void
}>()

const setValue = <K extends keyof TaskConfig>(key: K, value: TaskConfig[K]) => {
    emit("update:config", {...props.config, [key]: value})
}

</script>

<template>
    <Block class="py-2 px-4">
        <label class="label">选用查找方案</label>
        <p class="mt-3">
            <CheckBox :value="config.findBySourceKey" @update:value="setValue('findBySourceKey', $event)">来源重复</CheckBox>
            <p class="is-font-size-small secondary-text">对于拥有完全相同的来源、来源ID、分P的图像，直接将其判定为相同项。</p>
        </p>
        <p class="mt-1">
            <CheckBox :value="config.findBySimilarity" @update:value="setValue('findBySimilarity', $event)">内容相似度判断</CheckBox>
            <p class="is-font-size-small secondary-text">计算图像的特征指纹，比对出内容高度相似以及雷同的图像。</p>
        </p>
        <p class="mt-1">
            <CheckBox :value="config.findBySourceRelation" @update:value="setValue('findBySourceRelation', $event)">来源关系判断</CheckBox>
            <p class="is-font-size-small secondary-text">根据来源的关联项、集合、分P等属性，查找出在来源具有血缘关系的图像。</p>
        </p>
        <p class="mt-1">
            <CheckBox :value="config.findBySourceMark" @update:value="setValue('findBySourceMark', $event)">来源标记</CheckBox>
            <p class="is-font-size-small secondary-text">扩展功能：根据外来添加的标记获知图像之间的血缘关系。</p>
        </p>
        <label class="label mt-3">相似项查找范围</label>
        <p class="is-font-size-small secondary-text">对于每一个待处理的任务项，按照下列可选范围查找可能的相似项。</p>
        <p class="mt-2"><CheckBox :value="config.filterByPartition" @update:value="setValue('filterByPartition', $event)">相同时间分区</CheckBox></p>
        <p class="mt-2"><CheckBox :value="config.filterByAuthor" @update:value="setValue('filterByAuthor', $event)">相同作者标签</CheckBox></p>
        <p class="mt-2"><CheckBox :value="config.filterByTopic" @update:value="setValue('filterByTopic', $event)">相同主题标签</CheckBox></p>
    </Block>
</template>