<script setup lang="ts">
import { Button } from "@/components/universal"
import { useTagCreatePane } from "@/services/main/tag"
import {
    TagNameAndOtherEditor, TagAddressTypeEditor, TagGroupTypeEditor, TagLinkEditor,
    DescriptionEditor, RelatedAnnotationEditor, SourceTagMappingEditor
} from "@/components-business/form-editor"

const { form, submit, addressInfo, isRootNode } = useTagCreatePane()

</script>

<template>
    <p class="selectable">
        {{addressInfo.address}}
    </p>
    <p class="mt-1">
        <TagNameAndOtherEditor v-model:name="form.name" v-model:other-names="form.otherNames" v-model:color="form.color" :color-enabled="isRootNode"/>
    </p>
    <p class="mt-2">
        <TagAddressTypeEditor v-model:value="form.type"/>
    </p>
    <p class="mt-1">
        <TagGroupTypeEditor v-model:value="form.group"/>
    </p>
    <p class="mt-4">
        <DescriptionEditor v-model:value="form.description"/>
    </p>
    <p class="mt-1">
        <RelatedAnnotationEditor mode="embedded" meta-type="TAG" v-model:value="form.annotations"/>
    </p>
    <label class="mt-5 label is-font-size-small">标签链接</label>
    <p>
        <TagLinkEditor v-model:value="form.links"/>
    </p>
    <label class="mt-4 label is-font-size-small">来源标签映射</label>
    <p>
        <SourceTagMappingEditor v-model:value="form.mappingSourceTags" direction="vertical"/>
    </p>
    <label class="mt-4 label is-font-size-small">示例</label>
    <!-- TODO tag examples -->
    <Button class="mt-4 w-100" mode="light" type="success" icon="save" @click="submit">保存</Button>
</template>

<style module lang="sass">

</style>
