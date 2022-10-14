<script setup lang="ts">
import { Tag } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { FormEditKit } from "@/components/interaction"
import { useAnnotationDetailPane } from "@/services/main/annotation"
import { AnnotationTargetDisplay, AnnotationCanBeExportedDisplay } from "@/components-business/form-display"
import { AnnotationTargetEditor } from "@/components-business/form-editor"

const { data, setName, setCanBeExported, setAnnotationTarget } = useAnnotationDetailPane()

</script>

<template>
    <template v-if="data !== null">
        <FormEditKit :value="data.name" :set-value="setName">
            <template #default="{ value }">
                <Tag class="is-font-size-large" brackets="[]">{{value}}</Tag>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input placeholder="注解名称" :value="value" @update:value="setValue" update-on-input @enter="save"/>
            </template>
        </FormEditKit>
        <FormEditKit class="mt-4" :value="data.canBeExported" :set-value="setCanBeExported">
            <template #default="{ value }">
                <AnnotationCanBeExportedDisplay :value="value"/>
            </template>
            <template #edit="{ value, setValue }">
                <CheckBox :value="value" @update:value="setValue">可导出至图库项目</CheckBox>
            </template>
        </FormEditKit>
        <FormEditKit class="mt-4" :value="data.target" :set-value="setAnnotationTarget">
            <template #default="{ value }">
                <AnnotationTargetDisplay :value="value" :meta-type="data.type"/>
            </template>
            <template #edit="{ value, setValue }">
                <AnnotationTargetEditor :value="value" @update:value="setValue" :meta-type="data.type"/>
            </template>
        </FormEditKit>
    </template>
</template>

<style module lang="sass">

</style>
