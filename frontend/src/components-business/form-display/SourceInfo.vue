<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    site: string | null
    sourceId: number | null
    sourcePart: number | null
}>()

const { data: sites } = useSettingSite()

const site = computed(() => props.site != null ? sites.value?.find(s => s.name === props.site) ?? null : null)

const siteTitle = computed(() => site?.value?.title ?? props.site)

</script>

<template>
    <p v-if="site">
        <Icon class="mr-1" icon="pager"/>
        <span class="selectable">
            {{siteTitle}}
            <b>{{sourceId}}</b>
            {{sourcePart !== null ? `p${sourcePart}` : null}}
        </span>
    </p>
    <p v-else>
        <Icon class="mr-1 has-text-secondary" icon="pager"/>
        <span class="secondary-text">无来源信息</span>
    </p>
</template>
