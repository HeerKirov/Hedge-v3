<script setup lang="ts">
import { Block, Button, Icon, Starlight, Separator } from "@/components/universal"
import { Select } from "@/components/form"
import { Container } from "@/components/layout"
import { BrowserTeleport } from "@/components/logical"
import { TagNameAndOtherEditor, ParentTopicEditor, DescriptionEditor, SourceTagMappingEditor, MetaKeywordEditor } from "@/components-business/form-editor"
import { useTopicCreatePanel } from "@/services/main/topic"
import { TOPIC_TYPE_NAMES, TOPIC_TYPES, TOPIC_TYPE_ICONS } from "@/constants/entity"

const { form, submit } = useTopicCreatePanel()

const TOPIC_TYPE_SELECT_ITEMS = TOPIC_TYPES.map(t => ({label: TOPIC_TYPE_NAMES[t], value: t}))

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" :type="form.favorite ? 'danger' : 'secondary'" square icon="heart" @click="form.favorite = !form.favorite"/>
        <Separator/>
        <Button class="flex-item no-grow-shrink" type="success" icon="save" @click="submit">保存</Button>
    </BrowserTeleport>

    <Container>
        <Block class="p-3">
            <div class="flex jc-between">
                <div class="flex-item w-50">
                    <label class="label">名称与别名</label>
                    <TagNameAndOtherEditor v-model:name="form.name" v-model:other-names="form.otherNames"/>
                    <label class="mt-2 label">类型</label>
                    <span class="is-line-height-std mx-1"><Icon :icon="TOPIC_TYPE_ICONS[form.type]"/></span>
                    <Select :items="TOPIC_TYPE_SELECT_ITEMS" v-model:value="form.type"/>
                </div>
                <div>
                    <Starlight editable show-text text-position="left" v-model:value="form.score"/>
                </div>
            </div>
            <DescriptionEditor class="mt-2" v-model:value="form.description"/>
            <MetaKeywordEditor class="mt-2" meta-type="TOPIC" v-model:value="form.keywords"/>
        </Block>
        <Block class="p-3 mt-2">
            <label class="label mb-2"><Icon class="mr-1" icon="chess-queen"/>父主题</label>
            <ParentTopicEditor class="is-line-height-std" v-model:value="form.parent"/>
        </Block>
        <Block class="p-3 mt-2">
            <label class="label">来源映射</label>
            <SourceTagMappingEditor v-model:value="form.mappingSourceTags"/>
        </Block>
    </Container>
</template>
