<script setup lang="ts">
import { Icon } from "@/components/universal"
import { Colors } from "@/constants/ui"
import { AuthorType } from "@/functions/http-client/api/author"
import { TopicType } from "@/functions/http-client/api/topic"
import { AUTHOR_TYPE_ICONS, TOPIC_TYPE_ICONS, TOPIC_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"

defineProps<{
    name: string
    otherNames: string[]
    color: Colors | null
    metaType?: TopicType | AuthorType
}>()

</script>

<template>
    <b :class="{[`has-text-${color}`]: !!color, 'is-font-size-h3': true, 'selectable': true}">
        <Icon v-if="metaType !== undefined && metaType !== 'UNKNOWN'" :icon="TOPIC_TYPES_WITHOUT_UNKNOWN.includes(metaType as any) ? TOPIC_TYPE_ICONS[metaType as TopicType] : AUTHOR_TYPE_ICONS[metaType as AuthorType]"/>
        {{name}}
    </b>
    <i class="secondary-text ml-1 selectable">{{otherNames.join(" / ")}}</i>
</template>

