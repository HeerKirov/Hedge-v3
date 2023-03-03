<script setup lang="ts">
import { Button } from "@/components/universal"
import { Group } from "@/components/layout"
import { useEditorContext } from "./context"
import RightColumnDatabase from "./RightColumnDatabase.vue"
import RightColumnRecent from "./RightColumnRecent.vue"
import RightColumnSourceDrive from "./RightColumnSourceDrive.vue"
import RightColumnSuggest from "./RightColumnSuggest.vue"

const { identity, tab } = useEditorContext()

</script>

<template>
    <Group single-line class="p-1">
        <Button :type="tab === 'db' ? 'primary' : undefined" icon="database" @click="tab = 'db'">数据库</Button>
        <Button :type="tab === 'recent' ? 'primary' : undefined" icon="history" @click="tab = 'recent'">最近使用</Button>
        <Button :type="tab === 'suggest' ? 'primary' : undefined" icon="adjust" @click="tab = 'suggest'">相关推荐</Button>
        <Button v-if="identity?.type === 'IMAGE'" :type="tab === 'source' ? 'primary' : undefined" icon="file-invoice" @click="tab = 'source'">来源推导</Button>
    </Group>
    <RightColumnDatabase v-if="tab === 'db'"/>
    <RightColumnRecent v-else-if="tab === 'recent'"/>
    <RightColumnSuggest v-else-if="tab === 'suggest'"/>
    <RightColumnSourceDrive v-else/>
</template>
