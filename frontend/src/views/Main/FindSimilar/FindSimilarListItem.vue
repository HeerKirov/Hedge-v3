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

const summaryText = props.item.summaryType.map(t => ({"EQUIVALENCE": "相同", "SIMILAR": "内容相似", "RELATED": "关系接近"}[t])).join("、")

const { ignoreIt, deleteIt } = useFindSimilarItemContext(props.item)

const actionMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "全部标记为忽略", click: ignoreIt},
    {type: "separator"},
    {type: "normal", label: "不采取任何操作并清除记录", click: deleteIt},
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
                    <img v-for="image in item.images" :key="image.id" :class="$style.example" :src="assetsUrl(image.filePath?.sample)" alt="example img"/>
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
    $height: 86px
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
        &::-webkit-scrollbar
            display: none
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
