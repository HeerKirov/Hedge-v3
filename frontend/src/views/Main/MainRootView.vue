<script setup lang="ts">
import { ref } from "vue"
import { SideLayout, SideBar, TopBar } from "@/components/layout"
import { Button } from "@/components/universal"

const stackExists = ref(false)
</script>

<template>
    <SideLayout :class="{'full-view': true, 'is-hidden': stackExists}">
        <template #default>
            <TopBar>
                <Button square icon="arrow-left"/>
            </TopBar>
            hello
        </template>
        <template #side>
            <SideBar>
                <template #default>
                    <p>hello</p>
                </template>
                <template #bottom>
                    <Button square icon="gear"/>
                    <Button class="ml-1" square icon="circle-question"/>
                    <Button class="ml-1 float-right" icon="clipboard">10</Button>
                </template>
            </SideBar>
        </template>
    </SideLayout>
</template>
