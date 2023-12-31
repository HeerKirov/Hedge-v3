<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { Container } from "@/components/layout"
import { useTopicDetailPanel } from "@/services/main/topic"
import { MenuItem } from "@/modules/popup-menu"
import TopicDetailPanelDisplay from "./TopicDetailPanel/TopicDetailPanelDisplay.vue"
import TopicDetailPanelForm from "./TopicDetailPanel/TopicDetailPanelForm.vue"

const {
    data, childrenMode, exampleData,
    editor: { editMode, edit, cancel, save, form, setProperty },
    operators: { toggleFavorite, createByTemplate, createChildOfTemplate, openTopicDetail, deleteItem }
} = useTopicDetailPanel()

const ellipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "新建子主题", click: createChildOfTemplate},
    {type: "normal", label: "以此为模板新建", click: createByTemplate},
    {type: "separator"},
    {type: "normal", label: "删除此主题", click: deleteItem},
]

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" :type="data?.favorite ? 'danger' : 'secondary'" square icon="heart" @click="toggleFavorite"/>
        <Separator/>
        <Button v-if="editMode" class="flex-item no-grow-shrink" icon="close" @click="cancel">取消编辑</Button>
        <Button v-if="editMode" class="flex-item no-grow-shrink" type="primary" icon="save" @click="save">保存</Button>
        <Button v-else class="flex-item no-grow-shrink" square icon="edit" @click="edit"/>
        <ElementPopupMenu v-if="!editMode" :items="ellipsisMenuItems" position="bottom" v-slot="{ setEl, popup }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <Container>
        <TopicDetailPanelDisplay v-if="!editMode && data !== null" :data="data" v-model:children-mode="childrenMode" :examples="exampleData" @click:topic="openTopicDetail"/>
        <TopicDetailPanelForm v-else-if="editMode && form !== null" :name="form.name" :other-names="form.otherNames"
                              :type="form.type" :parent="form.parent"
                              :annotations="form.annotations" :keywords="form.keywords"
                              :description="form.description" :score="form.score"
                              :mapping-source-tags="form.mappingSourceTags"
                              @set-property="setProperty"/>
    </Container>
</template>

<style module lang="sass">

</style>
