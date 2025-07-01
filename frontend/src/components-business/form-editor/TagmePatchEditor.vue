<script setup lang="ts">
import { computed } from "vue"
import { Block, Button, Icon, Tag } from "@/components/universal"
import { Tagme } from "@/functions/http-client/api/illust"
import { PatchUnit } from "@/functions/http-client/api/all"
import { TAGME_TYPES, TAGME_TYPE_ICONS, TAGME_TYPE_NAMES } from "@/constants/entity"

const props = defineProps<{
    value: PatchUnit<Tagme[]>[]
    direction?: "horizontal" | "vertical"
}>()

const emit = defineEmits<{
    (e: "update:value", value: PatchUnit<Tagme[]>[]): void
}>()

const value = computed(() => TAGME_TYPES.map(tagme => props.value.find(u => u.value[0] === tagme) ?? {value: [tagme], plusOrMinus: undefined}))

const updateValue = (tagme: Tagme, v: boolean | undefined) => {
    const newValue = value.value.map(u => ({value: u.value, plusOrMinus: u.value[0] === tagme ? v : u.plusOrMinus})).filter(v => v.plusOrMinus !== undefined)
    emit("update:value", newValue as PatchUnit<Tagme[]>[])
}

</script>

<template>
    <Block v-if="direction === 'horizontal'" :class="$style.horizontal">
        <Icon icon="flag"/><b class="mr-1">TAGME</b>
        <span v-for="tagme in value" :key="tagme.value[0]" class="ml-2">
            <Button size="tiny" square :mode="tagme.plusOrMinus !== undefined && !tagme.plusOrMinus ? 'filled' : undefined" :type="tagme.plusOrMinus !== undefined && !tagme.plusOrMinus ? 'danger' : undefined" @click="updateValue(tagme.value[0], false)"><Icon icon="minus"/></Button>
            <Button size="tiny" @click="updateValue(tagme.value[0], undefined)">
                <Icon :icon="TAGME_TYPE_ICONS[tagme.value[0]]"/>
                {{TAGME_TYPE_NAMES[tagme.value[0]]}}
            </Button>
            <Button size="tiny" square :mode="tagme.plusOrMinus !== undefined && tagme.plusOrMinus ? 'filled' : undefined" :type="tagme.plusOrMinus !== undefined && tagme.plusOrMinus ? 'danger' : undefined" @click="updateValue(tagme.value[0], true)"><Icon icon="plus"/></Button>
        </span>
    </Block>
    <Block v-else class="p-1">
        <Tag class="mb-2 is-inline-block" icon="flag"><b>TAGME</b></Tag>
        <div v-for="tagme in value" :key="tagme.value[0]" class="mt-half">
            <Button class="mr-1" size="tiny" square :mode="tagme.plusOrMinus !== undefined && !tagme.plusOrMinus ? 'filled' : undefined" :type="tagme.plusOrMinus !== undefined && !tagme.plusOrMinus ? 'danger' : undefined" @click="updateValue(tagme.value[0], false)"><Icon icon="minus"/></Button>
            <Button size="tiny" @click="updateValue(tagme.value[0], undefined)">
                <Icon :icon="TAGME_TYPE_ICONS[tagme.value[0]]"/>
                {{TAGME_TYPE_NAMES[tagme.value[0]]}}
            </Button>
            <Button class="ml-1" size="tiny" square :mode="tagme.plusOrMinus !== undefined && tagme.plusOrMinus ? 'filled' : undefined" :type="tagme.plusOrMinus !== undefined && tagme.plusOrMinus ? 'danger' : undefined" @click="updateValue(tagme.value[0], true)"><Icon icon="plus"/></Button>
        </div>
    </Block>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.horizontal
    line-height: size.$element-height-std
    padding: 0 0.25rem
</style>
