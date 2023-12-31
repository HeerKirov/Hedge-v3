<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { BrowserTeleport } from "@/components/logical"
import { Container } from "@/components/layout"
import { useAuthorCreatePanel } from "@/services/main/author"
import AuthorDetailPanelForm from "./AuthorDetailPanel/AuthorDetailPanelForm.vue"

const { form, setProperty, submit } = useAuthorCreatePanel()

</script>

<template>
    <BrowserTeleport to="top-bar">
        <Button class="flex-item no-grow-shrink" :type="form.favorite ? 'danger' : 'secondary'" square icon="heart" @click="form.favorite = !form.favorite"/>
        <Separator/>
        <Button class="flex-item no-grow-shrink" type="success" icon="save" @click="submit">保存</Button>
    </BrowserTeleport>

    <Container>
        <AuthorDetailPanelForm :name="form.name" :other-names="form.otherNames" :type="form.type"
                               :annotations="form.annotations" :keywords="form.keywords"
                               :description="form.description" :score="form.score"
                               :mapping-source-tags="form.mappingSourceTags"
                               @set-property="setProperty"/>
    </Container>
</template>
