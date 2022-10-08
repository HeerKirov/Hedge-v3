<script setup lang="ts">
import { ref } from "vue"
import { Tag } from "@/components/universal"
import { NumberInput } from "@/components/form"
import { useVirtualViewNavigation } from "@/components/data"

const navigation = useVirtualViewNavigation()

const editMode = ref(false)
const editValue = ref(1)

const edit = () => {
    editValue.value = navigation.state.itemOffset + 1
    editMode.value = true
}

const updateValue = (v: number) => {
    const offset = v - 1
    const navigateValue = offset < 0 ? 0 : navigation.state.itemTotal != undefined && offset >= navigation.state.itemTotal ? navigation.state.itemTotal - 1 : offset
    navigation.navigateTo(navigateValue)
    editValue.value = navigateValue + 1
}

const close = () => {
    editMode.value = false
}

</script>

<template>
    <div class="mx-2">
        <NumberInput v-if="editMode" size="small" width="half" :min="1" :value="editValue" auto-focus @update:value="updateValue" @blur="close"/>
        <Tag v-else-if="navigation.state.itemTotal" @click="edit">{{navigation.state.itemOffset + 1}}-{{navigation.state.itemOffset + navigation.state.itemLimit}}</Tag>
        <Tag v-else>0-0</Tag>
        <span class="mx-1">/</span>
        <Tag>{{navigation.state.itemTotal ?? 0}}</Tag>
    </div>
</template>
