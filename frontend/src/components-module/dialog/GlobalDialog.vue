<script setup lang="ts">
import { ref, computed, ComponentPublicInstance } from "vue"
import { DialogBox } from "@/components/interaction"
import { useElementRect, useWindowSize } from "@/utils/sensors"
import {
    useInternalService,
    SourceDataEditorProps, MetaTagEditorProps, CreatingCollectionProps, CreatingBookProps,
    AddIllustProps, AddToFolderProps, CloneImageProps, FindSimilarTaskExplorerProps, AssociateExplorerProps,
    ExternalExporterProps
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
import ExternalExporter from "./ExternalExporter/ExternalExporter.vue"

const { context, close } = useInternalService()

const innerRef = ref<ComponentPublicInstance>()

const innerElement = computed<HTMLElement>(() => innerRef.value?.$el)

const innerElementRect = useElementRect(innerElement)

const innerElementHeight = computed(() => innerElementRect.value?.height)

const windowSize = useWindowSize()

const thresholdHeight = computed(() => windowSize.value.height * 0.75 - 20) //magic number 20：是0.5rem+2px的边界值，再加2px的冗余。减去这个数字才是内容区域的边界阈值

const fixed = computed(() => innerElementHeight.value && innerElementHeight.value >= thresholdHeight.value)

</script>

<template>
    <DialogBox :class="{[$style['container-box']]: true, [$style.fixed]: fixed}" :visible="context !== null" @close="close" :close-on-click-outside="true" :close-on-escape="true">
        <SourceDataEditor v-if="context!.type === 'sourceDataEditor'" ref="innerRef" :p="context!.props as SourceDataEditorProps" @close="close"/>
        <MetaTagEditor v-else-if="context!.type === 'metaTagEditor'" ref="innerRef" :p="context!.props as MetaTagEditorProps" @close="close"/>
        <CreatingCollection v-else-if="context!.type === 'creatingCollection'" ref="innerRef" :p="context!.props as CreatingCollectionProps" @close="close"/>
        <CreatingBook v-else-if="context!.type === 'creatingBook'" ref="innerRef" :p="context!.props as CreatingBookProps" @close="close"/>
        <AddIllust v-else-if="context!.type === 'addIllust'" ref="innerRef" :p="context!.props as AddIllustProps" @close="close"/>
        <AddToFolder v-else-if="context!.type === 'addToFolder'" ref="innerRef" :p="context!.props as AddToFolderProps" @close="close"/>
        <CloneImage v-else-if="context!.type === 'cloneImage'" ref="innerRef" :p="context!.props as CloneImageProps" @close="close"/>
        <FindSimilarTaskExplorer v-else-if="context!.type === 'findSimilarTaskExplorer'" ref="innerRef" :p="(context!.props as FindSimilarTaskExplorerProps)" @close="close"/>
        <AssociateExplorer v-else-if="context!.type === 'associateExplorer'" ref="innerRef" :p="(context!.props as AssociateExplorerProps)" @close="close"/>
        <ExternalExporter v-else-if="context!.type === 'externalExporter'" ref="innerRef" :p="(context!.props as ExternalExporterProps)" @close="close"/>
    </DialogBox>
</template>

<style module lang="sass">
.container-box
    padding: 0.5rem
    min-height: 10vh
    max-height: 75vh
    &.fixed
        height: 75vh
    width: 95vw
    @media screen and (min-width: 800px)
        width: 720px
    @media screen and (min-width: 1024px)
        width: 960px
    @media screen and (min-width: 1400px)
        width: 1200px
</style>
