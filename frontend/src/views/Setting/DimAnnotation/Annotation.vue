<script setup lang="ts">
import { Block } from "@/components/universal"
import { VirtualRowView } from "@/components/data"
import { Flex, FlexItem } from "@/components/layout"
import { SelectButton } from "@/components-business/top-bar"
import { META_TYPE_ICONS, META_TYPE_NAMES, META_TYPES } from "@/constants/entity"
import { usePopupMenu } from "@/modules/popup-menu"
import { installAnnotationContext } from "@/services/main/annotation"
import AnnotationListItem from "./AnnotationListItem.vue"
import AnnotationDetailPane from "./AnnotationDetailPane.vue"
import AnnotationCreatePane from "./AnnotationCreatePane.vue"

const { paneState, listview: { queryFilter, paginationData: { data, state, setState } }, operators } = installAnnotationContext()

const filterMetaTypeOptions = META_TYPES.map(type => ({value: type, label: META_TYPE_NAMES[type], icon: META_TYPE_ICONS[type]}))

const popupMenu = usePopupMenu([
    {type: "normal", label: "查看详情", click: paneState.openDetailView},
    {type: "separator"},
    {type: "normal", label: "以此为模板新建", click: operators.createByTemplate},
    {type: "separator"},
    {type: "normal", label: "删除此注解", click: operators.deleteItem},
])

</script>

<template>
    <div class="flex">
        <label class="label mt-2 mb-1 flex-item w-100">注解</label>
        <SelectButton :items="filterMetaTypeOptions" v-model:value="queryFilter.type"/>
    </div>
    <Flex :class="$style['site-list']" horizontal="stretch" :spacing="1">
        <FlexItem :width="60">
            <VirtualRowView :row-height="40" :padding="4" :metrics="data.metrics" :state="state" @update:state="setState">
                <AnnotationListItem v-for="item in data.items" :key="item.id"
                                    :item="item" :selected="paneState.detailPath.value === item.id"
                                    @click="paneState.openDetailView(item.id)"
                                    @contextmenu="popupMenu.popup(item.id)"/>
            </VirtualRowView>
        </FlexItem>
        <FlexItem :width="40">
            <Block class="p-4 my-1">
                <AnnotationDetailPane v-if="paneState.mode.value === 'detail'"/>
                <AnnotationCreatePane v-else-if="paneState.mode.value === 'create'"/>
            </Block>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.site-list
    width: 100%
    min-height: 150px
</style>