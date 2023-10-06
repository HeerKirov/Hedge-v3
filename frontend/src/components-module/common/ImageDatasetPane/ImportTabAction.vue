<script setup lang="ts">
import { toRefs } from "vue"
import { Icon, Button, Separator } from "@/components/universal"
import { FormEditKit, ElementPopupMenu } from "@/components/interaction"
import { TagmeInfo } from "@/components-business/form-display"
import { TagmeEditor, DateEditor } from "@/components-business/form-editor"
import { MenuItem } from "@/modules/popup-menu"
import { useSideBarAction } from "@/services/main/import"

const props = defineProps<{
    filename: string | null
    selected: number[]
}>()

const { filename, selected } = toRefs(props)

const { actives, form, setTagme, analyseSource, createTimeAction, orderTimeAction, submitPartitionTime } = useSideBarAction(selected)

const createTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "按 项目导入时间 设定", click: () => createTimeAction("IMPORT_TIME")},
    {type: "normal", label: "按 文件创建时间 设定", click: () => createTimeAction("CREATE_TIME")},
    {type: "normal", label: "按 文件修改时间 设定", click: () => createTimeAction("UPDATE_TIME")},
]

const orderTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "按 项目导入时间 设定", click: () => orderTimeAction("IMPORT_TIME")},
    {type: "normal", label: "按 文件创建时间 设定", click: () => orderTimeAction("CREATE_TIME")},
    {type: "normal", label: "按 文件修改时间 设定", click: () => orderTimeAction("UPDATE_TIME")},
]

</script>

<template>
    <p class="my-1 has-text-centered">
        已选择<b>{{selected.length}}</b>项
    </p>
    <Separator direction="horizontal"/>
    <p class="mt-2 has-text-centered"><Icon icon="pen-nib"/><b>多选操作</b></p>
    <FormEditKit class="mt-1" :value="form.tagme" :set-value="setTagme">
        <template #default="{ value }">
            <TagmeInfo :value="value"/>
        </template>
        <template #edit="{ value, setValue }">
            <TagmeEditor class="mt-1" :value="value" @update:value="setValue"/>
        </template>
    </FormEditKit>
    <Button class="mt-1 w-100 has-text-left" size="small" icon="file-invoice" @click="analyseSource">分析来源</Button>
    <Button class="w-100 has-text-left" size="small" icon="calendar-alt" :type="actives.partitionTime ? 'primary' : undefined" @click="actives.partitionTime = !actives.partitionTime">设置时间分区</Button>
    <DateEditor v-if="actives.partitionTime" class="mb-1" auto-focus v-model:value="form.partitionTime" @enter="submitPartitionTime"/>
    <ElementPopupMenu :items="createTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left relative" size="small" icon="calendar-plus" @click="popup">设置创建时间<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
    </ElementPopupMenu>
    <ElementPopupMenu :items="orderTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left relative" size="small" icon="business-time" @click="popup">设置排序时间<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
    </ElementPopupMenu>
</template>

<style module lang="sass">
@use "sass:math"
@import "../../../styles/base/size"

.float-right-button-icon
    position: absolute
    right: calc(math.div($element-height-small, 2) - 0.5rem)
    top: calc(math.div($element-height-small, 2) - 0.5rem + 1px)
</style>