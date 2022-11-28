<script setup lang="ts">
import { Button, Separator } from "@/components/universal"
import { TopBarLayout, MiddleLayout, Container } from "@/components/layout"
import { useTopicContext, useTopicCreatePanel } from "@/services/main/topic"
import TopicDetailPanelForm from "./TopicDetailPanelForm.vue"

const { paneState } = useTopicContext()
const { form, setProperty, submit } = useTopicCreatePanel()

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

        <Container class="py-2">
            <TopicDetailPanelForm :data="form" @set-property="setProperty"/>
        </Container>
    </TopBarLayout>
</template>
