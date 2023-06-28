<script setup lang="ts">
import { ref } from "vue"
import { AssociateExplorerProps } from "./context"
import AssociateEditor from "./AssociateEditor.vue"
import AssociateView from "./AssociateView.vue"

const props = defineProps<{
    p: AssociateExplorerProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const manualEditMode = ref(false)

const close = () => {
    if(manualEditMode.value) {
        manualEditMode.value = false
    }else if(props.p.mode === "edit" && props.p.onSucceed) {
        props.p.onSucceed()
        emit("close")
    }else{
        emit("close")
    }
}

</script>

<template>
    <AssociateEditor v-if="p.mode === 'edit'" :id="p.illustId" :add-ids="p.addIds" :mode="p.addMode" @close="close"/>
    <AssociateEditor v-else-if="manualEditMode" :id="p.illustId" :add-ids="[]" mode="append" @close="close"/>
    <AssociateView v-else :id="p.illustId" @edit="manualEditMode = true" @close="close"/>
</template>