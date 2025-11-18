<script setup lang="ts">
import { Block, Button, Separator, Icon, Tag, Starlight } from "@/components/universal"
import { Group } from "@/components/layout"
import { Select } from "@/components/form"
import { ElementPopupMenu, FormEditKit } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { Container } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { DescriptionDisplay, MetaKeywordDisplay, SourceTagMappingDisplay, MetaTagExampleDisplay, TagNameAndOtherDisplay } from "@/components-business/form-display"
import { DescriptionEditor, MetaKeywordEditor, TagNameAndOtherEditor, ParentTopicEditor, SourceTagMappingEditor } from "@/components-business/form-editor"
import { useTopicDetailPanel } from "@/services/main/topic"
import { MenuItem } from "@/modules/popup-menu"
import { TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES } from "@/constants/entity"
import ChildrenViewer from "./TopicDetailPanel/ChildrenViewer.vue"

const {
    data,
    toggleFavorite, setName, setDescription, setKeywords, setScore, setType, setParent, setMappingSourceTags,
    findSimilarOfTopic, openIllustsOfTopic, openBooksOfTopic, createChildOfTemplate, openTopicDetail, deleteItem
} = useTopicDetailPanel()

const TOPIC_TYPE_SELECT_ITEMS = TOPIC_TYPES.map(t => ({label: TOPIC_TYPE_NAMES[t], value: t}))

const ellipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "在图库搜索", click: openIllustsOfTopic},
    {type: "normal", label: "在画集搜索", click: openBooksOfTopic},
    {type: "separator"},
    {type: "normal", label: "以此为父主题新建", click: createChildOfTemplate},
    {type: "separator"},
    {type: "normal", label: "查找此主题的相似项", click: findSimilarOfTopic},
    {type: "separator"},
    {type: "normal", label: "删除此主题", click: deleteItem},
]

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" :type="data?.favorite ? 'danger' : 'secondary'" square icon="heart" @click="toggleFavorite"/>
        <Separator/>
        <ElementPopupMenu :items="ellipsisMenuItems" position="bottom" v-slot="{ setEl, popup }">
            <Button class="flex-item no-grow-shrink" :ref="setEl" square icon="ellipsis-v" @click="popup"/>
        </ElementPopupMenu>
    </BrowserTeleport>

    <Container v-if="data != null">
        <Block class="p-3">
            <div class="flex jc-between">
                <div class="flex-item w-50">
                    <FormEditKit :value="[data.name, data.otherNames] as const" :set-value="setName">
                        <template #default="{ value: [name, otherNames] }">
                            <TagNameAndOtherDisplay :name="name" :other-names="otherNames" :color="data.color" :meta-type="data.type"/>
                        </template>
                        <template #edit="{ value: [name, otherNames], setValue, save }">
                            <TagNameAndOtherEditor :name="name" :other-names="otherNames" @update:value="setValue" @save="save"/>
                        </template>
                    </FormEditKit>
                    <FormEditKit class="mt-2" :value="data.type" :set-value="setType">
                        <template #default="{ value }">
                            <Icon :icon="TOPIC_TYPE_ICONS[value]"/>
                            {{ TOPIC_TYPE_NAMES[value] }}
                        </template>
                        <template #edit="{ value, setValue }">
                            <span class="is-line-height-std mx-1"><Icon :icon="TOPIC_TYPE_ICONS[value]"/></span>
                            <Select :items="TOPIC_TYPE_SELECT_ITEMS" :value="value" @update:value="setValue"/>
                        </template>
                    </FormEditKit>
                </div>
                <div>
                    <Starlight editable show-text text-position="left" :value="data.score" @update:value="setScore"/>
                </div>
            </div>
            <FormEditKit class="mt-2" :value="data.description" :set-value="setDescription">
                <template #default="{ value }">
                    <DescriptionDisplay :value="value" new-skin/>
                </template>
                <template #edit="{ value, setValue, save }">
                    <DescriptionEditor :value="value" @update:value="setValue" @save="save"/>
                </template>
            </FormEditKit>
            <FormEditKit class="mt-2" :value="data.keywords" :set-value="setKeywords">
                <template #default="{ value }">
                    <MetaKeywordDisplay :value="value" show-empty/>
                </template>
                <template #edit="{ value, setValue, save }">
                    <MetaKeywordEditor meta-type="TOPIC" :value="value" @update:value="setValue" @save="save" auto-focus/>
                </template>
            </FormEditKit>
        </Block>
        <Block class="p-3 mt-2">
            <FormEditKit use-display-value :display-value="data.parents" :value="data.parents.length > 0 ? data.parents[data.parents.length - 1] : null" :set-value="setParent">
                <template #default="{ value }">
                    <label class="label mb-2"><Icon class="mr-1" icon="chess-queen"/>父主题</label>
                    <Group>
                        <SimpleMetaTagElement v-for="topic in value" :key="topic.id" type="topic" :value="topic" clickable @click="openTopicDetail(topic.id)"/>
                        <Tag v-if="value.length === 0" icon="question" line-style="solid" color="secondary">无</Tag>
                    </Group>
                </template>
                <template #edit="{ value, setValue }">
                    <label class="label mb-2"><Icon class="mr-1" icon="chess-queen"/>编辑父主题</label>
                    <ParentTopicEditor class="is-line-height-std" :value="value" @update:value="setValue"/>
                </template>
            </FormEditKit>
            <ChildrenViewer v-if="data.children?.length" class="mt-2" :children="data.children" @click:topic="openTopicDetail"/>
        </Block>
        <Block class="p-3 mt-2">
            <FormEditKit :value="data.mappingSourceTags" :set-value="setMappingSourceTags">
                <template #default="{ value }">
                    <label class="label mb-2"><Icon class="mr-1" icon="file-invoice"/>来源映射</label>
                    <SourceTagMappingDisplay :value="value"/>
                </template>
                <template #edit="{ value, setValue }">
                    <label class="label mb-2"><Icon class="mr-1" icon="file-invoice"/>编辑来源映射</label>
                    <SourceTagMappingEditor :value="value" @update:value="setValue"/>
                </template>
            </FormEditKit>
        </Block>
        <MetaTagExampleDisplay class="mt-2" meta-type="TOPIC" :meta-name="data.name" :meta-id="data.id"/>
    </Container>
</template>
