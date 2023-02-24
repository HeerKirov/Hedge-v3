<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { AnnotationTarget } from "@/functions/http-client/api/annotations"
import { MetaType } from "@/functions/http-client/api/all"
import { ANNOTATION_TARGET_TYPE_NAMES, ANNOTATION_TARGET_TYPE_ICONS } from "@/constants/entity"
import { arrays } from "@/utils/primitives"

const props = defineProps<{
    value?: AnnotationTarget[]
    metaType: MetaType
}>()

const emit = defineEmits<{
    (e: "update:value", v: AnnotationTarget[]): void
}>()

const TOPIC_TARGETS: AnnotationTarget[] = ["COPYRIGHT", "IP", "CHARACTER"]
const AUTHOR_TARGETS: AnnotationTarget[] = ["ARTIST", "STUDIO", "PUBLISH"]
const TAG_TARGETS: AnnotationTarget[] = ["TAG"]

const TARGETS: Record<MetaType, AnnotationTarget[]> = {
    "TOPIC": TOPIC_TARGETS,
    "AUTHOR": AUTHOR_TARGETS,
    "TAG": TAG_TARGETS
}

const check = computed(() => arrays.toMap(TARGETS[props.metaType], target => (props.value ?? []).indexOf(target) >= 0))

const updateValue = (v: AnnotationTarget) => {
    if((props.value ?? []).indexOf(v) >= 0) {
        emit("update:value", (props.value ?? []).filter(i => i !== v))
    }else{
        emit("update:value", [...(props.value ?? []), v])
    }
}

</script>

<template>
    <div>
        <label class="label">可选类型</label>
        <p v-for="target in TARGETS[metaType]" :key="target">
            <CheckBox :value="check[target]" @update:value="updateValue(target)">
                <Icon :icon="ANNOTATION_TARGET_TYPE_ICONS[target]"/>
                {{ANNOTATION_TARGET_TYPE_NAMES[target]}}
            </CheckBox>
        </p>
    </div>
</template>

<style module lang="sass">

</style>
