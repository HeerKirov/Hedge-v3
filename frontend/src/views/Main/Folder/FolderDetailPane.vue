<script setup lang="ts">
import { Icon, GridImages } from "@/components/universal"
import { Input } from "@/components/form"
import { FormEditKit } from "@/components/interaction"
import { TimeGroupDisplay } from "@/components-business/form-display"
import { useFolderDetailPane } from "@/services/main/folder"

const { data, exampleThumbnailFiles, setTitle, openDetail } = useFolderDetailPane()

</script>

<template>
    <template v-if="data !== null">
        <FormEditKit :value="data.title" :set-value="setTitle">
            <template #default="{ value }">
                <span class="is-font-size-large">{{value}}</span>
            </template>
            <template #edit="{ value, setValue, save }">
                <Input placeholder="标题" :value="value" @update:value="setValue" @enter="save" update-on-input auto-focus/>
            </template>
        </FormEditKit>
        <p v-if="data.type === 'FOLDER'" class="mt-2"><Icon class="mr-1" icon="folder"/>目录</p>
        <p v-else class="mt-2"><Icon class="mr-1" icon="angle-right"/>节点</p>
        <div v-if="data.type === 'FOLDER'" class="mt-2">
            <GridImages :images="exampleThumbnailFiles" :column-num="3"/>
            <div class="has-text-right mt-2">
                <a @click="openDetail">查看此目录的所有内容 <Icon icon="angle-double-right"/></a>
            </div>
        </div>
        <TimeGroupDisplay class="mt-4" :create-time="data.createTime" :update-time="data.updateTime"/>
    </template>
</template>
