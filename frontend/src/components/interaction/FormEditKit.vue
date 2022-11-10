<script setup lang="ts">
import { ref } from "vue"
import { objects } from "@/utils/primitives"
import { onOutsideClick } from "@/utils/sensors"

// == Form Edit Kit 表单编辑器套件 ==
// 一个表单交互组件。平时使用display组件显示内容，双击(默认交互方式)后切换为edit组件以提供内容编辑。
// 此组件还会接管编辑状态的中途状态管理，只有在编辑确认完成时，才会将编辑后的内容通过update:value事件发送出去。
// display内容放入slot#default，edit内容放入slot#edit。

const props = withDefaults(defineProps<{
    /**
     * data value.
     */
    value: any
    /**
     * 编辑模式下使用的值。需要开启useEditValue。
     */
    editValue?: any
    /**
     * 在编辑模式下，使用与显示模式不同的另一个数据。同时，编辑器的回调数据也以编辑模式数据为准。
     */
    useEditValue?: boolean
    /**
     * 允许在显示模式下双击以进入编辑模式。
     */
    allowDoubleClick?: boolean
    /**
     * 允许在编辑模式下点击元素以外的部分以自动保存。
     */
    allowClickOutside?: boolean
    /**
     * 保存时执行此回调。此回调需要异步地返回一个布尔值，以告知此保存行为是否成功。
     * update:value事件则与此不同，它总是会被提交，且先于此回调提交。如果不在意保存结果，那么可以使用emit。
     */
    setValue?(newValue: any): Promise<boolean>
}>(), {
    allowDoubleClick: true,
    allowClickOutside: true
})

const emit = defineEmits<{
    (e: "update:value", v: any): void
}>()

const editMode = ref(false)
const editValue = ref<any>()

const edit = () => {
    if(!editMode.value) {
        editMode.value = true
        editValue.value = objects.deepCopy(props.useEditValue ? props.editValue : props.value)
    }
}

const setEditValue = (v: any) => {
    editValue.value = v
}

const save = async () => {
    if(editMode.value) {
        emit("update:value", editValue.value)
        if(props.setValue) {
            if(await props.setValue(editValue.value)) {
                editMode.value = false
            }
        }
    }
}

const doubleClick = () => {
    if(props.allowDoubleClick) {
        edit()
    }
}

const divRef = ref<HTMLElement>()

if(props.allowClickOutside) {
    onOutsideClick(divRef, () => {
        if(editMode.value) {
            save()
        }
    })
}

</script>

<template>
    <div ref="divRef" :class="{'is-cursor-text': !editMode}" @dblclick="doubleClick">
        <slot v-if="editMode" name="edit" :value="editValue" :setValue="setEditValue" :save="save"/>
        <slot v-else :value="value" :edit="edit"/>
    </div>
</template>

<style module lang="sass">

</style>
