import { computed, ref, watch } from "vue"
import { useListeningEvent } from "@/utils/emitter"
import { onElementResize } from "@/utils/sensors"
import { useVirtualViewNavigationConsumer } from "./state"
import style from "./style.module.sass"

interface VirtualViewContextOptions {
    props: {
        padding(): Padding | number
        buffer(): number
    }
    onRefresh?(): void
}

export function useVirtualViewContext({ props, onRefresh }: VirtualViewContextOptions) {
    const { state, navigateEvent } = useVirtualViewNavigationConsumer()

    const { padding, paddingStyle } = getPaddingProperties(props.padding())

    const scrollDivRef = ref<HTMLElement>()

    //由底层向上提出的需求和参考值，包括内容滚动偏移量、包含缓冲区的实际高度、内容区域宽度和高度(不包括padding和buffer的内容实际大小)
    const propose = ref<ProposeData>({
        offsetTop: 0,
        offsetHeight: 0,
        scrollTop: 0,
        scrollHeight: 0,
        contentWidth: undefined,
        contentHeight: undefined
    })
    //由顶层向下计算的实际值，包括内容总高度、内容的偏移量和内容的实际高度。
    const actual = ref<ActualData>({
        totalHeight: undefined, top: 0, height: 0
    })

    const actualOffsetStyle = computed(() => {
        return ({
            height: `${actual.value.height.toFixed(3)}px`,
            paddingTop: `${actual.value.top.toFixed(3)}px`,
            paddingBottom: `${((actual.value.totalHeight ?? 0) - actual.value.top - actual.value.height).toFixed(3)}px`
        })
    })

    //底层事件: 发生滚动事件时重新计算propose offset
    const onScroll = (e: Event) => {
        //发生滚动时，触发offset重算
        if(actual.value.totalHeight != undefined) {
            const c = computeOffset(e.target as HTMLDivElement, actual.value.totalHeight, props.buffer(), padding)
            propose.value = {...propose.value, ...c}
        }
    }

    //底层事件: 区域大小改变时重新计算propose.
    //机制: 挂载时也会触发一次，作为初始化
    onElementResize(scrollDivRef, ({ width, height }) => {
        //显示区域大小发生变化时，修改contentHeight，并有可能触发offset重算
        //此外，挂载时，也会触发一次，相当于初始化
        if(height !== propose.value.contentHeight && scrollDivRef.value) {
            const c = computeOffset(scrollDivRef.value, actual.value.totalHeight, props.buffer(), padding)
            propose.value = {contentWidth: width, contentHeight: height, ...c}
        }else{
            propose.value = {...propose.value, contentWidth: width, contentHeight: height}
        }
    })

    //机制: 将totalHeight设为undefined触发重刷
    watch(() => actual.value.totalHeight, totalHeight => {
        //把totalHeight设置为undefined，会被认为是重设了内容，因此会把卷轴滚动回顶端，同时触发数据重刷
        if(totalHeight == undefined && scrollDivRef.value) {
            scrollDivRef.value.scrollTo({top: 0, behavior: "auto"})
            onRefresh?.()
            const c = computeOffset(scrollDivRef.value, totalHeight, props.buffer(), padding)
            propose.value = {...propose.value, ...c}
        }
    })

    //功能: 滚动到目标位置
    function scrollTo(scrollTop: number) {
        if(scrollDivRef.value) {
            scrollDivRef.value.scrollTo({top: scrollTop, behavior: "auto"})
        }
    }

    //功能: 更新view state的值。只需要提供itemOffset和itemLimit即可，scroll的值自动取出
    function setViewState(itemOffset: number, itemLimit: number, itemTotal: number | undefined) {
        if(propose.value.scrollTop !== state.scrollTop || propose.value.scrollHeight !== state.scrollHeight ||
            itemOffset !== state.itemOffset || itemLimit !== state.itemLimit || itemTotal !== state.itemTotal) {
            state.scrollTop = propose.value.scrollTop
            state.scrollHeight = propose.value.scrollHeight
            state.itemOffset = itemOffset
            state.itemLimit = itemLimit
            state.itemTotal = itemTotal
        }
    }

    //监听事件: 外部指定了新的item offset。需要返回此item的scrollTop(不需要考虑padding)和item height，便于自动调整实际位置。
    function watchViewNavigation(event: (itemOffset: number) => [number, number] | undefined) {
        useListeningEvent(navigateEvent, itemOffset => {
            if(itemOffset != undefined && propose.value.contentWidth != undefined && propose.value.contentHeight != undefined) {
                const res = event(itemOffset)
                if(res !== undefined) {
                    const [expectedScrollTop, expectedItemHeight] = res

                    const scrollTop = expectedScrollTop + padding.top
                    //进行判断计算，让跳转的目标scroll top经过最小滚动长度，而不是总是滚动到屏幕顶端
                    if(scrollTop < propose.value.scrollTop) {
                        scrollTo(scrollTop)
                    }else if(scrollTop + expectedItemHeight > propose.value.scrollTop + propose.value.contentHeight) {
                        scrollTo(scrollTop - propose.value.contentHeight + expectedItemHeight)
                    }
                    //else的情况则是target已在可视区域内，不需要调整位置
                }
            }
        })
    }

    const scrollDivStyle = computed(() => ({
        ...paddingStyle,
        "--scroll-content-height": actualOffsetStyle.value.height,
        "--scroll-content-padding-top": actualOffsetStyle.value.paddingTop,
        "--scroll-content-padding-bottom": actualOffsetStyle.value.paddingBottom,
    }))

    const bindDiv = () => ({
        ref: scrollDivRef,
        class: style.scrollList,
        style: scrollDivStyle.value,
        onScroll: onScroll
    })

    return {propose, actual, padding, bindDiv, scrollTo, setViewState, watchViewNavigation}
}

