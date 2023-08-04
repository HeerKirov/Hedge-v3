<script setup lang="ts">
import { Separator } from "@/components/universal"
import DBSource from "./DBSource.vue"
import DBMetadata from "./DBMetadata.vue"

</script>

<template>
    <DBMetadata/>
    <Separator direction="horizontal" :spacing="3"/>
    <DBSource/>
</template>

<style module lang="sass">
.meta-color-label
    width: 4em
</style>
