<script setup lang="ts">
import { computed } from "vue"
import { Icon, Tag } from "@/components/universal"
import { Tagme } from "@/functions/http-client/api/illust"
import { TAGME_TYPE_ICONS, TAGME_TYPES } from "@/constants/entity"

const props = defineProps<{
    value: Tagme[]
}>()

const valueList = computed(() => TAGME_TYPES.filter(tagme => props.value?.includes(tagme)))

</script>

<template>
    <div>
        <Tag icon="flag"><b>TAGME</b></Tag>
        <span class="float-right">
            <i v-if="!valueList.length">无</i>
            <Icon v-else v-for="tagme in valueList" :icon="TAGME_TYPE_ICONS[tagme]"/>
        </span>
    </div>
</template>
