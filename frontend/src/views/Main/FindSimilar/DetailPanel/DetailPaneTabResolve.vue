<script setup lang="ts">
import { toRef } from "vue"
import { ElementPopupMenu } from "@/components/interaction"
import { Separator, Icon, Button } from "@/components/universal"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"
import { MenuItem } from "@/modules/popup-menu"

const props = defineProps<{
    selected: number[]
}>()

const { operators: { allBooks, allCollections, addToBook, addToCollection, markIgnored, cloneImage, deleteItem } } = useFindSimilarDetailPanel()

const addToBookMenuItems = () => <MenuItem<undefined>[]>allBooks.value.map(id => ({type: "normal", label: `画集:${id}`, click: () => addToBook(id)}))
const addToCollectionMenuItems = () => <MenuItem<undefined>[]>[
    ...allCollections.value.map(id => ({type: "normal", label: `集合:${id}`, click: () => addToCollection(id)})),
    ...(allCollections.value.length > 0 ? [{type: "separator"}] : []),
    {type: "normal", label: "创建新集合", click: () => addToCollection("new")}
]

</script>

<template>
    <p class="my-1 has-text-centered">
        已选择<b>{{selected.length}}</b>项
    </p>
    <Separator direction="horizontal"/>
    <p class="mt-2 has-text-centered"><Icon icon="wine-bottle"/><b>项目处理</b></p>
    <ElementPopupMenu :items="addToCollectionMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
        <Button :ref="setEl" v-bind="attrs" class="mt-2 w-100 has-text-left relative" size="small" icon="images" @click="popup">加入集合<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
    </ElementPopupMenu>
    <ElementPopupMenu :items="addToBookMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
        <Button :ref="setEl" v-bind="attrs" class="w-100 has-text-left relative" size="small" icon="clone" :disabled="allBooks.length <= 0" @click="popup">加入画集<Icon :class="$style['float-right-button-icon']" icon="ellipsis-v"/></Button>
    </ElementPopupMenu>
    <Button class="w-100 has-text-left" size="small" icon="copy" @click="cloneImage()">克隆图像属性</Button>
    <Button class="w-100 has-text-left" size="small" icon="link-slash" @click="markIgnored()">添加忽略标记</Button>
    <Button class="w-100 has-text-left" size="small" icon="trash" @click="deleteItem()">删除项目</Button>
</template>

<style module lang="sass">
@use "sass:math"
@import "../../../../styles/base/size"

.float-right-button-icon
    position: absolute
    right: calc(math.div($element-height-small, 2) - 0.5rem)
    top: calc(math.div($element-height-small, 2) - 0.5rem + 1px)
</style>