import { defineComponent, watch } from "vue"

/**
 * 懒加载显示与缓存组件。
 * visible为false时不渲染slot，true时渲染，然而再次切换为false时不会销毁，而是提供一个slot参数使slot隐藏。
 */
export default defineComponent({
    props: {
        visible: {type: Boolean, default: true}
    },
    setup(props, { slots }) {
        let loaded = props.visible

        const stop = watch(() => props.visible, visible => {
            if(visible && !loaded) {
                loaded = true
                stop()
            }
        })

        return () => props.visible ? slots.default?.({ visible: true }) : loaded ? slots.default?.({ visible: false }) : null
    }
})
