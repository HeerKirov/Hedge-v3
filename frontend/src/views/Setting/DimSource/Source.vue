<script setup lang="ts">
import { computed } from "vue"
import { Icon, Button } from "@/components/universal"
import { useSettingSite } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import Editor from "./Editor.vue"
import Creator from "./Creator.vue"

const { data: sites } = useSettingSite()

const selectItems = computed(() => sites.value?.map(site => ({label: site.title, value: site.name})))

const selectedItem = computedMutable<string | undefined>(o => {
    if((o !== undefined && sites.value?.find(i => i.name === o) !== undefined) || (o === "<new>")) {
        return o
    }
    return undefined
})
const selectedIndex = computed(() => selectedItem.value && sites.value && selectedItem.value !== "<new>" ? sites.value.findIndex(i => i.name === selectedItem.value) : null)

const created = async (name: string) => {
    selectedItem.value = name
}

</script>

<template>
    <div class="flex align-stretch gap-2">
        <div :class="[$style['left-column'], 'flex-item', 'w-35']">
            <div class="flex jc-between align-baseline">
                <label class="label mt-2 mb-1">来源站点</label>
                <a :class="{'is-font-size-small': true, 'has-text-secondary': selectedItem === '<new>'}" @click="selectedItem = '<new>'"><Icon icon="plus"/>添加站点</a>
            </div>
            <div class="flex column no-wrap align-stretch">
                <Button v-for="item in selectItems" :key="item.value"
                        :mode="selectedItem === item.value ? 'filled' : undefined"
                        :type="selectedItem === item.value ? 'primary' : undefined"
                        @click="selectedItem = item.value">
                    {{item.label}}
                </Button>
            </div>
        </div>
        <div class="flex-item w-65 relative">
            <Editor v-if="selectedItem !== undefined && selectedItem !== '<new>'" :name="selectedItem" :ordinal="selectedIndex!" @close="selectedItem = undefined"/>
            <Creator v-else-if="selectedItem === '<new>'" @created="created"/>
            <i v-else class="absolute center has-text-secondary">选择一项以查看详情</i>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.left-column
    border-right: solid 1px $light-mode-border-color
    padding-right: $spacing-2
    @media (prefers-color-scheme: dark)
        border-right-color: $dark-mode-border-color
</style>
