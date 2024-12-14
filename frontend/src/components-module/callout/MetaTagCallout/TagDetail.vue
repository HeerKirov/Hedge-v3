<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { Flex } from "@/components/layout"
import { DescriptionDisplay, TagLinkDisplay, TagAddressTypeDisplay, TagGroupTypeDisplay } from "@/components-business/form-display"
import { META_TYPE_ICONS } from "@/constants/entity"
import { toRef } from "@/utils/reactivity"
import { useTagDetailData } from "./context"

const props = defineProps<{
    tagId: number
}>()

const { data, addressInfo } = useTagDetailData(toRef(props, "tagId"))

const otherNameText = computed(() => data.value !== null && data.value.otherNames.length > 0 ? data.value.otherNames.join(" / ") : null)

</script>

<template>
    <template v-if="data !== null">
        <i>
            {{addressInfo.address}}
        </i>
        <p class="mb-2">
            <span :class="{'is-font-size-h4': true, [`has-text-${data.color}`]: !!data.color}">
                <Icon :icon="META_TYPE_ICONS['TAG']"/>
                {{data.name}}
            </span>
            <span class="ml-2 has-text-secondary">{{otherNameText}}</span>
        </p>
        <Flex class="mb-2" :spacing="1">
            <TagAddressTypeDisplay :value="data.type"/>
            <TagGroupTypeDisplay :value="data.group" :member="addressInfo.member" :member-index="addressInfo.memberIndex"/>
        </Flex>
        <div class="mb-2"/>
        <p v-if="data.description">
            <DescriptionDisplay :value="data.description"/>
        </p>
        <p v-if="data.links.length" class="mt-2">
            <TagLinkDisplay :value="data.links"/>
        </p>
    </template>
</template>
