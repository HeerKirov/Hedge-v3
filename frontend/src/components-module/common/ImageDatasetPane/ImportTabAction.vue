<script setup lang="ts">
import { toRefs } from "vue"
import { Flex, FlexItem } from "@/components/layout"
import { Icon, Button, Separator } from "@/components/universal"
import { FormEditKit, ElementPopupMenu } from "@/components/interaction"
import { TagmeInfo } from "@/components-business/form-display"
import { TagmeEditor, DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { MenuItem } from "@/modules/popup-menu"
import { useSideBarAction } from "@/services/main/import"

const props = defineProps<{
    selected: number[]
}>()

const { selected } = toRefs(props)

const { actives, form, setTagme, analyseSource, createTimeAction, orderTimeAction, partitionTimeAction, submitPartitionTime, submitOrderTimeRange } = useSideBarAction(selected)

const partitionTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "设为今天", click: () => partitionTimeAction("TODAY")},
    {type: "normal", label: "设为最早的那天", click: () => partitionTimeAction("EARLIEST")},
    {type: "normal", label: "设为最晚的那天", click: () => partitionTimeAction("LATEST")},
]

const createTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "按 项目导入时间 设定", click: () => createTimeAction("IMPORT_TIME")},
    {type: "normal", label: "按 文件创建时间 设定", click: () => createTimeAction("CREATE_TIME")},
    {type: "normal", label: "按 文件修改时间 设定", click: () => createTimeAction("UPDATE_TIME")},
]

const orderTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "按来源ID顺序重设排序时间", click: () => orderTimeAction("BY_SOURCE_ID")},
    {type: "separator"},
    {type: "normal", label: "按文件导入时间设定", click: () => orderTimeAction("IMPORT_TIME")},
    {type: "normal", label: "按文件创建时间设定", click: () => orderTimeAction("CREATE_TIME")},
    {type: "normal", label: "按文件修改时间设定", click: () => orderTimeAction("UPDATE_TIME")},
    {type: "separator"},
    {type: "normal", label: "设为当前时间", click: () => orderTimeAction("NOW")},
    {type: "normal", label: "倒置排序时间", click: () => orderTimeAction("REVERSE")},
    {type: "normal", label: "均匀分布排序时间", click: () => orderTimeAction("UNIFORMLY")},
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
    <Flex>
        <FlexItem :width="100"><Button class="has-text-left" size="small" icon="calendar-alt" :type="actives.partitionTime ? 'primary' : undefined" @click="actives.partitionTime = !actives.partitionTime">设置时间分区</Button></FlexItem>
        <FlexItem :shrink="0">
            <ElementPopupMenu :items="partitionTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
                <Button :ref="setEl" v-bind="attrs" size="small" square icon="ellipsis-v" @click="popup"/>
            </ElementPopupMenu>
        </FlexItem>
    </Flex>
    <DateEditor v-if="actives.partitionTime" class="mb-1" auto-focus v-model:value="form.partitionTime" @enter="submitPartitionTime"/>
    <Flex>
        <FlexItem :width="100"><Button class="has-text-left" size="small" icon="business-time" :type="actives.orderTime ? 'primary' : undefined" @click="actives.orderTime = !actives.orderTime">设置排序时间</Button></FlexItem>
        <FlexItem :shrink="0">
            <ElementPopupMenu :items="orderTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
                <Button :ref="setEl" v-bind="attrs" size="small" square icon="ellipsis-v" @click="popup"/>
            </ElementPopupMenu>
        </FlexItem>
    </Flex>
    <div v-if="actives.orderTime" class="mb-1">
        <label class="label is-font-size-small">起始时间</label>
        <DateTimeEditor auto-focus v-model:value="form.orderTime.begin" @enter="submitOrderTimeRange"/>
        <label class="label is-font-size-small">末尾时间</label>
        <DateTimeEditor v-model:value="form.orderTime.end" @enter="submitOrderTimeRange"/>
    </div>
    <ElementPopupMenu :items="createTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left relative" size="small" icon="calendar-plus" @click="popup">设置创建时间<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
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