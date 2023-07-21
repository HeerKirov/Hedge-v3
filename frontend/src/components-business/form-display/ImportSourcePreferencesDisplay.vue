<script setup lang="ts">
import { computed } from "vue"
import { Block } from "@/components/universal"
import { SourceTagElement } from "@/components-business/element"
import { SourcePreference } from "@/functions/http-client/api/import"
import { usePopupMenu } from "@/modules/popup-menu"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    preference: SourcePreference | null
    site: string | null
}>()

const emit = defineEmits<{
    (e: "clear"): void
}>()

const { data: sites } = useSettingSite()

const additionalInfo = computed(() => {
    if(props.preference?.additionalInfo && props.site && sites.value) {
        const site = sites.value.find(s => s.name === props.site)
        if(site) {
            const ret: {field: string, label: string | null, value: string}[] = []
            for(const field of Object.keys(props.preference.additionalInfo)) {
                const value = props.preference.additionalInfo[field]
                const label = site.availableAdditionalInfo.find(a => a.field === field)?.label ?? null
                ret.push({field, label, value})
            }
            return ret
        }else{
            return []
        }
    }else{
        return []
    }
})

const menu = usePopupMenu([
    {type: "normal", label: "清除所有预设", click: () => emit("clear")}
])

const popup = () => {
    if(props.preference !== null) menu.popup()
}

</script>

<template>
    <Block v-if="preference !== null" class="p-1" @contextmenu="popup">
        <p v-if="preference.title !== null"><b class="mr-2">标题</b>{{ preference.title }}</p>
        <p v-if="preference.description !== null"><b class="mr-2">描述</b>{{ preference.description }}</p>
        <p v-for="t in preference.tags"><b class="mr-2">标签</b><SourceTagElement :value="{code: t.code, name: t.name ?? t.code, otherName: t.otherName, type: t.type}"/></p>
        <p v-for="b in preference.books"><b class="mr-2">画集</b>{{ b.title }}</p>
        <p v-for="r in preference.relations"><b class="mr-2">关联</b>{{ r }}</p>
        <p v-for="i in additionalInfo"><b class="mr-2">{{ i.label ?? i.field }}*</b>{{ i.value }}</p>
    </Block>
</template>
