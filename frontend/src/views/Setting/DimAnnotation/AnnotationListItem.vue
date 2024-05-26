<script setup lang="ts">
import { Block, Tag, Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { Annotation } from "@/functions/http-client/api/annotations"
import { ANNOTATION_TARGET_TYPE_ICONS, ANNOTATION_TARGET_TYPE_NAMES } from "@/constants/entity"

defineProps<{
    item: Annotation
    selected?: boolean
}>()

</script>

<template>
    <Block :class="$style.item" :color="selected ? 'primary' : undefined">
        <Flex>
            <FlexItem :width="50">
                <div>
                    <Tag brackets="[]">{{item.name}}</Tag>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <div>
                    <Icon v-if="item.canBeExported" icon="share-square"/>
                </div>
            </FlexItem>
            <FlexItem :width="45">
                <div class="has-text-right">
                    <template v-for="t in item.target">
                        <Icon class="ml-1" :icon="ANNOTATION_TARGET_TYPE_ICONS[t]"/>
                        <span>{{ANNOTATION_TARGET_TYPE_NAMES[t]}}</span>
                    </template>
                </div>
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
