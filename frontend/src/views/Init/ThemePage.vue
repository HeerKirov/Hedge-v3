<script setup lang="ts">
import { reactive, watch } from "vue"
import { Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { ThemeSelector } from "@/components/displays"
import { NativeTheme } from "@/functions/ipc-client"
import { useAppearance } from "@/functions/app"

const props = defineProps<{
    theme: NativeTheme
}>()

const emit = defineEmits<{
    (e: "prev"): void
    (e: "submit", theme: NativeTheme): void
}>()

const data = reactive({
    theme: props.theme
})

const submit = () => {
    emit("submit", data.theme)
}

const appearance = useAppearance()

watch(() => data.theme, theme => appearance.value = {theme}, {immediate: true})

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">选择外观</h3>
        <p class="mb-4">Hedge支持亮色模式，或暗色模式，或跟随系统切换。</p>
        <ThemeSelector class="mx-4" v-model:theme="data.theme"/>
        <template #bottom>
            <Button type="primary" mode="light" icon="arrow-left" @click="$emit('prev')">上一步</Button>
            <Button class="float-right" type="primary" mode="filled" icon="arrow-right" @click="submit">下一步</Button>
        </template>
    </BottomLayout>
</template>
