<script setup lang="ts">
import { Button } from "@/components/universal"
import { Group } from "@/components/layout"
import { META_TYPE_ICONS } from "@/constants/entity"
import { useEditorContext } from "./context"
import Input from "@/components/form/Input.vue"

const { tabDBType } = useEditorContext()

</script>

<template>
    <Group class="ml-2 mt-1" single-line>
        <Button size="small" :type="tabDBType === 'author' ? 'primary' : undefined" :icon="META_TYPE_ICONS['AUTHOR']" @click="tabDBType = 'author'">作者</Button>
        <Button size="small" :type="tabDBType === 'topic' ? 'primary' : undefined" :icon="META_TYPE_ICONS['TOPIC']" @click="tabDBType = 'topic'">主题</Button>
        <Button size="small" :type="tabDBType === 'tag' ? 'primary' : undefined" :icon="META_TYPE_ICONS['TAG']" @click="tabDBType = 'tag'">标签</Button>
        <Input size="small" placeholder="搜索数据库"/>
        <Button class="float-right" size="small" type="primary" square icon="sync-alt"/>
    </Group>
    <div v-if="tabDBType === 'author'">

    </div>
    <div v-else-if="tabDBType === 'topic'">

    </div>
    <div v-else>

    </div>
</template>

<style module lang="sass">

</style>
