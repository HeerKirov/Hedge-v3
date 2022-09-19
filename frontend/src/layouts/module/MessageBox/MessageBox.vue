<script setup lang="ts">
import { ref, watch } from "vue"
import { DialogBox } from "@/components/interaction"
import { MessageTask, useMessageBoxManager } from "@/services/module/message-box"
import MessageBoxContent from "./MessageBoxContent.vue"

const { messageTasks } = useMessageBoxManager()

const task = ref<MessageTask>()

function refreshTask() {
    if(messageTasks.length > 0 && task.value == undefined) {
        task.value = messageTasks[0]
        messageTasks.splice(0, 1)
    }
}
watch(() => messageTasks, refreshTask, {deep: true})

const click = (action: string) => {
    if(task.value) {
        const resolve = task.value?.resolve
        task.value = undefined
        resolve(action)
        refreshTask()
    }
}

const close = () => {
    if(task.value?.options.esc) {
        click(task.value.options.esc)
    }
}
</script>

<template>
    <DialogBox :visible="!!task" :close-on-escape="!!task?.options?.esc" :close-on-click-outside="!!task?.options?.esc" @close="close">
        <MessageBoxContent
            :title="task!.options.title"
            :message="task!.options.message"
            :detail-message="task!.options.detailMessage"
            :buttons="task!.options.buttons"
            :enter="task!.options.enter"
            @click="click"
        />
    </DialogBox>
</template>
