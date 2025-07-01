<script setup lang="ts">
import { toRefs } from "vue"
import { Icon, Button, Separator, Starlight } from "@/components/universal"
import { DescriptionDisplay } from "@/components-business/form-display"
import { DescriptionEditor, DateEditor, DateTimeEditor, FavoriteEditor, TagmePatchEditor } from "@/components-business/form-editor"
import { TAGME_TYPE_ICONS } from "@/constants/entity"
import { useSideBarAction } from "@/services/main/illust"
import { ElementPopupMenu, FormEditKit } from "@/components/interaction"
import { MenuItem } from "@/modules/popup-menu"

const props = defineProps<{
    selected: number[]
    selectedIndex: (number | undefined)[]
    parent?: {type: "book", bookId: number} | {type: "folder", folderId: number} | null
}>()

const { selected, selectedIndex, parent } = toRefs(props)

const { actives, form, editMetaTag, setScore, setFavorite, setDescription, setTagme, editOrderTimeRange, editPartitionTime, submitOrderTimeRange, submitPartitionTime, partitionTimeAction, orderTimeAction, ordinalAction } = useSideBarAction(selected, selectedIndex, parent)

const partitionTimeEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "设置日期…", click: editPartitionTime},
    {type: "separator"},
    {type: "normal", label: "集中在分布最多的那天", click: () => partitionTimeAction("MOST")},
    {type: "normal", label: "设为最早的那天", click: () => partitionTimeAction("EARLIEST")},
    {type: "normal", label: "设为最晚的那天", click: () => partitionTimeAction("LATEST")},
    {type: "separator"},
    {type: "normal", label: "设为今天", click: () => partitionTimeAction("TODAY")},
]

const orderTimeEllipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "normal", label: "设置时间范围…", click: editOrderTimeRange},
    {type: "separator"},
    {type: "normal", label: "集中在分布最多的那天", click: () => orderTimeAction("MOST")},
    {type: "normal", label: "倒置排序时间", click: () => orderTimeAction("REVERSE")},
    {type: "normal", label: "均匀分布排序时间", click: () => orderTimeAction("UNIFORMLY")},
    {type: "separator"},
    {type: "normal", label: "设为当前时间", click: () => orderTimeAction("NOW")},
    {type: "separator"},
    {type: "normal", label: "按来源顺序重设排序时间", click: () => orderTimeAction("BY_SOURCE_ID")},
    ...(parent?.value ? [{type: "normal", label: `按${parent.value.type === "book" ? "画集" : "目录"}内排序顺序重设排序时间`, click: () => orderTimeAction("BY_ORDINAL")}] : []),
]

const ordinalEllipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "挪到开头", click: () => ordinalAction("MOVE_TO_HEAD")},
    {type: "normal", label: "挪到末尾", click: () => ordinalAction("MOVE_TO_TAIL")},
    {type: "normal", label: "倒置排序顺序", click: () => ordinalAction("REVERSE")},
    {type: "separator"},
    {type: "normal", label: "按排序时间顺序重排序", click: () => ordinalAction("SORT_BY_ORDER_TIME")},
    {type: "normal", label: "按来源顺序重排序", click: () => ordinalAction("SORT_BY_SOURCE_ID")},
]

</script>

<template>
    <p class="my-1 has-text-centered">
        <Icon icon="pen-nib"/>已选择<b>{{selected.length}}</b>项
    </p>
    <Separator direction="horizontal"/>
    <div class="mt-1 flex jc-between">
        <Starlight editable :value="form.score" @update:value="setScore"/>
        <FavoriteEditor :value="form.favorite" @update:value="setFavorite"/>
    </div>
    <FormEditKit class="mt-2" :value="form.description" :set-value="setDescription" allow-single-click>
        <template #default="{ value }">
            <DescriptionDisplay :value="value" placeholder="编辑描述…"/>
        </template>
        <template #edit="{ value, setValue }">
            <DescriptionEditor :value="value" @update:value="setValue"/>
        </template>
    </FormEditKit>
    <div class="mt-1">
        <Button class="w-100 has-text-left" size="small" icon="tag" @click="editMetaTag">编辑标签…</Button>
    </div>
    <FormEditKit :value="form.tagme" :set-value="setTagme" allow-single-click>
        <template #default="{ value }">
            <Button class="w-100 has-text-left" size="small" icon="flag">设置TAGME<span class="float-right has-text-primary"><Icon v-for="tagme in value" :icon="TAGME_TYPE_ICONS[tagme.value[0]]"/></span></Button>
        </template>
        <template #edit="{ value, setValue }">
            <TagmePatchEditor :value="value" @update:value="setValue"/>
        </template>
    </FormEditKit>
    <ElementPopupMenu :items="partitionTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left" size="small" icon="calendar-alt" end-icon="ellipsis-v" @click="popup">设置时间分区</Button>
    </ElementPopupMenu>
    <DateEditor v-if="actives.partitionTime && form.partitionTime" class="mb-1" auto-focus v-model:value="form.partitionTime" @enter="submitPartitionTime"/>
    <ElementPopupMenu :items="orderTimeEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left" size="small" icon="business-time" end-icon="ellipsis-v" @click="popup">设置排序时间</Button>
    </ElementPopupMenu>
    <div v-if="actives.orderTime && form.orderTime" class="mb-1">
        <label class="label is-font-size-small">起始时间</label>
        <DateTimeEditor auto-focus v-model:value="form.orderTime.begin" @enter="submitOrderTimeRange"/>
        <label class="label is-font-size-small">末尾时间</label>
        <DateTimeEditor v-model:value="form.orderTime.end" @enter="submitOrderTimeRange"/>
    </div>
    <ElementPopupMenu v-if="!!parent" :items="ordinalEllipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
        <Button :ref="setEl" class="w-100 has-text-left" size="small" icon="sort-amount-down" end-icon="ellipsis-v" @click="popup">{{ parent.type === "book" ? "画集" : "目录" }}内部顺序</Button>
    </ElementPopupMenu>
</template>
