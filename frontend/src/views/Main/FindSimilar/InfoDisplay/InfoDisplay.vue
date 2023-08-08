<script setup lang="ts">
import { ref } from "vue"
import { Button, Tag } from "@/components/universal"
import { SimpleBook } from "@/functions/http-client/api/book"
import { ImagePropsCloneForm } from "@/functions/http-client/api/illust"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"
import EditedRelation from "./EditedRelation.vue"
import ExistedRelation from "./ExistedRelation.vue"
import ActionDelete from "./ActionDelete.vue"
import ActionMarkIgnored from "./ActionMarkIgnored.vue"
import ActionAddToCollection from "./ActionAddToCollection.vue"
import ActionAddToBook from "./ActionAddToBook.vue"
import ActionClone from "./ActionClone.vue"

const { 
    selector: { selectMode, compare, multiple, exchangeCompareSelection }, 
    display: { existedRelations, editedRelations },
    resolves: { addActionBook, addActionClone, addActionCollection, addActionDelete, addActionIgnore }
} = useFindSimilarDetailPanel()

type Action = "CLONE_IMAGE" | "ADD_TO_COLLECTION" | "ADD_TO_BOOK" | "MARK_IGNORED" | "DELETE"

const actionPanel = ref<Action | null>(null)

const clickAction = (action: Action) => actionPanel.value = actionPanel.value === action ? null : action

const submitActionClone = (props: ImagePropsCloneForm["props"], merge: boolean, deleteFrom: boolean) => {
    addActionClone(props, merge, deleteFrom)
    actionPanel.value = null
}

const submitActionAddToCollection = (collectionId: string | number) => {
    addActionCollection(collectionId)
    actionPanel.value = null
}

const submitActionAddToBook = (book: SimpleBook) => {
    addActionBook(book.id)
    actionPanel.value = null
}

const submitActionMarkIgnored = () => {
    addActionIgnore()
    actionPanel.value = null
}

const submitActionDelete = (choice: "A" | "B" | "A&B") => {
    addActionDelete(choice)
    actionPanel.value = null
}

</script>

<template>
    <template v-if="selectMode === 'COMPARE'">
        <Button class="w-100" icon="exchange-alt" @click="exchangeCompareSelection">交换A与B</Button>
        <label class="label mt-2 mb-1">已有关系</label>
        <template v-for="r in existedRelations">
            <ExistedRelation :value="r"/>
        </template>
        <label v-if="editedRelations.length" class="label mt-2 mb-1">已编辑的操作</label>
        <template v-for="r in editedRelations">
            <EditedRelation :value="r"/>
        </template>
        <label class="label mt-2 mb-1">添加操作</label>
        <p><Tag class="mr-1" clickable color="primary" icon="copy" @click="clickAction('CLONE_IMAGE')">属性克隆</Tag></p>
        <ActionClone v-if="actionPanel === 'CLONE_IMAGE'" @submit="submitActionClone"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="success" icon="images" @click="clickAction('ADD_TO_COLLECTION')">加入集合</Tag></p>
        <ActionAddToCollection v-if="actionPanel === 'ADD_TO_COLLECTION'" :images="[compare.a, compare.b]" @submit="submitActionAddToCollection"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="success" icon="clone" @click="clickAction('ADD_TO_BOOK')">加入画集</Tag></p>
        <ActionAddToBook v-if="actionPanel === 'ADD_TO_BOOK'" :images="[compare.a, compare.b]" @submit="submitActionAddToBook"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="warning" icon="link-slash" @click="clickAction('MARK_IGNORED')">忽略关系</Tag></p>
        <ActionMarkIgnored v-if="actionPanel === 'MARK_IGNORED'" @submit="submitActionMarkIgnored"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="danger" icon="trash" @click="clickAction('DELETE')">删除项目</Tag></p>
        <ActionDelete v-if="actionPanel === 'DELETE'" mode="COMPARE" @submit="submitActionDelete"/>
    </template>
    <template v-else>
        <div class="has-text-centered is-line-height-std"><i>已选择{{ multiple.selected.length }}项</i></div>
        <label v-if="editedRelations.length" class="label mt-2 mb-1">已编辑的操作</label>
        <template v-for="r in editedRelations">
            <EditedRelation :value="r"/>
        </template>
        <label class="label mt-2 mb-1">添加操作</label>
        <p class="mt-1"><Tag class="mr-1" clickable color="success" icon="images" @click="clickAction('ADD_TO_COLLECTION')">加入集合</Tag></p>
        <ActionAddToCollection v-if="actionPanel === 'ADD_TO_COLLECTION'" :images="multiple.selected" @submit="submitActionAddToCollection"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="success" icon="clone" @click="clickAction('ADD_TO_BOOK')">加入画集</Tag></p>
        <ActionAddToBook v-if="actionPanel === 'ADD_TO_BOOK'" :images="[compare.a, compare.b]" @submit="submitActionAddToBook"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="warning" icon="link-slash" @click="clickAction('MARK_IGNORED')">忽略关系</Tag></p>
        <ActionMarkIgnored v-if="actionPanel === 'MARK_IGNORED'" @submit="submitActionMarkIgnored"/>
        <p class="mt-1"><Tag class="mr-1" clickable color="danger" icon="trash" @click="clickAction('DELETE')">删除项目</Tag></p>
        <ActionDelete v-if="actionPanel === 'DELETE'" mode="MULTIPLE" @submit="submitActionDelete"/>
    </template>
</template>