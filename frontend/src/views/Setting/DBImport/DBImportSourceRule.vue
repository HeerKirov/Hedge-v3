<script setup lang="ts">
import { computed, ref } from "vue"
import { SelectList } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SourceAnalyseRule } from "@/functions/http-client/api/setting-import"
import { installSettingSite } from "@/services/api/setting"
import DBImportSourceRuleCreator from "./DBImportSourceRuleCreator.vue"
import DBImportSourceRuleEditor from "./DBImportSourceRuleEditor.vue"

const props = defineProps<{
    rules: SourceAnalyseRule[]
}>()

const emit = defineEmits<{
    (e: "update:rules", rules: SourceAnalyseRule[]): void
}>()

installSettingSite()

const selectItems = computed(() => props.rules.map((r, i) => ({label: r.regex, value: `${i}`})).concat({label: "新建规则…", value: "<new>"}))

const selectedItem = ref<string>()
const selectedIndex = computed(() => selectedItem.value && selectedItem.value !== "<new>" ? parseInt(selectedItem.value) : null)
const selectedRule = computed(() => selectedIndex.value !== null ? props.rules[selectedIndex.value] ?? null : null)

const create = (rule: SourceAnalyseRule) => {
    emit("update:rules", [...props.rules, rule])
}

const update = (rule: SourceAnalyseRule) => {
    if(selectedIndex.value !== null) {
        emit("update:rules", [...props.rules.slice(0, selectedIndex.value), rule, ...props.rules.slice(selectedIndex.value + 1)])
    }
}

const trash = () => {
    if(selectedIndex.value !== null) {
        emit("update:rules", [...props.rules.slice(0, selectedIndex.value), ...props.rules.slice(selectedIndex.value + 1)])
    }
}
</script>

<template>
    <Flex :class="$style['rule-list']" horizontal="stretch" :spacing="1">
        <FlexItem :width="40">
            <SelectList :items="selectItems" v-model:value="selectedItem"/>
        </FlexItem>
        <FlexItem :width="60">
            <DBImportSourceRuleEditor v-if="selectedRule != null" :rule="selectedRule" @update="update" @delete="trash"/>
            <DBImportSourceRuleCreator v-else-if="selectedItem === '<new>'" @create="create"/>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.rule-list
    min-height: 150px
    max-height: 500px
</style>