<script setup lang="ts">
import { toRef } from "vue"
import { Icon, ThumbnailImage, GridImages, Block, Separator } from "@/components/universal"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { SimpleBook } from "@/functions/http-client/api/book"
import { useSideBarRelatedItems } from "@/services/main/illust"
import { usePopupMenu } from "@/modules/popup-menu"
import { useAssets } from "@/functions/app"

const props = defineProps<{detailId: number, type: "IMAGE" | "COLLECTION"}>()

const emit = defineEmits<{
    (e: "backTab"): void
}>()

const detailId = toRef(props, "detailId")
const illustType = toRef(props, "type")

const { data, openCollection, openAssociate, openAssociateInViewStack, openBook, openFolder } = useSideBarRelatedItems(detailId, illustType, () => emit("backTab"))

const { assetsUrl } = useAssets()

const collectionPopupMenu = usePopupMenu<number>([
    {type: "normal", label: "在新标签页打开集合", click: i => openCollection(i, "newTab")},
    {type: "normal", label: "在新窗口打开集合", click: i => openCollection(i, "newWindow")}
])

const bookPopupMenu = usePopupMenu<SimpleBook>([
    {type: "normal", label: "在新标签页打开此画集", click: b => openBook(b, "newTab")},
    {type: "normal", label: "在新窗口打开此画集", click: b => openBook(b, "newWindow")}
])

const folderPopupMenu = usePopupMenu<SimpleFolder>([
    {type: "normal", label: "在新标签页打开此文件夹", click: f => openFolder(f, "newTab")},
    {type: "normal", label: "在新窗口打开此文件夹", click: f => openFolder(f, "newWindow")}
])

</script>

<template>
    <p class="mt-1 mb-1 is-cursor-pointer" @click="$emit('backTab')">
        <a class="mr-1"><Icon icon="angle-left"/></a>
        <Icon icon="id-card"/><b class="ml-1 selectable">{{detailId}}</b>
    </p>
    <Separator direction="horizontal"/>
    <template v-if="data?.collection">
        <div class="my-1"><b class="mr-2">所属集合</b><Icon icon="id-card"/><b class="ml-1 selectable is-font-size-large">{{data.collection.id}}</b></div>
        <ThumbnailImage class="is-cursor-pointer" max-height="12rem" :file="data.collection.filePath.sample" :num-tag-value="data.collection.childrenCount" @click="openCollection(data.collection.id)" @contextmenu="collectionPopupMenu.popup(data.collection.id)"/>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.children?.length">
        <div class="bold my-1">集合子项</div>
        <div :class="$style['children-items']" @click="openCollection(detailId)" @contextmenu="collectionPopupMenu.popup(detailId)">
            <Block v-for="item in data.children" :key="item.id">
                <img :src="assetsUrl(item.filePath.sample)" :alt="`child item ${item.id}`"/>
            </Block>
            <div v-if="data.children.length < data.childrenCount" class="secondary-text has-text-centered">等{{data.childrenCount}}项</div>
        </div>
    </template>
    <template v-if="data?.books?.length">
        <div class="bold my-1">所属画集</div>
        <Block v-for="book in data.books" :key="book.id" :class="$style['book-item']" @click="openBook(book)" @contextmenu="bookPopupMenu.popup(book)">
            <div :class="$style.info">{{book.title}}</div>
            <img v-if="book.filePath !== null" :src="assetsUrl(book.filePath.thumbnail)" :alt="book.title"/>
        </Block>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.associates?.length">
        <div class="my-1">
            <b>关联组</b>
            <a class="float-right" @click="openAssociate"><Icon class="ml-1" icon="eye"/>查看全部项目</a>
        </div>
        <GridImages :images="data.associates.map(i => i.filePath.sample)" :column-num="3" clickable @click="(_, i) => openAssociateInViewStack(data!.associates, i)"/>
        <div class="mb-2"/>
    </template>
    <template v-if="data?.folders?.length">
        <div class="bold my-1">已加入的目录</div>
        <p v-for="folder in data.folders" :key="folder.id" class="is-cursor-pointer" @click="openFolder(folder)" @contextmenu="folderPopupMenu.popup(folder)">
            <Icon icon="folder"/>
            {{folder.address.join("/")}}
        </p>
        <div class="mb-2"/>
    </template>
    <div v-if="data && !(data.books.length || data.collection || data.associates.length || data.folders.length || data.children.length)" class="has-text-centered">
        <i class="has-text-secondary">没有相关的项目</i>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.children-items
    display: flex
    width: 100%
    aspect-ratio: 3
    max-height: 100px
    overflow-x: auto
    overflow-y: hidden
    gap: size.$spacing-1
    cursor: pointer
    &::-webkit-scrollbar
        display: none

    img
        aspect-ratio: 4/5
        height: 100%
        flex-shrink: 0
        border-radius: size.$radius-size-std
        object-fit: cover

.book-item
    position: relative
    margin-bottom: size.$spacing-1
    cursor: pointer
    aspect-ratio: 3
    width: 100%
    max-height: 100px
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