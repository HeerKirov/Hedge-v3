<script setup lang="ts" generic="T">
import { onBeforeUnmount, ref } from "vue"
import { objects } from "@/utils/primitives"
import { onOutsideClick } from "@/utils/sensors"
import { toRef } from "@/utils/reactivity"

// == Form Edit Kit 表单编辑器套件 ==
// 一个表单交互组件。平时使用display组件显示内容，双击(默认交互方式)后切换为edit组件以提供内容编辑。
// 此组件还会接管编辑状态的中途状态管理，只有在编辑确认完成时，才会将编辑后的内容通过update:value事件发送出去。
// display内容放入slot#default，edit内容放入slot#edit。

const props = withDefaults(defineProps<{
    /**
     * data value.
     */
    value: T
    /**
     * 编辑模式下使用的值。需要开启useEditValue。
     */
    editValue?: any
    /**
     * 在编辑模式下，使用与显示模式不同的另一个数据。同时，编辑器的回调数据也以编辑模式数据为准。
     */
    useEditValue?: boolean
    /**
     * 是否开启编辑。默认显然是开启的，可以在有需要时禁用编辑。
     */
    editable?: boolean
    /**
     * 允许在显示模式下双击以进入编辑模式。
     */
    allowDoubleClick?: boolean
    /**
     * 允许在显示模式下单击以进入编辑模式。会覆盖双击的选项。
     */
    allowSingleClick?: boolean
    /**
     * 允许在编辑模式下点击元素以外的部分以自动保存。
     */
    allowClickOutside?: boolean
    /**
     * 允许在组件卸载时自动保存。
     */
    allowUnmountSave?: boolean
    /**
     * 只要获得数据提交，就保存。适用于那些只会有一次编辑行为，然后就会立即提交的场景。
     */
    saveOnceUpdated?: boolean
    /**
     * 保存时执行此回调。此回调需要异步地返回一个布尔值，以告知此保存行为是否成功。
     * update:value事件则与此不同，它总是会被提交，且先于此回调提交。如果不在意保存结果，那么可以使用emit。
     */
    setValue?(newValue: T): Promise<boolean>
}>(), {
    editable: true,
    allowDoubleClick: true,
    allowSingleClick: false,
    allowClickOutside: true,
    allowUnmountSave: true,
    saveOnceUpdated: false
})

const emit = defineEmits<{
    (e: "update:value", v: T): void
}>()

defineSlots<{
    default(props: {value: T, edit: typeof edit}): any
    edit(props: {value: T, setValue: typeof setEditValue, save: typeof save}): any
}>()

const displayValue = toRef(props, "value")
const editMode = ref(false)
const editValue = ref<T>()

const edit = () => {
    if(props.editable && !editMode.value) {
        editMode.value = true
        editValue.value = objects.deepCopy(props.useEditValue ? props.editValue : props.value)
    }
}

const setEditValue = (v: T) => {
    editValue.value = v
    if(props.saveOnceUpdated) save().finally()
}

const save = async () => {
    if(props.editable && editMode.value && editValue.value !== undefined) {
        emit("update:value", editValue.value)
        if(props.setValue) {
            if(await props.setValue(editValue.value)) {
                editMode.value = false
            }
        }else{
            editMode.value = false
        }
    }
}

const click = () => {
    if(props.allowSingleClick) {
        edit()
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
        if(props.editable && editMode.value) {
            save()
        }
    })
}

if(props.allowUnmountSave) {
    onBeforeUnmount(() => {
        if(props.editable && editMode.value) {
            save()
        }
    })
}

</script>

<template>
    <div ref="divRef" :class="{'is-cursor-text': editable && !editMode}" @click="click" @dblclick="doubleClick">
        <slot v-if="editMode" name="edit" :value="editValue!" :setValue="setEditValue" :save="save"/>
        <slot v-else :value="displayValue" :edit="edit"/>
    </div>
</template>
