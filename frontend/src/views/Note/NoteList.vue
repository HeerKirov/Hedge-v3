<script setup lang="ts">
import { onMounted } from "vue"
import { BottomLayout, MiddleLayout } from "@/components/layout"
import { Button, Block, Separator, Icon } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { useNoteContext } from "@/services/main/note"
import { NoteRecord } from "@/functions/http-client/api/note"

const { paneState, list: { listview: { data, reset }, filter, toggleCompleted, togglePinned, resumeItem, deleteItem } } = useNoteContext()

onMounted(reset)

const FILTER_BUTTON_LABELS = {
    "all": "所有便签",
    "pin": "只看锁定项",
    "todo": "只看待办项",
    "completed": "已完成",
    "deleted": "已删除"
}

const FILTER_BUTTON_ICONS = {
    "all": "sticky-note",
    "pin": "lock",
    "todo": "square-check",
    "completed": "check",
    "deleted": "trash"
}

const filterMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: FILTER_BUTTON_LABELS["all"], checked: filter.value === "all", click: () => filter.value = "all"},
    {type: "separator"},
    {type: "checkbox", label: FILTER_BUTTON_LABELS["pin"], checked: filter.value === "pin", click: () => filter.value = "pin"},
    {type: "checkbox", label: FILTER_BUTTON_LABELS["todo"], checked: filter.value === "todo", click: () => filter.value = "todo"},
    {type: "separator"},
    {type: "checkbox", label: FILTER_BUTTON_LABELS["completed"], checked: filter.value === "completed", click: () => filter.value = "completed"},
    {type: "checkbox", label: FILTER_BUTTON_LABELS["deleted"], checked: filter.value === "deleted", click: () => filter.value = "deleted"},
]

const { popup } = useDynamicPopupMenu<NoteRecord>(note => note.deleted ? [
    {type: "checkbox", label: "标记为已完成", enabled: false, checked: note.status === "COMPLETED", click: toggleCompleted},
    {type: "checkbox", label: "锁定", enabled: false, checked: note.status === "PINNED", click: togglePinned},
    {type: "separator"},
    {type: "normal", label: "还原", click: resumeItem},
    {type: "normal", label: "彻底删除便签", click: deleteItem}
] : [
    {type: "checkbox", label: "标记为已完成", enabled: note.status !== "PINNED", checked: note.status === "COMPLETED", click: toggleCompleted},
    {type: "checkbox", label: "锁定", checked: note.status === "PINNED", click: togglePinned},
    {type: "separator"},
    {type: "normal", label: "删除便签", click: deleteItem}
])

</script>

<template>
    <BottomLayout class="fixed">
        <template #top>
            <MiddleLayout class="p-1">
                <template #left>
                    <ElementPopupMenu :items="filterMenuItems" position="bottom" v-slot="{ setEl, popup }">
                        <Button :ref="setEl" :icon="FILTER_BUTTON_ICONS[filter]" @click="popup">{{ FILTER_BUTTON_LABELS[filter] }}</Button>
                    </ElementPopupMenu>
                </template>
                <template #right>
                    <Button square icon="plus" @click="paneState.openCreateView"/>
                </template>
            </MiddleLayout>
        </template>

        <Block v-for="item in data.result" v-memo="[item]" :key="item.id" :class="$style.item" @contextmenu="popup(item)">
            <div :class="$style.header">
                <div v-if="item.status === 'PINNED'" :class="$style.lock"><Icon icon="lock"/></div>
                <Button v-else round square :mode="item.status === 'COMPLETED' ? 'light' : undefined" :type="item.status === 'COMPLETED' ? 'primary' : 'secondary'" icon="check" :disabled="item.deleted" @click="toggleCompleted(item)"/>
                <span :class="$style.title" @click="paneState.openDetailView(item.id)">{{ item.title }}</span>
            </div>
            <template v-if="item.content">
                <Separator direction="horizontal"/>
                <p :class="$style.content" @click="paneState.openDetailView(item.id)">{{ item.content.split("\n", 2)[0] }}</p>
            </template>
        </Block>
        <div v-if="data.total === 0" class="absolute center has-text-secondary">
            <i>便签列表为空</i>
        </div>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.item
    padding: $spacing-2
    margin: 0 $spacing-2
    &:not(:first-child)
        margin-top: $spacing-2

    > .header
        display: flex
        flex-wrap: nowrap
        align-items: center
        > .lock
            width: $element-height-std
            height: $element-height-std
            line-height: $element-height-std
            text-align: center
            flex-shrink: 0
        > button
            flex-shrink: 0
        > .title
            width: 100%
            margin-left: $spacing-2
            font-size: $font-size-large
            font-weight: 700
            white-space: nowrap
            overflow: hidden
            text-overflow: ellipsis

    > .content
        margin: 0 $spacing-1
        white-space: nowrap
        overflow: hidden
        text-overflow: ellipsis
</style>