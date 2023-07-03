<script setup lang="ts">
import { ref } from "vue"
import { Input } from "@/components/form"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { useMessageBox } from "@/modules/message-box"
import { MenuItem } from "@/modules/popup-menu"
import { FolderType } from "@/functions/http-client/api/folder"
import { useFolderTreeContext } from "./context"

const props = defineProps<{
    parentId: number | null
    ordinal: number
    indent: number
}>()

const message = useMessageBox()

const { mode, emit } = useFolderTreeContext()

const selectMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "节点", click: () => type.value = "NODE"},
    {type: "normal", label: "目录", click: () => type.value = "FOLDER"},
]

const title = ref<string>("")

const type = ref<FolderType>("FOLDER")

const submit = () => {
    if(!title.value.trim()) {
        message.showOkMessage("prompt", "不合法的标题。", "标题不能为空。")
        return
    }
    emit.create({title: title.value, type: type.value, parentId: props.parentId, ordinal: props.ordinal})
}

const cancel = () => emit.updateCreatePosition(undefined)

</script>

<template>
    <tr class="selected">
        <td :colspan="mode === 'std' ? 5 : 3">
            <span :style="{'padding-left': `${indent * 1.7}em`}" :class="{'mr-m1': indent > 0}"/>
            <ElementPopupMenu :items="selectMenuItems" position="bottom" align="left" v-slot="{ setEl, popup }">
                <Button :ref="setEl" size="small" @click="popup" :icon="type === 'FOLDER' ? 'folder' : 'angle-right'">{{type === "FOLDER" ? "目录" : "节点"}}</Button>
            </ElementPopupMenu>
            <Input class="ml-1" size="small" :placeholder="`${type === 'FOLDER' ? '目录' : '节点'}标题`" v-model:value="title" @enter="submit"/>
            <Button class="ml-2" size="small" icon="check" @click="submit">保存</Button>
            <Button class="ml-1" size="small" icon="times" @click="cancel">取消</Button>
        </td>
    </tr>
</template>
