<script setup lang="ts">
import { computed } from "vue"
import { Block, Button } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { Site } from "@/functions/http-client/api/setting"
import { usePostFetchHelper } from "@/functions/fetch"
import { useSettingSite } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import { SITE_ICONS } from "@/constants/site"

const props = defineProps<{
    builtins?: Site[]
}>()

const emit = defineEmits<{
    (e: "created", name: string): void
}>()

const fetch = usePostFetchHelper(client => client.setting.source.site.create)

const { data: sites } = useSettingSite()

const items = computedMutable(() => props.builtins !== undefined && sites.value !== undefined ? props.builtins.map(site => ({name: site.name, title: site.title, used: sites.value!.findIndex(i => i.name === site.name) >= 0, checked: false})) : [])

const anyChecked = computed(() => items.value.some(i => i.checked))

const toggle = (name: string) => {
    const item = items.value.find(i => i.name === name)
    if(item !== undefined) item.checked = !item.checked
}

const submit = async () => {
    const list = items.value.filter(i => i.checked && !i.used).map(i => i.name)
    for(const name of list) {
        await fetch({name})
    }
}

</script>

<template>
    <div class="flex multiline gap-1 column-3">
        <Block v-for="item in items" :key="item.name" class="relative flex-item has-text-centered pt-2 pb-1" mode="transparent" :color="item.checked ? 'primary' : undefined" @click="toggle(item.name)">
            <div v-if="!item.used" class="absolute top-left ml-1"><CheckBox :value="item.checked"/></div>
            <img :class="{[$style['site-icon']]: true, [$style.used]: item.used}" :src="SITE_ICONS[item.name]" alt="site icon"/>
            <p :class="item.used ? 'has-text-secondary' : item.checked ? 'has-text-primary' : undefined">
                <b>{{item.title}}</b>
                <span v-if="item.used" class="secondary-text ml-1">(已添加)</span>
            </p>
        </Block>
    </div>
    <Button class="w-100 mt-1" mode="filled" type="primary" icon="check" :disabled="!anyChecked" @click="submit">确认添加</Button>
</template>

<style module lang="sass">
.site-icon
    display: inline-block
    width: 20px
    height: 20px
    &.used
        filter: grayscale(100%)
</style>