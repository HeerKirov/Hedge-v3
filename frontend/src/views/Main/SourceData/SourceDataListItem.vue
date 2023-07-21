<script setup lang="ts">
import { computed } from "vue"
import { Block } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { SourceData } from "@/functions/http-client/api/source-data"
import { datetime } from "@/utils/datetime"

const props = defineProps<{
    item: SourceData
    selected?: boolean
}>()

const description = computed(() => [
    props.item.tagCount > 0 ? `${props.item.tagCount}个标签` : null,
    props.item.bookCount > 0 ? `${props.item.bookCount}个集合` : null,
    props.item.relationCount > 0 ? `${props.item.relationCount}个关联项` : null
].filter(i => i !== null).join(", ") || "无标签/集合/关联项")

</script>

<template>
    <Block :class="$style.item" :color="selected ? 'primary' : undefined">
        <Flex>
            <FlexItem :width="40" :shrink="0">
                <div class="no-wrap overflow-hidden overflow-ellipsis">
                    <span class="secondary-text">{{item.sourceSite}}</span>
                    {{item.sourceSiteName}}
                    <b class="ml-2">{{item.sourceId}}</b>
                </div>
            </FlexItem>
            <FlexItem :width="50">
                <div class="secondary-text">{{description}}</div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div>{{datetime.toSimpleFormat(item.updateTime)}}</div>
            </FlexItem>
        </Flex>
    </Block>
</template>

<style module lang="sass">
.item
    height: 36px
    line-height: 28px
    padding: 4px 10px
    margin-bottom: 4px
</style>
