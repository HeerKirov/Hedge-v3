<script setup lang="ts">
import { DialogBox } from "@/components/interaction"
import {
    useInternalService,
    SourceDataEditorProps, MetaTagEditorProps, CreatingCollectionProps, CreatingBookProps,
    AddIllustProps, AddToFolderProps, CloneImageProps, FindSimilarTaskExplorerProps, AssociateExplorerProps
} from "./context"
import SourceDataEditor from "./SourceDataEditor/SourceDataEditor.vue"
import MetaTagEditor from "./MetaTagEditor/MetaTagEditor.vue"
import CreatingCollection from "./CreatingCollection/CreatingCollection.vue"
import AddIllust from "./AddIllust/AddIllust.vue"
import CreatingBook from "./CreatingBook/CreatingBook.vue"
import AddToFolder from "./AddToFolder/AddToFolder.vue"
import CloneImage from "./CloneImage/CloneImage.vue"
import FindSimilarTaskExplorer from "./FindSimilarTaskExplorer/FindSimilarTaskExplorer.vue"
import AssociateExplorer from "./AssociateExplorer/AssociateExplorer.vue"

const { context, close } = useInternalService()

</script>

<template>
    <DialogBox :class="$style['container-box']" :visible="context !== null" @close="close" :close-on-click-outside="true" :close-on-escape="true">
        <SourceDataEditor v-if="context!.type === 'sourceDataEditor'" :p="context!.props as SourceDataEditorProps" @close="close"/>
        <MetaTagEditor v-else-if="context!.type === 'metaTagEditor'" :p="context!.props as MetaTagEditorProps" @close="close"/>
        <CreatingCollection v-else-if="context!.type === 'creatingCollection'" :p="context!.props as CreatingCollectionProps" @close="close"/>
        <CreatingBook v-else-if="context!.type === 'creatingBook'" :p="context!.props as CreatingBookProps" @close="close"/>
        <AddIllust v-else-if="context!.type === 'addIllust'" :p="context!.props as AddIllustProps" @close="close"/>
        <AddToFolder v-else-if="context!.type === 'addToFolder'" :p="context!.props as AddToFolderProps" @close="close"/>
        <CloneImage v-else-if="context!.type === 'cloneImage'" :p="context!.props as CloneImageProps" @close="close"/>
        <FindSimilarTaskExplorer v-else-if="context!.type === 'findSimilarTaskExplorer'" :p="(context!.props as FindSimilarTaskExplorerProps)" @close="close"/>
        <AssociateExplorer v-else-if="context!.type === 'associateExplorer'" :p="(context!.props as AssociateExplorerProps)" @close="close"/>
    </DialogBox>
</template>

<style module lang="sass">
.container-box
    padding: 0.5rem
    // min-height: 10vh
    // max-height: 80vh
    height: 70vh
    width: 95vw
    @media screen and (min-width: 800px)
        width: 720px
    @media screen and (min-width: 1024px)
        width: 960px
    @media screen and (min-width: 1400px)
        width: 1200px
</style>
