<script setup lang="ts">
import { Button } from "@/components/universal"
import { Input, CheckBox, Select } from "@/components/form"
import { AnnotationTargetEditor } from "@/components-business/form-editor"
import { META_TYPE_NAMES, META_TYPES } from "@/constants/entity"
import { useAnnotationCreatePane } from "@/services/main/annotation"

const { form, submit } = useAnnotationCreatePane()

const metaTypeSelectItems = META_TYPES.map(t => ({label: META_TYPE_NAMES[t], value: t}))

</script>

<template>
    <p>
        <Input placeholder="注解名称" v-model:value="form.name"/>
    </p>
    <p class="mt-2">
        <Select :items="metaTypeSelectItems" v-model:value="form.type"/>
    </p>
    <p class="mt-3">
        <CheckBox v-model:value="form.canBeExported">可导出至图库项目</CheckBox>
    </p>
    <AnnotationTargetEditor class="mt-2" v-model:value="form.target" :meta-type="form.type"/>
    <Button class="mt-4 w-100" mode="light" type="success" icon="save" @click="submit">保存</Button>
</template>

<style module lang="sass">

</style>
