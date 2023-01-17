<script setup lang="ts">
import { computed } from "vue"
import { Block, Icon } from "@/components/universal"
import { Tagme } from "@/functions/http-client/api/illust"
import { TAGME_TYPE_ICONS, TAGME_TYPES } from "@/constants/entity"

const props = defineProps<{
    value: Tagme[]
}>()

const valueList = computed(() => TAGME_TYPES.filter(tagme => props.value?.includes(tagme)))

</script>

<template>
    <Block class="p-1">
        <b>Tagme</b>
        <span class="float-right">
            <i v-if="!valueList.length">无</i>
            <Icon v-else v-for="tagme in valueList" :icon="TAGME_TYPE_ICONS[tagme]"/>
        </span>
    </Block>
</template>
