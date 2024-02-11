<script setup lang="ts">
import { computed } from "vue"
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { VirtualGridView } from "@/components/data"
import { PaneLayout } from "@/components/layout"
import { BrowserTeleport } from "@/components/logical"
import { DataRouter, ColumnNumButton, SearchBox } from "@/components-business/top-bar"
import { BookDetailPane } from "@/components-module/common"
import { Book } from "@/functions/http-client/api/book"
import { useDialogService } from "@/components-module/dialog"
import { MenuItem, useDynamicPopupMenu } from "@/modules/popup-menu"
import { installBookContext } from "@/services/main/book"
import BookGridItem from "./BookGridItem.vue"

const {
    listview: { paginationData: { data, state, setState, navigateTo } },
    listviewController: { columnNum },
    querySchema,
    operators,
    selector,
    paneState
} = installBookContext()

const { creatingBook } = useDialogService()

const bookGridStyle = computed(() => ({"--column-num": columnNum.value}))

const ellipsisMenuItems = () => <MenuItem<undefined>[]>[
    {type: "checkbox", label: "在侧边栏预览", checked: paneState.visible.value, click: () => paneState.visible.value = !paneState.visible.value},
    {type: "separator"},
    {type: "normal", label: "新建画集", click: creatingBook.createBook}
]

const menu = useDynamicPopupMenu<Book>(book => [
    {type: "normal", label: "打开", click: operators.openBookView},
    {type: "normal", label: "在新标签页中打开", click: operators.openInNewTab},
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
    <BrowserTeleport to="top-bar">
        <SearchBox placeholder="在此处搜索" dialect="BOOK" v-model:value="querySchema.queryInputText.value" :schema="querySchema.schema.value"/>
        <Separator/>
        <DataRouter :state="state" @navigate="navigateTo"/>
        <ColumnNumButton v-model:value="columnNum"/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ popup, setEl }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <PaneLayout :show-pane="paneState.visible.value">
        <VirtualGridView :style="bookGridStyle" :column-count="columnNum" :padding="{top: 1, bottom: 4, left: 4, right: 4}" :aspect-ratio="0.6"
                         @update:state="setState" :metrics="data.metrics" :state="state">
            <BookGridItem v-for="item in data.items" :key="item.id" :item="item"
                          :selected="selector.selected.value === item.id"
                          @click="selector.set($event.id)"
                          @dblclick="operators.openBookView($event)"
                          @contextmenu="menu.popup(item)"/>
        </VirtualGridView>

        <template #pane>
            <BookDetailPane @close="paneState.visible.value = false"/>
        </template>
    </PaneLayout>
</template>
