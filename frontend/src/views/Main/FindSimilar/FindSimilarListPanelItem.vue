<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { ElementPopupMenu } from "@/components/interaction"
import { FindSimilarResult } from "@/functions/http-client/api/find-similar"
import { useAssets } from "@/functions/app"
import { MenuItem, usePopupMenu } from "@/modules/popup-menu"
import { useFindSimilarItemContext } from "@/services/main/find-similar"
import { datetime } from "@/utils/datetime"

const props = defineProps<{
    item: FindSimilarResult
}>()

const emit = defineEmits<{
    (e: "click"): void
}>()

const { assetsUrl } = useAssets()

const summaryText = props.item.type.map(t => ({"SAME": "相同", "SIMILAR": "相似", "RELATED": "关系接近"}[t])).join("、")

const { allow, keepNew, keepNewAndCloneProps, keepOld, ignoreIt, deleteIt } = useFindSimilarItemContext(props.item)

const actionMenuItems = <MenuItem<undefined>[]>[
    allow.keepNewAndCloneProps ? {type: "normal", label: "保留新项并从旧项克隆属性", click: keepNewAndCloneProps} : null,
    allow.keepNew ? {type: "normal", label: "保留新项但不克隆属性", click: keepNew} : null,
    allow.keepOld ? {type: "normal", label: "保留旧项", click: keepOld} : null,
    allow.keepNewAndCloneProps || allow.keepNew || allow.keepOld ? {type: "separator"} : null,
    {type: "normal", label: "标记为忽略", click: ignoreIt},
    {type: "normal", label: "清除此记录", click: deleteIt},
].filter(i => i !== null)

const popupMenu = usePopupMenu([
    {type: "normal", label: "查看详情", click: () => emit("click")},
    {type: "separator"},
    ...actionMenuItems
])

</script>

<template>
    <Block :class="$style.item" @contextmenu="popupMenu.popup()">
        <Flex horizontal="stretch">
            <FlexItem :width="80" :shrink="0">
                <div :class="$style.examples" @click="$emit('click')">
                    <img v-for="image in item.images" :key="image.id" :class="$style.example" :src="assetsUrl(image.thumbnailFile)" alt="example img"/>
                </div>
            </FlexItem>
            <FlexItem :width="20" :shrink="0">
                <div :class="$style.info">
                    <p class="is-font-size-large">{{summaryText}}</p>
                    <ElementPopupMenu :items="actionMenuItems" position="bottom" align="left" v-slot="{ popup, setEl }">
                        <p :ref="setEl"><a @click.stop="popup">快速处理<Icon icon="caret-down"/></a></p>
                    </ElementPopupMenu>
                    <p class="secondary-text">{{datetime.toSimpleFormat(item.recordTime)}}</p>
                </div>
            </FlexItem>
        </Flex>
    </Block>
</template>

<style module lang="sass">
.item
    $height: 76px
    $padding: 8px
    $content-height: $height - $padding * 2
    height: $height
    margin-bottom: 4px
    padding: $padding

    .examples
        display: flex
        gap: 4px
        overflow-x: auto
        overflow-y: hidden
        > .example
            width: $content-height
            height: $content-height
            border-radius: 2px
            box-sizing: border-box
            object-fit: cover
            object-position: center
    .info
        display: flex
        flex-direction: column
        justify-content: space-between
        align-items: flex-end
</style>
