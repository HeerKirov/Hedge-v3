<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { TopBarLayout, MiddleLayout, Container } from "@/components/layout"
import { useAuthorContext, useAuthorCreatePanel } from "@/services/main/author"
import AuthorDetailPanelForm from "./AuthorDetailPanel/AuthorDetailPanelForm.vue"

const { paneState } = useAuthorContext()
const { form, setProperty, submit } = useAuthorCreatePanel()

</script>

<template>
    <TopBarLayout>
        <template #top-bar>
            <MiddleLayout>
                <template #left>
                    <Button square icon="angle-left" @click="paneState.closeView()"/>
                </template>
                <template #right>
                    <Button :type="form.favorite ? 'danger' : 'secondary'" square icon="heart" @click="form.favorite = !form.favorite"/>
                    <Separator/>
                    <Button type="success" icon="save" @click="submit">保存</Button>
                </template>
            </MiddleLayout>
        </template>

        <Container>
            <AuthorDetailPanelForm :name="form.name" :other-names="form.otherNames" :type="form.type"
                                   :annotations="form.annotations" :keywords="form.keywords"
                                   :description="form.description" :score="form.score"
                                   :mapping-source-tags="form.mappingSourceTags"
                                   @set-property="setProperty"/>
        </Container>
    </TopBarLayout>
</template>
