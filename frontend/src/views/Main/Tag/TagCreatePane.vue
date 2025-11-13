<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { useTagCreatePane } from "@/services/main/tag"
import {
    TagNameAndOtherEditor, TagAddressTypeEditor, TagGroupTypeEditor, TagLinkEditor,
    DescriptionEditor, SourceTagMappingEditor, TagExampleEditor
} from "@/components-business/form-editor"

const { form, submit, addressInfo, isRootNode } = useTagCreatePane()

</script>

<template>
    <p class="selectable">
        {{addressInfo.address}}
    </p>
    <div class="mt-1">
        <TagNameAndOtherEditor v-model:name="form.name" v-model:other-names="form.otherNames" v-model:color="form.color" :color-enabled="isRootNode"/>
    </div>
    <div class="mt-2">
        <TagAddressTypeEditor v-model:value="form.type"/>
    </div>
    <div class="mt-1">
        <TagGroupTypeEditor v-model:is-sequence-group="form.isSequenceGroup" v-model:is-override-group="form.isOverrideGroup"/>
    </div>
    <Separator direction="horizontal" :spacing="2"/>
    <DescriptionEditor v-model:value="form.description"/>
    <Separator direction="horizontal" :spacing="2"/>
    <label class="mt-2 label is-font-size-small">标签链接</label>
    <div>
        <TagLinkEditor v-model:value="form.links"/>
    </div>
    <label class="mt-4 label is-font-size-small">来源标签映射</label>
    <div>
        <SourceTagMappingEditor v-model:value="form.mappingSourceTags" direction="vertical"/>
    </div>
    <label class="mt-4 label is-font-size-small">示例</label>
    <TagExampleEditor v-model:value="form.examples"/>
    <Button class="mt-4 w-100" mode="light" type="success" icon="save" @click="submit">保存</Button>
</template>
