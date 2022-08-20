import { Ref, ref, watch } from "vue"

/**
 * 提供属性更改的标记功能，主要用处是在表单中，标记一个绑定变量是否是修改过的，并提供对单个属性的保存功能。
 * 例如: 对每个表单组件，使用一组此功能实例。之后，对此表单组件作出修改时，可以标记出“已修改”并显示保存按钮，点击按钮时，才将修改保存回原属性。
 * @param value 接受这个属性变量。
 * @return [value, sot, save] 直接使用value作为表单绑定变量；sot作为修改标记；save作为提交修改方法
 */
export function usePropertySot<T>(value: Ref<T>): [Ref<T>, Ref<boolean>, () => void] {
    const proxyValue = <Ref<T>>ref(value.value)
    const sot = ref(false)

    const save = () => {
        if(sot.value) {
            value.value = proxyValue.value
            sot.value = false
        }
    }

    watch(value, n => {
        value.value = n
        sot.value = false
    }, {deep: true})

    return [proxyValue, sot, save]
}