/**
 * 根据给出的padding值，计算最终的padding值，并获得padding style。
 */
function getPaddingProperties(originPaddingValue: Padding | number) {
    const padding = {
        top: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.top ?? 0,
        bottom: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.bottom ?? 0,
        left: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.left ?? 0,
        right: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.right ?? 0
    }
    const paddingStyle = {
        paddingTop: `${padding.top ?? 0}px`,
        paddingBottom: `${padding.bottom ?? 0}px`,
        paddingLeft: `${padding.left ?? 0}px`,
        paddingRight: `${padding.right ?? 0}px`,
    }

    return {padding, paddingStyle}
}

/**
 * 依据div实际属性、总高度、buffer和padding等属性，计算滚动区域相关属性。
 * scrollTop表示滚动条的偏移量，它实际上就是滚动区域的物理滚动量。
 * scrollHeight表示滚动条的总高度，实际上也就是总滚动区域高度减去视口高度。
 * offsetTop表示缓冲区范围内偏移量，是在缓冲区范围内的滚动量。
 * offsetHeight表示缓冲区范围内的总高度。这条需要计算，因为实际总高度并不一定等于视口+buffer，会受到滚动的影响小于此值。
 */
function computeOffset(div: HTMLElement, totalHeight: number | undefined, buffer: number, padding: Required<Padding>) {
    //有效内容区域高度。指window的视口高度加上buffer的高度。padding的高度已经包括在window高度内了
    const usableHeight = div.clientHeight + buffer * 2
    //设定的内容卷轴高度。如果没有设定，就假设为预定的显示高度
    const actualTotalHeight = totalHeight ?? usableHeight
    //总的buffer区域高度，指buffer+padding部分的高度
    const sumBufferTop = padding.top + buffer, sumBufferBottom = padding.bottom + buffer

    //结果: 滚动条的偏移量
    const scrollTop = div.scrollTop
    //结果: offsetTop。直接由scrollTop-总buffer高度获得。如果scrollTop<=buffer，表示端点还没有移出缓冲区，因此为0
    const offsetTop = scrollTop <= sumBufferTop ? 0 : scrollTop - sumBufferTop
    //根据scroll的定义，计算scrollBottom的值。它相当于从预定的内容区域bottom到内容卷轴区域bottom的距离
    const scrollBottom = actualTotalHeight - scrollTop - usableHeight + sumBufferTop + sumBufferBottom
    //根据同样的方法计算从下往上的偏移量高度
    const offsetBottom = scrollBottom <= sumBufferBottom ? 0 : scrollBottom - sumBufferBottom
    //结果：offsetHeight。根据totalHeight减去offset可获得
    const offsetHeight = actualTotalHeight - offsetTop - offsetBottom
    //结果: 滚动条的高度。相当于总内容高度减去可视区域中滚动过的部分(clientHeight-paddingTop)
    const scrollHeight = actualTotalHeight - div.clientHeight + padding.top

    return {offsetTop, offsetHeight, scrollHeight, scrollTop}
}

/**
 * 计划的padding属性值。
 */
export interface Padding {
    top?: number
    bottom?: number
    left?: number
    right?: number
}

/**
 * 期望的显示区域属性。
 */
export interface ProposeData {
    /**
     * 能访问到的数据区域的起始偏移量。
     */
    offsetTop: number,
    /**
     * 能访问到的数据区域的高度。根据这个和offsetTop，就能计算要显示的数据的offset和limit。
     */
    offsetHeight: number,
    /**
     * 滚动条滚动量。
     */
    scrollTop: number,
    /**
     * 滚动条总高度。根据这个和scrollTop，就能确定要展示给用户的滚动区域的范围，以及滚动区域的数据的offset和limit。
     */
    scrollHeight: number,
    /**
     * 视口实时宽度。
     */
    contentWidth?: number,
    /**
     * 视口实时高度。
     */
    contentHeight?: number
}

/**
 * 数据实际量。
 */
interface ActualData {
    /**
     * 根据所有数据，计算的总高度。包括那些底端未加载的数据。
     */
    totalHeight?: number,
    /**
     * 持有的数据区域的滚动高度。
     */
    top: number,
    /**
     * 持有的数据区域的高度。
     */
    height: number
}
