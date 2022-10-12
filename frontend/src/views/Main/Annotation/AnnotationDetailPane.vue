<script setup lang="ts">
import { Tag } from "@/components/universal"
import { useAnnotationDetailPane } from "@/services/main/annotation"
import { AnnotationTargetDisplay, AnnotationCanBeExportedDisplay } from "@/components-business/form-display"

const { data } = useAnnotationDetailPane()

</script>

<template>
    <template v-if="data !== null">
        <Tag brackets="[]">{{data.name}}</Tag>
        <AnnotationCanBeExportedDisplay class="mt-2" :value="data.canBeExported"/>
        <AnnotationTargetDisplay class="mt-2" :value="data.target" :meta-type="data.type"/>
    </template>
</template>

<style module lang="sass">

</style>
