<script setup lang="ts">
import { Button, Icon } from "@/components/universal"
import { ElementPopupCallout } from "@/components/interaction"
import { PathWatcherError } from "@/functions/http-client/api/import"
import { openLocalFile } from "@/modules/others"

defineProps<{
    paths: string[]
    statisticCount: number
    errors: PathWatcherError[]
}>()

defineEmits<{
    (e: "stop"): void
}>()

const REASON_TEXT = {
    "NO_USEFUL_PATH": "没有可用的监听路径。请设置路径。",
    "PATH_NOT_EXIST": "目录不存在。",
    "PATH_IS_NOT_DIRECTORY": "路径并非可访问的目录。",
    "PATH_WATCH_FAILED": "发生错误，目录监听失败。",
    "PATH_NO_LONGER_AVAILABLE": "目录发生了变更。此目录已不可访问。"
}

</script>

<template>
    <ElementPopupCallout :popup-block-color="errors.length ? 'danger' : 'success'">
        <template #default="{ visible, click }">
            <Button class="is-line-height-std" :type="errors.length ? 'danger' : 'success'" icon="ear-listen" @click="click">
                <template v-if="errors.length">
                    <Icon class="mx-1" icon="exclamation-triangle"/>{{errors.length}}
                </template>
                <template v-else>
                    已收集: {{statisticCount}}
                </template>
            </Button>
        </template>

        <template #popup>
            <div :class="$style.popup">
                <div v-if="errors.length <= 0" class="has-text-success">
                    自动导入：监听中…
                    <div :class="$style.content">
                        <p v-for="p in paths" class="mt-1 no-wrap is-cursor-pointer" @click="openLocalFile(p)">
                            <Icon class="mr-1" icon="folder"/>{{p}}
                        </p>
                    </div>
                </div>
                <div v-else :class="$style.content">
                    <p v-for="error in errors" class="mt-1 has-text-danger no-wrap">
                        <Icon class="mr-1" icon="exclamation-triangle"/>
                        {{error.reason === "NO_USEFUL_PATH" ? REASON_TEXT[error.reason] : `[${error.path}]: ${REASON_TEXT[error.reason]}`}}
                    </p>
                </div>
                <div class="mt-4">
                    <a class="is-font-size-small" @click="$emit('stop')"><Icon class="mr-1" icon="stop"/>停止自动导入</a>
                </div>
            </div>
        </template>
    </ElementPopupCallout>
</template>

<style module lang="sass">
.popup
    width: 15rem
    padding: 0.75rem

.content
    overflow-x: auto
    &::-webkit-scrollbar
        display: none
</style>
