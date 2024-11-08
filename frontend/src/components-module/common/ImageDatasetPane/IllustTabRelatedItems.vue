<script setup lang="ts">
import { toRef } from "vue"
import { Icon, ThumbnailImage, GridImages, Block, Separator } from "@/components/universal"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { useSideBarRelatedItems } from "@/services/main/illust"
import { usePopupMenu } from "@/modules/popup-menu"
import { useAssets } from "@/functions/app"

const props = defineProps<{detailId: number, type: "IMAGE" | "COLLECTION"}>()

const detailId = toRef(props, "detailId")
const illustType = toRef(props, "type")

const { data, openRelatedCollection, openRelatedBook, openAssociate, openAssociateInNewView, openFolderInNewTab, openFolderInNewWindow } = useSideBarRelatedItems(detailId, illustType)

const { assetsUrl } = useAssets()

const folderPopupMenu = usePopupMenu<SimpleFolder>([
    {type: "normal", label: "在新标签页打开此文件夹", click: openFolderInNewTab},
    {type: "normal", label: "在新窗口打开此文件夹", click: openFolderInNewWindow}
])

</script>

<template>
    <p class="mt-1 mb-1">
        <Icon icon="id-card"/><b class="ml-1 selectable">{{detailId}}</b>
    </p>
    <Separator direction="horizontal"/>
    <template v-if="data?.books?.length">
        <b class="mb-1">所属画集</b>
        <Block v-for="book in data.books" :key="book.id" :class="$style['book-item']" @click="openRelatedBook(book)">
            <div :class="$style.info">{{book.title}}</div>
            <img v-if="book.filePath !== null" :src="assetsUrl(book.filePath.thumbnail)" :alt="book.title"/>
        </Block>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.collection">
        <b class="mr-2">所属集合</b><Icon icon="id-card"/><b class="ml-1 selectable is-font-size-large">{{data.collection.id}}</b>
        <ThumbnailImage class="is-cursor-pointer" max-height="12rem" :file="data.collection.filePath.sample" :num-tag-value="data.collection.childrenCount" @click="openRelatedCollection"/>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.associates?.length">
        <div class="mb-1">
            <b>关联组</b>
            <a class="float-right" @click="openAssociate"><Icon class="ml-1" icon="eye"/>查看全部项目</a>
        </div>
        <GridImages :images="data.associates.map(i => i.filePath.sample)" :column-num="3" clickable @click="(_, i) => openAssociateInNewView(i)"/>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.folders?.length">
        <b class="mb-1">已加入的目录</b>
        <p v-for="folder in data.folders" :key="folder.id" @contextmenu="folderPopupMenu.popup(folder)">
            <Icon icon="folder"/>
            {{folder.address.join("/")}}
        </p>
        <div class="mb-2"/>
    </template>
    <div v-if="data && !(data.books.length || data.collection || data.associates.length || data.folders.length)" class="has-text-centered">
        <i class="has-text-secondary">没有相关的项目</i>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.book-item
    position: relative
    margin-bottom: size.$spacing-1
    cursor: pointer
    aspect-ratio: 3
    overflow: hidden

    > .info
        position: absolute
        bottom: 0
        left: 0
        right: 0
        max-height: 100%
        padding: size.$spacing-1 size.$spacing-2
        overflow-y: auto
        white-space: nowrap
        box-sizing: border-box
        background: linear-gradient(to top, rgba(0, 0, 0, 50%), rgba(0, 0, 0, 0%))
        color: color.$light-mode-text-inverted-color
        font-weight: 700
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 50%)
        &::-webkit-scrollbar
            display: none

    > img
        width: 100%
        height: 100%
        object-fit: cover
</style>