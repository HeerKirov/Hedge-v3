<script setup lang="ts">
import { computed } from "vue"
import { SelectList } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { SiteCreateForm, SiteUpdateForm } from "@/functions/http-client/api/setting"
import { useSettingSite } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import DBSourceSiteEditor from "./DBSourceSiteEditor.vue"
import DBSourceSiteCreator from "./DBSourceSiteCreator.vue"

const { data: sites, createItem, updateItem, deleteItem } = useSettingSite()

const selectItems = computed(() => sites.value?.map(site => ({label: site.title, value: site.name})).concat([{label: "新建站点…", value: "<new>"}]))

const selectedItem = computedMutable<string | undefined>(o => {
    if((o !== undefined && sites.value?.find(i => i.name === o) !== undefined) || (o === "<new>")) {
        return o
    }
    return undefined
})
const selectedIndex = computed(() => selectedItem.value && sites.value && selectedItem.value !== "<new>" ? sites.value.findIndex(i => i.name === selectedItem.value) : null)
const selectedSite = computed(() => selectedIndex.value !== null ? sites.value![selectedIndex.value] ?? null : null)

const create = async (form: SiteCreateForm) => {
    await createItem(form)
}

const update = async (form: SiteUpdateForm) => {
    if(selectedItem.value) {
        await updateItem(selectedItem.value, form)
    }
}

const trash = async () => {
    if(selectedItem.value && await deleteItem(selectedItem.value)) {
        selectedItem.value = undefined
    }
}

</script>

<template>
    <label class="label mt-2 mb-1">来源站点</label>
    <Flex :class="$style['site-list']" horizontal="stretch" :spacing="1">
        <FlexItem :width="35">
            <SelectList :items="selectItems" v-model:value="selectedItem"/>
        </FlexItem>
        <FlexItem :width="65">
            <DBSourceSiteEditor v-if="selectedSite !== null" 
                                :name="selectedSite.name" 
                                :title="selectedSite.title" 
                                :has-secondary-id="selectedSite.hasSecondaryId" 
                                :source-link-generate-rules="selectedSite.sourceLinkGenerateRules"
                                :available-additional-info="selectedSite.availableAdditionalInfo"
                                :ordinal="selectedIndex!" 
                                @update="update" @delete="trash"/>
            <DBSourceSiteCreator v-else-if="selectedItem === '<new>'" @create="create"/>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.site-list
    width: 100%
    min-height: 150px
    max-height: 450px
</style>
