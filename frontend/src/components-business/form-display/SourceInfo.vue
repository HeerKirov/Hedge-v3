<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { useSettingSite } from "@/services/setting"
import { SourceDataPath } from "@/functions/http-client/api/all"
import { SITE_ICONS } from "@/constants/site"

const props = defineProps<{
    source: SourceDataPath | null
}>()

const { data: sites } = useSettingSite()

const site = computed(() => props.source != null ? sites.value?.find(s => s.name === props.source!.sourceSite) ?? null : null)

const siteTitle = computed(() => site?.value?.title ?? props.source?.sourceSite)

</script>

<template>
    <p v-if="source" class="no-wrap">
        <img v-if="SITE_ICONS[source.sourceSite]" :class="$style['site-icon']" :src="SITE_ICONS[source.sourceSite]" alt="site icon"/>
        <Icon v-else class="mr-2" icon="pager"/>
        <span class="selectable">
            {{ siteTitle }}
            <b>{{ source.sourceId }}</b>
            <span v-if="source.sourcePart !== null" class="ml-1">p{{ source.sourcePart }}</span>
            <span v-if="source.sourcePartName !== null" class="secondary-text">/{{ source.sourcePartName }}</span>
        </span>
    </p>
    <p v-else>
        <Icon class="mr-1 has-text-secondary" icon="pager"/>
        <span class="secondary-text">无来源信息</span>
    </p>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.site-icon
    display: inline-block
    margin-right: size.$spacing-2
    width: 16px
    height: 16px
    vertical-align: sub
</style>