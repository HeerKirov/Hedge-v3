<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/elements"
import { numbers } from "@/utils/primitives"

const props = defineProps<{
    value?: number
    showText?: boolean
}>()

const stdValue = computed(() => numbers.roundNDecimal(props.value ?? 0, 1))
const cnt = computed(() => Math.floor(stdValue.value))
const hasHalf = computed(() => stdValue.value > cnt.value)

</script>

<template>
    <div>
        <b v-if="showText" :class="$style.text">{{stdValue}}</b>
        <Icon v-for="_ in cnt" icon="star"/>
        <Icon v-if="hasHalf" icon="star-half-stroke"/>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"

.text
    margin-right: $spacing-1
</style>
