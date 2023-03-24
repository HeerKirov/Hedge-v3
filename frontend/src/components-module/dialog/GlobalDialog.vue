<script setup lang="ts">
import { DialogBox } from "@/components/interaction"
import { useInternalService, SourceDataEditorProps, MetaTagEditorProps, CreatingCollectionProps, AddToCollectionProps } from "./context"
import SourceDataEditor from "./SourceDataEditor/SourceDataEditor.vue"
import MetaTagEditor from "./MetaTagEditor/MetaTagEditor.vue"
import CreatingCollection from "./CreatingCollection/CreatingCollection.vue"
import AddToCollection from "./AddToCollection/AddToCollection.vue"

const { context, close } = useInternalService()

</script>

<template>
    <DialogBox :class="$style['container-box']" :visible="context !== null" @close="close" :close-on-click-outside="true" :close-on-escape="true">
        <SourceDataEditor v-if="context!.type === 'sourceDataEditor'" :p="context!.props as SourceDataEditorProps" @close="close"/>
        <MetaTagEditor v-else-if="context!.type === 'metaTagEditor'" :p="context!.props as MetaTagEditorProps" @close="close"/>
        <CreatingCollection v-else-if="context!.type === 'creatingCollection'" :p="context!.props as CreatingCollectionProps" @close="close"/>
        <AddToCollection v-else-if="context!.type === 'addToCollection'" :p="context!.props as AddToCollectionProps" @close="close"/>
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
