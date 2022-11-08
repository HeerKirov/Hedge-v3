<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { TagGroupType } from "@/functions/http-client/api/tag"

const props = defineProps<{
    value: TagGroupType
}>()

const emit = defineEmits<{
    (e: "update:value", value: TagGroupType): void
}>()

const data = computed(() => ({
    group: props.value !== "NO",
    sequence: props.value === "SEQUENCE" || props.value === "FORCE_AND_SEQUENCE",
    force: props.value === "FORCE" || props.value === "FORCE_AND_SEQUENCE"
}))

const setGroup = (v: boolean) => emit("update:value", v ? "YES" : "NO")

const setSequence = (v: boolean) => emit("update:value", v ? (data.value.force ? "FORCE_AND_SEQUENCE" : "SEQUENCE") : (data.value.force ? "FORCE" : "YES"))

const setForce = (v: boolean) => emit("update:value", v ? (data.value.sequence ? "FORCE_AND_SEQUENCE" : "FORCE") : (data.value.sequence ? "SEQUENCE" : "YES"))

</script>

<template>
    <p>
        <CheckBox :value="data.group" @update:value="setGroup">
            <Icon class="mr-1" icon="object-group"/>组
        </CheckBox>
    </p>
    <p>
        <CheckBox :value="data.sequence" @update:value="setSequence">
            <Icon class="mr-1" icon="sort-alpha-down"/>排序组
        </CheckBox>
    </p>
    <p>
        <CheckBox :value="data.force" @update:value="setForce">
            <b class="mr-1">!</b>强制唯一组
        </CheckBox>
    </p>
</template>
