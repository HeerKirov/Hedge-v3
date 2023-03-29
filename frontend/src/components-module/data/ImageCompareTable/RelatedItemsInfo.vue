<script setup lang="ts">
import { Icon } from "@/components/universal"
import { ImageRelatedItems } from "@/functions/http-client/api/illust"

defineProps<{
    values: (ImageRelatedItems | null)[]
}>()

</script>

<template>
    <tr v-if="values.some(i => i?.collection)">
        <td>所属集合</td>
        <td v-for="value in values">
            <template v-if="value?.collection">
                <Icon class="mr-1" icon="id-card"/>{{value.collection.id}}
            </template>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.books.length)">
        <td>所属画集</td>
        <td v-for="value in values">
            <div v-if="value !== null" v-for="book in value.books" :key="book.id">
                《{{book.title}}》
            </div>
        </td>
    </tr>
    <tr v-if="values.some(i => i?.folders.length)">
        <td>所属目录</td>
        <td v-for="value in values">
            <div v-if="value !== null" v-for="folder in value.folders" :key="folder.id">
                <Icon class="mr-1" icon="folder"/>
                {{folder.address.join("/")}}
            </div>
        </td>
    </tr>
</template>
