<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import { Input } from "@/components/form"
import { usePaginationDataView, useQueryListview } from "@/functions/fetch"
import { IllustQueryFilter } from "@/functions/http-client/api/illust"

const path = ref(1)

const filter = ref<IllustQueryFilter>({
    type: "IMAGE",
    query: ""
})

const listview = useQueryListview({
    filter,
    request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
    eventFilter: {
        filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted"],
        request: client => items => client.illust.findByIds(items.map(i => i.id)),
        operation({ event, update, remove, refresh }) {
            if(event.eventType === "entity/illust/created") {
                refresh()
            }else if(event.eventType === "entity/illust/updated") {
                if(event.generalUpdated || event.sourceDataUpdated || event.relatedItemsUpdated) {
                    update(item => item.id === event.illustId)
                }
            }else if(event.eventType === "entity/illust/deleted") {
                remove(item => item.id === event.illustId)
            }
        }
    }
})

const { data, dataUpdate } = usePaginationDataView(listview)

watch(data, data => {
    if(data.metrics.total === undefined) {
        dataUpdate(0, 10)
    }
}, {immediate: true})

</script>

<template>
    <Input v-model:value="filter.query"/>
    <div v-for="item in data.result">
        {{item}}
    </div>
</template>

<style module lang="sass">

</style>
