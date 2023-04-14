<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { ElementPopupMenu } from "@/components/interaction"
import { FindSimilarResult } from "@/functions/http-client/api/find-similar"
import { useAssets } from "@/functions/app"
import { MenuItem } from "@/modules/popup-menu"
import { datetime } from "@/utils/datetime"

const props = defineProps<{
    item: FindSimilarResult
}>()

const emit = defineEmits<{
    (e: "click"): void
}>()

const { assetsUrl } = useAssets()

const summary = computed(() => props.item.type.map(t => ({
    "SAME": "相同",
    "SIMILAR": "相似",
    "RELATED": "关系接近"
}[t])).join("、"))

const actionMenuItems = <MenuItem<undefined>[]>[]

</script>

<template>
    <Block :class="$style.item">
        <Flex horizontal="stretch">
            <FlexItem :width="80" :shrink="0">
                <div :class="$style.examples" @click="$emit('click')">
                    <img v-for="image in item.images" :key="image.id" :class="$style.example" :src="assetsUrl(image.thumbnailFile)" alt="example img"/>
                </div>
            </FlexItem>
            <FlexItem :width="20" :shrink="0">
                <div :class="$style.info">
                    <p class="is-font-size-large">{{summary}}</p>
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
