<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { Site } from "@/functions/http-client/api/setting"
import TagTypeEditor from "./TagTypeEditor.vue"

const props = defineProps<{
    tagTypeMappings: Site["tagTypeMappings"]
    editable: boolean
}>()

const emit = defineEmits<{
    (e: "update:tagTypeMappings", value: Site["tagTypeMappings"]): void
}>()


const value = computed(() => {
    const ret: Record<Site["tagTypeMappings"][string], string[]> = arrays.toMap(TARGETS, () => [])
    for(const [k, v] of Object.entries(props.tagTypeMappings)) {
        ret[v].push(k)
    }
    return ret
})

const update = (newItems: string[], oldItems: string[], k: Site["tagTypeMappings"][string]) => {
    const added = newItems.filter(i => !oldItems.includes(i))
    const deleted = oldItems.filter(i => !newItems.includes(i))
    const ret: Site["tagTypeMappings"] = {...props.tagTypeMappings}
    deleted.forEach(i => delete ret[i])
    added.forEach(i => ret[i] = k)
    emit("update:tagTypeMappings", ret)
}

</script>

<script lang="ts">
import { AuthorType } from "@/functions/http-client/api/author"
import { TopicType } from "@/functions/http-client/api/topic"
import { MetaType } from "@/functions/http-client/api/all"
import { AUTHOR_TYPE_ICONS, AUTHOR_TYPE_NAMES, AUTHOR_TYPES_WITHOUT_UNKNOWN, META_TYPE_ICONS, META_TYPE_NAMES, TOPIC_TYPE_ICONS, TOPIC_TYPE_NAMES, TOPIC_TYPES_WITHOUT_UNKNOWN } from "@/constants/entity"
import { arrays } from "@/utils/primitives"

const TARGETS = [...AUTHOR_TYPES_WITHOUT_UNKNOWN, ...TOPIC_TYPES_WITHOUT_UNKNOWN, "TAG"] as const
const TARGET_NAMES = arrays.toMap(TARGETS, k => AUTHOR_TYPE_NAMES[k as AuthorType] ?? TOPIC_TYPE_NAMES[k as TopicType] ?? META_TYPE_NAMES[k as MetaType])
const TARGET_ICONS = arrays.toMap(TARGETS, k => AUTHOR_TYPE_ICONS[k as AuthorType] ?? TOPIC_TYPE_ICONS[k as TopicType] ?? META_TYPE_ICONS[k as MetaType])

</script>

<template>
    <table class="table w-100">
        <tbody>
            <tr v-for="(items, k) in value" :key="k">
                <td><Icon class="mr-1" :icon="TARGET_ICONS[k]"/>{{TARGET_NAMES[k]}}</td>
                <td class="w-100">
                    <TagTypeEditor :tag-types="items" @update:tag-types="update($event, items, k)" :editable="editable"/>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.tag-block
    padding: 0 $spacing-2
    line-height: #{$element-height-small - 2px}
</style>
