import { ComponentPublicInstance, defineComponent, PropType, Ref } from "vue"
import { MenuItem, useElementPopupMenu } from "@/modules/popup-menu"
import { toRef } from "@/utils/reactivity"

/**
 * 弹出式菜单嵌套层级。
 * 将useElementMenu组件化了。
 */
export default defineComponent({
    props: {
        items: {type: null as any as PropType<MenuItem<undefined>[] | (() => MenuItem<undefined>[])>, default: []},
        position: String as PropType<"top" | "bottom">,
        align: String as PropType<"left" | "center" | "right">,
        offsetX: Number,
        offsetY: Number
    },
    setup(props, { slots }) {
        const items = typeof props.items === "function" ? props.items : toRef(props, "items") as Ref<MenuItem<undefined>[]>
        const options = {position: props.position, align: props.align, offsetX: props.offsetX, offsetY: props.offsetY}
        const { popup, element } = useElementPopupMenu(items, options)
        const setEl = (el: ComponentPublicInstance | HTMLElement | null | undefined) => {
            if(el instanceof HTMLElement) {
                element.value = el
            }else if(el === null || el === undefined) {
                element.value = undefined
            }else{
                element.value = (el as any).el
            }
        }

        return () => slots.default?.({ popup, element, setEl })
    }
})
