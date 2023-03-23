<script lang="ts">
import { computed, defineComponent, h, TransitionGroup, useCssModule } from "vue"
import { useViewStackContext } from "./context"
import { StackViewInfo } from "./definition"
import ViewContainer from "./ViewContainer.vue"

export default defineComponent({
    setup() {
        const { stacks } = useViewStackContext()

        const style = useCssModule()

        const splitStacks = computed<{pages: StackViewInfo[], top: StackViewInfo} | null>(() => {
            if(stacks.value.length <= 0) {
                return null
            }else{
                const pages = stacks.value.slice(0, stacks.value.length - 1)
                const top = stacks.value[stacks.value.length - 1]
                return {pages, top}
            }
        })

        // 此组件没有使用vue setup SFC，而是使用h函数直接编写
        // 是因为这里涉及一个写法，期望上面与下面的ViewContainer都能按key等价，这样就能保持同一层的容器不变，挪动background的位置
        // 然而template并不太好实现这个方案，反而在JSX模式下，同一层的key会被统一处理，能够轻松实现
        return () => h(TransitionGroup, {
            enterFromClass: style['transition-enter-from'],
            leaveToClass: style['transition-leave-to'],
            enterActiveClass: style['transition-enter-active'],
            leaveActiveClass: style['transition-leave-active']
        }, () => splitStacks.value !== null ? [
            ...splitStacks.value.pages.map((page, i) => h(ViewContainer, {
                key: i,
                class: style.container,
                stackIndex: i,
                stackViewInfo: page,
                hidden: true
            })),
            h("div", {key: `background-cover-${splitStacks.value.pages.length}`, class: style['background-cover']}),
            h(ViewContainer, {
                key: splitStacks.value.pages.length,
                class: style.container,
                stackIndex: splitStacks.value.pages.length,
                stackViewInfo: splitStacks.value.top
            })
        ] : [])
    }
})

</script>

<style module lang="sass">
.container
    &.transition-enter-from
        transform: translateY(50vh)
    &.transition-leave-to
        transform: translateY(100vh)
    &.transition-enter-active
        transition: transform 0.15s ease-out
        backface-visibility: hidden
    &.transition-leave-active
        transition: transform 0.3s
        backface-visibility: hidden

.background-cover
    position: absolute
    left: 0
    top: 0
    width: 100vw
    height: 100vh
    background-color: rgba(0, 0, 0, 0.5)

    &.transition-enter-from,
    &.transition-leave-to
        opacity: 0
    &.transition-enter-active
        transition: opacity 0.15s
        backface-visibility: hidden
    &.transition-leave-active
        transition: opacity 0.3s
        backface-visibility: hidden
</style>
