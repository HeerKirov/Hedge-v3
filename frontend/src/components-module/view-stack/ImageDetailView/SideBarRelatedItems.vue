<script setup lang="ts">
import { Icon, ThumbnailImage, GridImages, Block } from "@/components/universal"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { useSideBarRelatedItems } from "@/services/view-stack/image"
import { usePopupMenu } from "@/modules/popup-menu"

const { data, openRelatedCollection, openRelatedBook, openAssociate, openFolderInNewWindow } = useSideBarRelatedItems()

const folderPopupMenu = usePopupMenu<SimpleFolder>([
    {type: "normal", label: "在新窗口打开此文件夹", click: openFolderInNewWindow}
])

</script>

<template>
    <template v-if="data?.books?.length">
        <b class="mb-1">所属画集</b>
        <Block v-for="book in data.books" :key="book.id" class="mb-1" @click="openRelatedBook(book)">
            《{{book.title}}》
        </Block>
    </template>
    <template v-if="data?.collection">
        <b class="mr-2">所属集合</b><Icon icon="id-card"/><b class="ml-1 selectable is-font-size-large">{{data.collection.id}}</b>
        <ThumbnailImage class="mt-1" :file="data.collection.thumbnailFile" :num-tag-value="data.collection.childrenCount" @click="openRelatedCollection"/>
    </template>
    <template v-if="data?.associates?.length">
        <b class="mb-1">关联组</b>
        <GridImages :images="data.associates.map(i => i.thumbnailFile)" :column-num="3"/>
        <p class="float-right"><a @click="openAssociate">查看关联组的全部项目<Icon class="ml-1" icon="angle-double-right"/></a></p>
    </template>
    <template v-if="data?.folders?.length">
        <b class="mb-1">已加入的目录</b>
        <p v-for="folder in data.folders" :key="folder.id" @contextmenu="folderPopupMenu.popup(folder)">
            <Icon icon="folder"/>
            {{folder.address.join("/")}}
        </p>
    </template>
    <div v-if="data && !(data.books.length || data.collection || data.associates.length || data.folders.length)" class="has-text-centered">
        <i class="has-text-secondary">没有相关的项目</i>
    </div>
</template>
