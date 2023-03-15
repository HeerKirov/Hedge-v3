<script setup lang="ts">
import { Button } from "@/components/universal"
import { SideLayout, SideBar, TopBarLayout, MiddleLayout } from "@/components/layout"
import { ViewStackBackButton } from "@/components-module/view-stack"
import { Illust } from "@/functions/http-client/api/illust"
import { AllSlice, ListIndexSlice, SliceOrPath } from "@/functions/fetch"
import { installImageViewContext } from "@/services/view-stack/image"

const props = defineProps<{
    data: SliceOrPath<Illust, AllSlice<Illust> | ListIndexSlice<Illust>, number[]>
    modifiedCallback?: (illustId: number) => void
}>()

const {
    navigator: { metrics, subMetrics, prev, next },
    target: { id, data, setData }
} = installImageViewContext(props.data, props.modifiedCallback)

</script>

<template>
    <SideLayout>
        <template #side>
            <SideBar>

                <template #bottom>
                    <Button square icon="info"/>
                    <Button square icon="dice-d6"/>
                    <Button square icon="file-invoice"/>
                </template>
            </SideBar>
        </template>

        <TopBarLayout>
            <template #top-bar>
                <MiddleLayout>
                    <template #left>
                        <ViewStackBackButton/>
                    </template>

                    <Button square icon="angle-left" @click="prev"/>
                    <div :class="$style.navigator">
                        {{metrics.current + 1}} / {{metrics.total}}
                        <p v-if="subMetrics" class="secondary-text">{{subMetrics.current + 1}} / {{subMetrics.total}}</p>
                    </div>
                    <Button square icon="angle-right" @click="next"/>

                    <template #right>
                        <Button square icon="heart" :type="data?.favorite ? 'danger' : 'secondary'" @click="setData(id, {favorite: !data?.favorite})"/>
                    </template>
                </MiddleLayout>
            </template>
        </TopBarLayout>
    </SideLayout>
</template>

<style module lang="sass">
.navigator
    padding: 0 0.25rem
    min-width: 4rem
    text-align: center
</style>
