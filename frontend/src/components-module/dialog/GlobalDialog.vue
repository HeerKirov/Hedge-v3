<script setup lang="ts">
import { DialogBox } from "@/components/interaction"
import { useInternalService } from "./context"
import SourceDataEditor from "./SourceDataEditor/SourceDataEditor.vue"

const { context, close } = useInternalService()

</script>

<template>
    <DialogBox :class="$style['container-box']" :visible="context !== null" @close="close" :close-on-click-outside="true" :close-on-escape="true">
        <SourceDataEditor v-if="context.type === 'sourceDataEditor'" :p="context.props" @close="close"/>
    </DialogBox>
</template>

<style module lang="sass">
.container-box
    padding: 0.5rem
    min-height: 10vh
    max-height: 80vh
    width: 95vw
    @media screen and (min-width: 800px)
        width: 720px
    @media screen and (min-width: 1024px)
        width: 960px
    @media screen and (min-width: 1400px)
        width: 1200px
</style>
