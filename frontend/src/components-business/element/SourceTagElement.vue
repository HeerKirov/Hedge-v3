<script setup lang="ts">
import { Tag } from "@/components/universal"
import { SourceTag } from "@/functions/http-client/api/source-data"

const props = defineProps<{
    /**
     * annotation value.
     */
    value: SourceTag
    /**
     * 可点击样式。开启后Tag是可点击的样式。
     */
    clickable?: boolean
    /**
     * 是否可被文本选中。
     */
    selectable?: boolean
}>()

</script>

<template>
    <Tag :clickable="clickable" icon="tag">
        <span v-if="selectable" class="selectable">
            {{value.name || value.code}}
            <span v-if="value.otherName && value.otherName !== (value.name || value.code)" class="ml-1 has-text-secondary">({{value.otherName}})</span>
        </span>
        <template v-else>
            {{value.name || value.code}}
            <span v-if="value.otherName && value.otherName !== (value.name || value.code)" class="ml-1 has-text-secondary">({{value.otherName}})</span>
        </template>
    </Tag>
</template>
