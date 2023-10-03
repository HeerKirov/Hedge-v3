<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { AnnotationTarget } from "@/functions/http-client/api/annotations"
import { MetaType } from "@/functions/http-client/api/all"
import { ANNOTATION_TARGET_TYPE_NAMES, ANNOTATION_TARGET_TYPE_ICONS } from "@/constants/entity"
import { arrays } from "@/utils/primitives"

const props = defineProps<{
    value: AnnotationTarget[]
    metaType: MetaType
}>()

const TOPIC_TARGETS: AnnotationTarget[] = ["COPYRIGHT", "IP", "CHARACTER"]
const AUTHOR_TARGETS: AnnotationTarget[] = ["ARTIST", "GROUP", "SERIES"]
const TAG_TARGETS: AnnotationTarget[] = ["TAG"]

const TARGETS: Record<MetaType, AnnotationTarget[]> = {
    "TOPIC": TOPIC_TARGETS,
    "AUTHOR": AUTHOR_TARGETS,
    "TAG": TAG_TARGETS
}

const check = computed(() => arrays.toMap(TARGETS[props.metaType], target => props.value.indexOf(target) >= 0))

</script>

<template>
    <div>
        <p v-for="target in TARGETS[metaType]">
            <Icon icon="check" :class="{'has-text-tertiary': !check[target]}"/>
            <Icon :icon="ANNOTATION_TARGET_TYPE_ICONS[target]"/>
            {{ANNOTATION_TARGET_TYPE_NAMES[target]}}
        </p>
    </div>
</template>
