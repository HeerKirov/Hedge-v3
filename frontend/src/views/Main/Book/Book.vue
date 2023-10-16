<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { VirtualGridView } from "@/components/data"
import { TopBarLayout, MiddleLayout, PaneLayout } from "@/components/layout"
import { DataRouter, ColumnNumButton, SearchInput, QueryNotificationBadge, QueryResult } from "@/components-business/top-bar"
import { BookDetailPane } from "@/components-module/common"
import { Book } from "@/functions/http-client/api/book"
import { useDialogService } from "@/components-module/dialog"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installBookContext } from "@/services/main/book"
import BookGridItem from "./BookGridItem.vue"

const {
    listview: { paginationData },
    listviewController: { columnNum },
    querySchema,
    operators,
    selector,
    paneState
} = installBookContext()

const { creatingBook } = useDialogService()

const bookGridStyle = computed(() => ({"--column-num": columnNum.value}))

const ellipsisMenuItems = computed(() => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "normal", label: "新建画集", click: creatingBook.createBook}
])

const menu = useDynamicPopupMenu<Book>(book => [
    {type: "normal", label: "打开", click: operators.openBookView},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    {type: "checkbox", checked: paneState.visible.value, label: "在侧边栏预览", click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "checkbox", label: "标记为收藏", checked: book.favorite, click: i => operators.switchFavorite(i, !i.favorite)},
    {type: "separator"},
    {type: "normal", label: "导出", click: operators.exportItem},
    {type: "separator"},
    {type: "normal", label: "删除画集", click: operators.deleteItem}
])

</script>

<template>
    <TopBarLayout v-model:expanded="querySchema.expanded.value">
        <template #top-bar>
            <MiddleLayout>
                <SearchInput placeholder="在此处搜索" v-model:value="querySchema.queryInputText.value" :enable-drop-button="!!querySchema.query.value" v-model:active-drop-button="querySchema.expanded.value"/>
                <QueryNotificationBadge class="ml-1" :schema="querySchema.schema.value" @click="querySchema.expanded.value = true"/>

                <template #right>
                    <DataRouter/>
                    <ColumnNumButton class="mr-1" v-model:value="columnNum"/>
                    <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <PaneLayout :show-pane="paneState.visible.value">
            <VirtualGridView :style="bookGridStyle" :column-count="columnNum" :padding="{top: 1, bottom: 4, left: 4, right: 4}"
                             :min-update-delta="1" :buffer-size="5" :aspect-ratio="0.6"
                             @update="paginationData.dataUpdate" v-bind="paginationData.data.metrics">
                <BookGridItem v-for="item in paginationData.data.result" :key="item.id" :item="item" 
                              :selected="selector.selected.value === item.id"
                              @click="selector.set($event.id)" 
                              @dblclick="operators.openBookView($event)"
                              @contextmenu="menu.popup(item)"/>
            </VirtualGridView>
            
            <template #pane>
                <BookDetailPane @close="paneState.visible.value = false"/>
            </template>
        </PaneLayout>

    </TopBarLayout>
</template>
