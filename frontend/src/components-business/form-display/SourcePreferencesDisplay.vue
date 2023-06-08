<script setup lang="ts">
import { Block, Icon } from "@/components/universal"
import { Preference } from "@/functions/http-client/api/import"
import { usePopupMenu } from "@/modules/popup-menu"

const props = defineProps<{
    collectionId: string | number | null
    bookIds: number[]
    preference: Preference
}>()

const emit = defineEmits<{
    (e: "clear"): void
}>()

const menu = usePopupMenu([
    {type: "normal", label: "清除所有预设", click: () => emit("clear")}
])

const popup = () => {
    if(props.collectionId !== null || props.bookIds.length > 0 || props.preference.cloneImage !== null) menu.popup()
}

</script>

<template>
    <Block v-if="collectionId !== null || bookIds.length > 0 || preference.cloneImage !== null" class="p-1" @contextmenu="popup">
        <p><b class="mr-2">预设集合</b><Icon icon="id-card" class="mr-1"/>{{collectionId}}</p>
        <p v-for="bookId in bookIds"><b class="mr-2">预设画集</b><Icon icon="clone" class="mr-1"/>{{bookId}}</p>
        <p v-if="preference.cloneImage">
            <b>已设置属性克隆</b><i v-if="preference.cloneImage.deleteFrom">(删除源)</i>
            <Icon :icon="preference.cloneImage.deleteFrom ? 'scissors' : 'copy'" class="mr-1 ml-2"/>{{preference.cloneImage.fromImageId}}
        </p>
    </Block>
</template>
