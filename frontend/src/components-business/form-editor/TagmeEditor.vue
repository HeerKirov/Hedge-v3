<script setup lang="ts">
import { Block, Icon, Tag } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { Tagme } from "@/functions/http-client/api/illust"
import { TAGME_TYPES, TAGME_TYPE_ICONS, TAGME_TYPE_NAMES } from "@/constants/entity"

const props = defineProps<{
    value: Tagme[]
    direction?: "horizontal" | "vertical"
}>()

const emit = defineEmits<{
    (e: "update:value", value: Tagme[]): void
}>()

const updateValue = (tagme: Tagme, v: boolean) => {
    if(v) {
        emit("update:value", [...(props.value ?? []), tagme])
    }else{
        const i = props.value.indexOf(tagme)
        emit("update:value", [...props.value.slice(0, i), ...props.value.slice(i + 1)])
    }
}

</script>

<template>
    <Block v-if="direction === 'horizontal'" :class="$style.horizontal">
        <Icon icon="flag"/><b class="mr-1">TAGME</b>
        <span v-for="tagme in TAGME_TYPES" :key="tagme" class="ml-2">
            <CheckBox :value="value.includes(tagme)" @update:value="updateValue(tagme, $event)">
                <Icon :icon="TAGME_TYPE_ICONS[tagme]"/>
                {{TAGME_TYPE_NAMES[tagme]}}
            </CheckBox>
        </span>
    </Block>
    <Block v-else class="p-1">
        <Tag class="mb-2 is-inline-block" icon="flag"><b>TAGME</b></Tag>
        <p v-for="tagme in TAGME_TYPES" :key="tagme">
            <CheckBox :value="value.includes(tagme)" @update:value="updateValue(tagme, $event)">
                <Icon :icon="TAGME_TYPE_ICONS[tagme]"/>
                {{TAGME_TYPE_NAMES[tagme]}}
            </CheckBox>
        </p>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.horizontal
    line-height: size.$element-height-std
    padding: 0 0.25rem
</style>
