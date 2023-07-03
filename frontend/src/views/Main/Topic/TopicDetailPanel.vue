<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { TopBarLayout, MiddleLayout, Container } from "@/components/layout"
import { useTopicContext, useTopicDetailPanel } from "@/services/main/topic"
import { MenuItem } from "@/modules/popup-menu"
import TopicDetailPanelDisplay from "./TopicDetailPanel/TopicDetailPanelDisplay.vue"
import TopicDetailPanelForm from "./TopicDetailPanel/TopicDetailPanelForm.vue"

const { paneState } = useTopicContext()
const {
    data, childrenMode, exampleData,
    editor: { editMode, edit, cancel, save, form, setProperty },
    operators: { toggleFavorite, createByTemplate, createChildOfTemplate, deleteItem }
} = useTopicDetailPanel()

const ellipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "新建子主题", click: createChildOfTemplate},
    {type: "normal", label: "以此为模板新建", click: createByTemplate},
    {type: "separator"},
    {type: "normal", label: "删除此主题", click: deleteItem},
]

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button v-if="editMode" square icon="close" @click="cancel"/>
                    <Button v-else square icon="angle-left" @click="paneState.closeView()"/>
                </template>
                <template #right>
                    <Button :type="data?.favorite ? 'danger' : 'secondary'" square icon="heart" @click="toggleFavorite"/>
                    <Separator/>
                    <Button v-if="editMode" type="primary" icon="save" @click="save">保存</Button>
                    <Button v-else class="mr-1" square icon="edit" @click="edit"/>
                    <ElementPopupMenu v-if="!editMode" :items="ellipsisMenuItems" position="bottom" v-slot="{ setEl, popup }">
                        <Button :ref="setEl" square icon="ellipsis-v" @click="popup"/>
                    </ElementPopupMenu>
                </template>
            </MiddleLayout>
        </template>

        <Container>
            <TopicDetailPanelDisplay v-if="!editMode && data !== null" :data="data" v-model:children-mode="childrenMode" :examples="exampleData" @click:topic="paneState.openDetailView($event)"/>
            <TopicDetailPanelForm v-else-if="editMode && form !== null" :name="form.name" :other-names="form.otherNames"
                                  :type="form.type" :parent="form.parent"
                                  :annotations="form.annotations" :keywords="form.keywords"
                                  :description="form.description" :score="form.score"
                                  :mapping-source-tags="form.mappingSourceTags"
                                  @set-property="setProperty"/>
        </Container>
    </TopBarLayout>
</template>

<style module lang="sass">

</style>
