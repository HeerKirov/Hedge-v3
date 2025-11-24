<script setup lang="ts">
import { Block, Button, Separator, Icon, Starlight } from "@/components/universal"
import { Select } from "@/components/form"
import { ElementPopupMenu, FormEditKit } from "@/components/interaction"
import { BrowserTeleport } from "@/components/logical"
import { Container } from "@/components/layout"
import { DescriptionDisplay, MetaKeywordDisplay, SourceTagMappingDisplay, MetaTagExampleDisplay, TagNameAndOtherDisplay } from "@/components-business/form-display"
import { DescriptionEditor, MetaKeywordEditor, TagNameAndOtherEditor, SourceTagMappingEditor } from "@/components-business/form-editor"
import { useAuthorDetailPanel } from "@/services/main/author"
import { MenuItem } from "@/modules/popup-menu"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES } from "@/constants/entity"

const {
    data,
    toggleFavorite, setName, setDescription, setKeywords, setScore, setType, setMappingSourceTags,
    findSimilarOfAuthor, openIllustsOfAuthor, openBooksOfAuthor, deleteItem
} = useAuthorDetailPanel()

const AUTHOR_TYPE_SELECT_ITEMS = AUTHOR_TYPES.map(t => ({label: AUTHOR_TYPE_NAMES[t], value: t}))

const ellipsisMenuItems = <MenuItem<undefined>[]>[
    {type: "normal", label: "在图库搜索", click: openIllustsOfAuthor},
    {type: "normal", label: "在画集搜索", click: openBooksOfAuthor},
    {type: "separator"},
    {type: "normal", label: "查找此作者的相似项", click: findSimilarOfAuthor},
    {type: "separator"},
    {type: "normal", label: "删除此作者", click: deleteItem},
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
                            <Icon :icon="AUTHOR_TYPE_ICONS[value]"/>
                            {{ AUTHOR_TYPE_NAMES[value] }}
                        </template>
                        <template #edit="{ value, setValue }">
                            <span class="is-line-height-std mx-1"><Icon :icon="AUTHOR_TYPE_ICONS[value]"/></span>
                            <Select :items="AUTHOR_TYPE_SELECT_ITEMS" :value="value" @update:value="setValue"/>
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
                    <MetaKeywordEditor meta-type="AUTHOR" :value="value" @update:value="setValue" @save="save" auto-focus/>
                </template>
            </FormEditKit>
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
        <MetaTagExampleDisplay class="mt-2" meta-type="AUTHOR" :meta-name="data.name" :meta-id="data.id"/>
    </Container>
</template>
