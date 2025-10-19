<script setup lang="ts">
import { computed, toRef } from "vue"
import { FormEditKit } from "@/components/interaction"
import { Separator, Icon, Block, NumBadge } from "@/components/universal"
import { TagmeInfo, DescriptionDisplay, PartitionTimeDisplay, MetaTagListDisplay, FileInfoDisplay, SourceInfo } from "@/components-business/form-display"
import { DateEditor, DateTimeEditor, FavoriteEditor, ScoreEditor, SourceIdentityEditor, TagmeEditor } from "@/components-business/form-editor"
import { DescriptionEditor } from "@/components-business/form-editor"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { useAssets } from "@/functions/app"
import { usePopupMenu } from "@/modules/popup-menu"
import { useSideBarDetailInfo } from "@/services/main/illust"

const props = defineProps<{
    detailId: number
    scene?: "CollectionDetail" | "CollectionPane"
}>()

defineEmits<{
    (e: "setTab", tab: "related" | "source"): void
}>()

const detailId = toRef(props, "detailId")

const { assetsUrl } = useAssets()

const { data, loading, setScore, setFavorite, setDescription, openMetaTagEditor, setTime, setTagme, setSourceDataPath, openCollection, openBook, openFolder, openAssociate } = useSideBarDetailInfo(detailId)

const anyRelatedItems = computed(() => data.value !== null && ((data.value.parent && props.scene !== 'CollectionPane') || (data.value.children?.length && props.scene !== 'CollectionDetail') || data.value.books.length || data.value.folders.length || data.value.associateCount))

const collectionPopupMenu = usePopupMenu<number>([
    {type: "normal", label: "在新标签页打开集合", enabled: !!openCollection, click: i => openCollection!(i, "newTab")},
    {type: "normal", label: "在新窗口打开集合", enabled: !!openCollection, click: i => openCollection!(i, "newWindow")}
])

const bookPopupMenu = usePopupMenu<SimpleBook>([
    {type: "normal", label: "在新标签页打开此画集", enabled: !!openBook, click: b => openBook!(b, "newTab")},
    {type: "normal", label: "在新窗口打开此画集", enabled: !!openBook, click: b => openBook!(b, "newWindow")}
])

const folderPopupMenu = usePopupMenu<SimpleFolder>([
    {type: "normal", label: "在新标签页打开此文件夹", enabled: !!openFolder, click: f => openFolder!(f, "newTab")},
    {type: "normal", label: "在新窗口打开此文件夹", enabled: !!openFolder, click: f => openFolder!(f, "newWindow")}
])

defineExpose({
    anyRelatedItems,
    anySource: computed(() => !!data.value?.source)
})

</script>

