<script setup lang="ts">
import { computed } from "vue"
import { SourceTag } from "@/functions/http-client/api/source-data"
import { SourceTagElement } from "@/components-business/element"
import { useSettingSite } from "@/services/setting"
import { usePopupMenu } from "@/modules/popup-menu"
import { writeClipboard } from "@/modules/others"

const props = defineProps<{
    site?: string
    value?: SourceTag[]
}>()

const { data: sites } = useSettingSite()

const groupedTags = computed(() => {
    if(props.value?.length) {
        const site = sites.value?.find(s => s.name === props.site)
        if(site?.availableTypes?.length) {
            return site.availableTypes.map(type => ({type, tags: props.value?.filter(st => st.type === type) ?? []})).filter(({ tags }) => tags.length > 0)
        }else{
            return [{type: "", tags: props.value}]
        }
    }else{
        return []
    }
})

const copySourceTagCode = ({ code }: SourceTag) => writeClipboard(code)
const copySourceTagName = ({ name }: SourceTag) => writeClipboard(name)

const menu = usePopupMenu<SourceTag>([
    {type: "normal", "label": "复制此标签的标识编码", click: copySourceTagCode},
    {type: "normal", "label": "复制此标签的显示名称", click: copySourceTagName},
])

</script>

<template>
    <div v-if="value?.length" class="my-2">
        <template v-for="{type, tags} in groupedTags" :key="type">
            <p v-if="!!type"><b>{{ type }}</b></p>
            <p v-for="tag in tags" :key="tag.code" class="mb-1">
                <SourceTagElement :value="tag" selectable @contextmenu="menu.popup(tag)"/>
            </p>
        </template>
    </div>
    <div v-else class="my-2">
        <i class="secondary-text">没有标签</i>
    </div>
</template>
