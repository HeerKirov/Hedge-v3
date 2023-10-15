<script setup lang="ts">
import { LazyLoad } from "@/components/logical"
import { installNoteContext } from "@/services/main/note"
import NoteList from "./NoteList.vue"
import NoteDetail from "./NoteDetail.vue"

const { paneState } = installNoteContext()

</script>

<template>
    <LazyLoad :visible="paneState.mode.value === 'close'" v-slot="{ visible }">
        <NoteList v-show="visible"/>
    </LazyLoad>
    <NoteDetail v-if="paneState.mode.value === 'create' || paneState.mode.value === 'detail'"/>
</template>