<template>
    <template v-if="!!data">
        <p class="my-1">
            <Icon icon="id-card"/><b class="ml-1 selectable">{{ data.id }}</b>
            <span v-if="data.type === 'COLLECTION'" class="float-right"><Icon class="mr-1" icon="images"/>{{ data.childrenCount }}项</span>
        </p>
        <Separator direction="horizontal"/>
        <div :class="$style.container">
            <div :class="$style.item">
                <div class="flex jc-between">
                    <ScoreEditor :value="data.score" @update:value="setScore" :exported="data.originScore === null"/>
                    <FavoriteEditor :value="data.favorite" @update:value="setFavorite"/>
                </div>
                <FormEditKit class="mt-2" :value="data.description" :set-value="setDescription">
                    <template #default="{ value }">
                        <DescriptionDisplay :value="value" :exported="!data.originDescription" new-skin/>
                    </template>
                    <template #edit="{ value, setValue, save }">
                        <DescriptionEditor :value="value" @update:value="setValue" enter-to-save @enter="save"/>
                    </template>
                </FormEditKit>
                <FileInfoDisplay v-if="scene !== 'CollectionDetail'" class="mt-2" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
                <FormEditKit class="mt-2" :value="{partitionTime: data.partitionTime, orderTime: data.orderTime}" :set-value="setTime">
                    <template #default="{ value }">
                        <PartitionTimeDisplay :partition-time="value.partitionTime" :order-time="value.orderTime" :create-time="data.createTime" :update-time="data.updateTime"/>
                    </template>
                    <template #edit="{ value, setValue, save }">
                        <label><Icon class="mr-2" icon="clock"/><b>时间分区</b></label>
                        <DateEditor auto-focus :value="value.partitionTime" @update:value="setValue({partitionTime: $event, orderTime: value.orderTime})" @enter="save"/>
                        <label><Icon class="mr-2" icon="business-time"/><b>排序时间</b></label>
                        <DateTimeEditor auto-focus :value="value.orderTime" @update:value="setValue({partitionTime: value.partitionTime, orderTime: $event})" @enter="save"/>
                    </template>
                </FormEditKit>
            </div>
            <div v-if="data.type === 'IMAGE' || anyRelatedItems" :class="[$style.item, $style.right]">
                <template v-if="data.type === 'IMAGE'">
                    <Separator :class="$style.separator" direction="horizontal" :spacing="2"/>
                    <div v-if="data.source === null" class="mt-2 flex jc-between">
                        <FormEditKit :value="null" :set-value="setSourceDataPath">
                            <template #default="{ value }">
                                <SourceInfo :source="value"/>
                            </template>
                            <template #edit="{ value, setValue, save }">
                                <SourceIdentityEditor :source="value" @update:source="setValue" @enter="save"/>
                            </template>
                        </FormEditKit>
                        <span class="has-text-secondary"><Icon icon="angle-right"/></span>
                    </div>
                    <div v-else class="mt-2 flex jc-between is-cursor-pointer" @click="$emit('setTab', 'source')">
                        <SourceInfo class="no-wrap overflow-ellipsis" :source="data.source"/>
                        <a><Icon icon="angle-right"/></a>
                    </div>
                </template>
                <template v-if="anyRelatedItems">
                    <Separator :class="$style.separator" direction="horizontal" :spacing="2"/>
                    <div class="bold mt-2 mb-1 is-cursor-pointer" @click="$emit('setTab', 'related')">
                        关联项
                        <a class="float-right"><Icon icon="angle-right"/></a>
                    </div>
                    <template v-if="data.parent && scene !== 'CollectionPane'">
                        <Block :class="$style['parent-item']" @click="openCollection?.(data.parent.id)" @contextmenu="collectionPopupMenu.popup(data.parent.id)">
                            <img :src="assetsUrl(data.parent.filePath.sample)" :alt="`collection ${data.parent.id}`"/>
                            <NumBadge fixed="right-top" :num="data.parent.childrenCount"/>
                            <div :class="$style.info"><Icon icon="id-card"/><b class="ml-1 selectable">{{data.parent.id}}</b></div>
                        </Block>
                    </template>
                    <div v-if="data.children?.length && scene !== 'CollectionDetail'" :class="$style['children-items']" @click="openCollection?.(data.id)" @contextmenu="collectionPopupMenu.popup(data.id)">
                        <Block v-for="item in data.children" :key="item.id">
                            <img :src="assetsUrl(item.filePath.sample)" :alt="`child item ${item.id}`"/>
                        </Block>
                        <div v-if="data.childrenCount !== null && data.children.length < data.childrenCount" class="secondary-text has-text-centered">等{{data.childrenCount}}项</div>
                    </div>
                    <template v-if="data.books.length">
                        <p v-for="book in data.books" :key="book.id" class="no-wrap overflow-ellipsis is-cursor-pointer mt-1" @click="openBook?.(book)" @contextmenu="bookPopupMenu.popup(book)">
                            <Icon class="mr-m1" icon="clone"/>
                            《{{book.title}}》
                        </p>
                    </template>
                    <template v-if="data.folders.length">
                        <p v-for="folder in data.folders" :key="folder.id" class="no-wrap overflow-ellipsis is-cursor-pointer mt-1" @click="openFolder?.(folder)" @contextmenu="folderPopupMenu.popup(folder)">
                            <Icon class="mr-1" icon="folder"/>
                            {{folder.address.join("/")}}
                        </p>
                    </template>
                    <p v-if="data.associateCount > 0" class="is-cursor-pointer mt-1" @click="openAssociate">
                        <Icon class="mr-2" icon="eye"/>
                        <b>{{data.associateCount}}</b> 关联组项
                    </p>
                </template>
            </div>
            <div :class="[$style.item, !anyRelatedItems ? (data.type === 'IMAGE' ? $style['right-bottom'] : $style['right']) : undefined]">
                <Separator :class="$style.separator" direction="horizontal" :spacing="2"/>
                <FormEditKit v-if="data.tagme.length" :value="data.tagme" :set-value="setTagme">
                    <template #default="{ value }">
                        <TagmeInfo :value="value"/>
                    </template>
                    <template #edit="{ value, setValue }">
                        <TagmeEditor :value="value" @update:value="setValue"/>
                    </template>
                </FormEditKit>
                <MetaTagListDisplay class="mt-1" :topics="data.topics" :authors="data.authors" :tags="data.tags" :category="data.type === 'COLLECTION' ? 'related' : 'self'" :self-is="data.type" @edit="openMetaTagEditor"/>
                <template v-if="data.type === 'COLLECTION' || (data.parent !== null && scene !== 'CollectionPane')">
                    <Separator :class="$style.separator" direction="horizontal" :spacing="2"/>
                    <MetaTagListDisplay class="mt-1" :topics="data.topics" :authors="data.authors" :tags="data.tags" :category="data.type === 'COLLECTION' ? 'self' : 'related'" :self-is="data.type" @edit="openMetaTagEditor"/>
                </template>
            </div>
        </div>
    </template>
    <div v-else-if="!loading" class="has-text-centered">
        <i>该内容已被删除</i>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.container
    position: relative
    container-type: inline-size
    container-name: side-pane

    @container side-pane (min-width: 500px)
        .item
            width: calc(50% - #{size.$spacing-2})
        .item.right
            position: absolute
            right: 0
            top: 0
            .separator:first-child
                display: none
        .item.right-bottom
            position: absolute
            right: 0
            top: calc(1em + #{size.$spacing-3 + size.$spacing-half})

.parent-item
    position: relative
    width: 100%
    aspect-ratio: 3
    max-height: 100px
    overflow: hidden
    margin-top: size.$spacing-1
    cursor: pointer
    > .info
        position: absolute
        bottom: 0
        left: 0
        right: 0
        padding: size.$spacing-1 size.$spacing-2
        color: color.$light-mode-text-inverted-color
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 50%)
        &::-webkit-scrollbar
            display: none

    > img
        width: 100%
        height: 100%
        object-fit: cover

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
</style>