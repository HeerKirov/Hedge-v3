<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { VirtualGridView } from "@/components/data"
import { TopBarLayout, MiddleLayout } from "@/components/layout"
import { DataRouter, ColumnNumButton, SearchInput, QueryNotificationBadge, QueryResult } from "@/components-business/top-bar"
import { Book } from "@/functions/http-client/api/book"
import { useDialogService } from "@/components-module/dialog"
import { useDynamicPopupMenu } from "@/modules/popup-menu"
import { installBookContext } from "@/services/main/book"
import BookGridItem from "./BookGridItem.vue"

const {
    listview: { paginationData },
    listviewController: { columnNum },
    querySchema,
    operators
} = installBookContext()

const { creatingBook } = useDialogService()

const bookGridStyle = computed(() => ({"--column-num": columnNum.value}))

const menu = useDynamicPopupMenu<Book>(book => [
    {type: "normal", label: "查看详情", click: operators.openBookView},
    {type: "separator"},
    {type: "normal", label: "在新窗口中打开", click: operators.openInNewWindow},
    {type: "separator"},
    book.favorite
        ? {type: "normal", label: "取消标记为收藏", click: book => operators.switchFavorite(book, false)}
        : {type: "normal", label: "标记为收藏", click: book => operators.switchFavorite(book, true)},
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
                    <Button square icon="plus" @click="creatingBook.createBook()"/>
                </template>
            </MiddleLayout>
        </template>

        <template #expand>
            <QueryResult :schema="querySchema.schema.value"/>
        </template>

        <VirtualGridView :style="bookGridStyle" :column-count="columnNum" :padding="{top: 1, bottom: 4, left: 4, right: 4}"
                         :min-update-delta="1" :buffer-size="5" :aspect-ratio="0.6"
                         @update="paginationData.dataUpdate" v-bind="paginationData.data.metrics">
            <BookGridItem v-for="item in paginationData.data.result" :key="item.id" :item="item"
                          @click="operators.openBookView(item)"
                          @contextmenu="menu.popup(item)"/>
        </VirtualGridView>

    </TopBarLayout>
</template>
