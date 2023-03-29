<script setup lang="ts">
import { Icon, Block } from "@/components/universal"
import { dialogManager } from "@/modules/dialog"

const props = defineProps<{
    value: string[]
}>()

const emit = defineEmits<{
    (e: "update:value", value: string[]): void
}>()

const removeAt = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

const selectLocation = async () => {
    const location = await dialogManager.openDialog({
        title: "选择本地目录",
        properties: ["openDirectory", "createDirectory", "multiSelections"],
    })
    if(location) {
        const paths = location.filter(path => !props.value.includes(path))
        emit("update:value", [...props.value, ...paths])
    }
}

</script>

<template>
    <Block class="py-1 px-2">
        <p v-for="(v, idx) in value" class="pt-1">
            <Icon class="mr-1" icon="folder"/>{{v}}
            <a class="ml-2" @click="removeAt(idx)"><Icon icon="times"/></a>
        </p>
        <div class="mt-1">
            <a @click="selectLocation"><Icon class="mr-1" icon="folder-open"/>选择文件夹…</a>
        </div>
    </Block>
</template>
