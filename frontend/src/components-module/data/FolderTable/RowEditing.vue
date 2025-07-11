<script setup lang="ts">
import { Input } from "@/components/form"
import { Icon, Button } from "@/components/universal"
import { useMessageBox } from "@/modules/message-box"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { computedMutable } from "@/utils/reactivity"
import { useFolderTreeContext } from "./context"

const props = defineProps<{
    parentId: number | null
    row: FolderTreeNode
    indent: number
}>()

const message = useMessageBox()

const { mode, emit } = useFolderTreeContext()

const title = computedMutable<string>(() => props.row.title)

const submit = () => {
    if(!title.value.trim()) {
        message.showOkMessage("prompt", "不合法的标题。", "标题不能为空。")
        return
    }
    emit.rename(props.row.id, title.value)
}

const cancel = () => emit.updateEditPosition(undefined)

</script>

<template>
    <tr class="selected">
        <td :colspan="mode === 'std' ? 5 : 3">
            <span :style="{'padding-left': `${indent * 1.7}em`}" class="mr-mhalf"/>
            <Icon :icon="row.type === 'FOLDER' ? 'folder' : 'angle-right'"/>
            <Input size="small" :placeholder="`${row.type === 'FOLDER' ? '目录' : '节点'}标题`" v-model:value="title" @enter="submit" auto-focus/>
            <Button class="ml-2" size="small" icon="check" @click="submit">保存</Button>
            <Button class="ml-1" size="small" icon="times" @click="cancel">取消</Button>
        </td>
    </tr>
</template>
