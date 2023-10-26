<script setup lang="ts">
import { toRefs } from "vue"
import { Icon, Button, Separator, Starlight } from "@/components/universal"
import { DescriptionDisplay, TagmeInfo } from "@/components-business/form-display"
import { TagmeEditor, DescriptionEditor, DateEditor, DateTimeEditor } from "@/components-business/form-editor"
import { useSideBarAction } from "@/services/main/illust"
import { ElementPopupMenu, FormEditKit } from "@/components/interaction"
import { Flex, FlexItem } from "@/components/layout"
import { MenuItem } from "@/modules/popup-menu"

const props = defineProps<{
    selected: number[]
    parent?: {type: "book", bookId: number} | {type: "folder", folderId: number} | null
}>()

const { selected, parent } = toRefs(props)

const { actives, form, editMetaTag, setScore, setDescription, setTagme, submitOrderTimeRange, submitPartitionTime, partitionTimeAction, orderTimeAction, ordinalAction } = useSideBarAction(selected, parent)

const partitionTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "设为分布最多的那天", click: () => partitionTimeAction("MOST")},
    {type: "normal", label: "设为最早的那天", click: () => partitionTimeAction("EARLIEST")},
    {type: "normal", label: "设为最晚的那天", click: () => partitionTimeAction("LATEST")},
    {type: "separator"},
    {type: "normal", label: "设为今天", click: () => partitionTimeAction("TODAY")},
]

const orderTimeEllipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "normal", label: "按来源ID顺序重设排序时间", click: () => orderTimeAction("BY_SOURCE_ID")},
    ...(parent?.value ? [{type: "normal", label: `按${parent.value.type === "book" ? "画集" : "目录"}内排序顺序重设排序时间`, click: () => orderTimeAction("BY_ORDINAL")}] : []),
    {type: "separator"},
    {type: "normal", label: "集中在分布最多的那天", click: () => orderTimeAction("MOST")},
    {type: "normal", label: "倒置排序时间", click: () => orderTimeAction("REVERSE")},
    {type: "normal", label: "均匀分布排序时间", click: () => orderTimeAction("UNIFORMLY")},
    {type: "separator"},
    {type: "normal", label: "设为当前时间", click: () => orderTimeAction("NOW")},
]

const ordinalEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "按排序时间顺序重排序", click: () => ordinalAction("SORT_BY_ORDER_TIME")},
    {type: "normal", label: "按来源ID顺序重排序", click: () => ordinalAction("SORT_BY_SOURCE_ID")},
    {type: "separator"},
    {type: "normal", label: "挪到开头", click: () => ordinalAction("MOVE_TO_HEAD")},
    {type: "normal", label: "挪到末尾", click: () => ordinalAction("MOVE_TO_TAIL")},
    {type: "normal", label: "倒置排序顺序", click: () => ordinalAction("REVERSE")},
]

</script>

<template>
    <p class="my-1 has-text-centered">
        已选择<b>{{selected.length}}</b>项
    </p>
    <Separator direction="horizontal"/>
    <p class="mt-2 has-text-centered"><Icon icon="pen-nib"/><b>多选操作</b></p>
    <p class="mt-2"><Starlight editable :value="form.score" @update:value="setScore"/></p>
    <FormEditKit class="mt-1" :value="form.description" :set-value="setDescription">
        <template #default="{ value }">
            <DescriptionDisplay :value="value"/>
        </template>
        <template #edit="{ value, setValue }">
            <DescriptionEditor :value="value" @update:value="setValue"/>
        </template>
    </FormEditKit>
    <FormEditKit class="mt-1" :value="form.tagme" :set-value="setTagme">
        <template #default="{ value }">
            <TagmeInfo :value="value"/>
        </template>
        <template #edit="{ value, setValue }">
            <TagmeEditor class="mt-1" :value="value" @update:value="setValue"/>
        </template>
    </FormEditKit>
    <Button class="mt-1 w-100 has-text-left" size="small" icon="tag" @click="editMetaTag">添加标签…</Button>
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
    <ElementPopupMenu v-if="!!parent" :items="ordinalEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left relative" size="small" icon="sort-amount-down" @click="popup">{{ parent.type === "book" ? "画集" : "目录" }}内部顺序<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
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