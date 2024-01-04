<script setup lang="ts">
import { ElementPopupMenu } from "@/components/interaction"
import { Separator, Icon, Button } from "@/components/universal"
import { useDetailPaneTabResolve, useFindSimilarDetailPanel } from "@/services/main/find-similar"
import { MenuItem } from "@/modules/popup-menu"
import { numbers } from "@/utils/primitives"

const { selector: { selected }, operators: { allBooks, allCollections, addToBook, addToCollection, markIgnored, cloneImage, deleteItem } } = useFindSimilarDetailPanel()

const { existedRelations } = useDetailPaneTabResolve()

const addToBookMenuItems = () => <MenuItem<undefined>[]>allBooks.value.map(b => ({type: "normal", label: b.title, click: () => addToBook(b.id)}))

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
    <template v-for="r in existedRelations">
        <p v-if="r.type === 'SOURCE_IDENTITY_EQUAL'" class="has-text-warning"><Icon icon="equals"/>
            <template v-if="r.sourcePartName !== null"><b>相同的来源页名</b>: {{ r.site }}/{{ r.sourcePartName }}</template>
            <template v-else-if="r.sourcePart !== null"><b>相同的来源ID与页码</b>: {{ r.site }} {{ r.sourceId }} p{{ r.sourcePart }}</template>
            <template v-else><b>相同的来源ID</b>: {{ r.site }} {{ r.sourceId }}</template>
        </p>
        <p v-else-if="r.type === 'SOURCE_IDENTITY_SIMILAR'" class="has-text-info"><Icon icon="equals"/><b>相同的来源ID，不同的页码</b>: {{ r.site }} {{ r.sourceId }}</p>
        <p v-else-if="r.type === 'HIGH_SIMILARITY'" class="has-text-success"><Icon icon="face-smile-beam"/><b>内容相似</b>: {{ numbers.round2decimal(r.similarity * 100) }}%</p>
        <p v-else-if="r.type === 'SOURCE_RELATED'" class="has-text-info"><Icon icon="hand-scissors"/><b>相关关系</b>: 来源关联项</p>
        <p v-else-if="r.type === 'SOURCE_BOOK'" class="has-text-info"><Icon icon="marker"/><b>相关关系</b>: 来源集合 {{ r.site }}-{{ r.sourceBookCode }}</p>
        <p v-else-if="r.type === 'ASSOCIATED'" class="has-text-secondary"><Icon icon="check"/><b>已关联</b>: 关联组引起的关联</p>
        <p v-else-if="r.type === 'COLLECTION'" class="has-text-secondary"><Icon icon="check"/><b>已关联</b>: 同一个集合 {{ r.collectionId }}</p>
        <p v-else-if="r.type === 'BOOK'" class="has-text-secondary"><Icon icon="check"/><b>已关联</b>: 同一个画集 {{ r.bookId }}</p>
        <p v-else-if="r.type === 'IGNORED'" class="has-text-secondary"><Icon icon="check"/><b>已标记忽略</b></p>
    </template>
    <Separator v-if="existedRelations.length > 0" direction="horizontal"/>
    <p class="mt-2 has-text-centered"><Icon icon="wine-bottle"/><b>项目处理</b></p>
    <ElementPopupMenu :items="addToCollectionMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
        <Button :ref="setEl" v-bind="attrs" class="mt-2 w-100 has-text-left" size="small" icon="images" end-icon="ellipsis-v" @click="popup">加入集合</Button>
    </ElementPopupMenu>
    <ElementPopupMenu :items="addToBookMenuItems" position="bottom" v-slot="{ popup, setEl, attrs }">
        <Button :ref="setEl" v-bind="attrs" class="w-100 has-text-left" size="small" icon="clone" end-icon="ellipsis-v" :disabled="allBooks.length <= 0" @click="popup">加入画集</Button>
    </ElementPopupMenu>
    <Button class="w-100 has-text-left" size="small" icon="copy" @click="cloneImage()">克隆图像属性</Button>
    <Button class="w-100 has-text-left" size="small" icon="link-slash" @click="markIgnored()">添加忽略标记</Button>
    <Button class="w-100 has-text-left" size="small" icon="trash" @click="deleteItem()">删除项目</Button>
</template>
