import { isReactive, isRef, onBeforeUnmount, onMounted, ref, Ref, unref } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { MenuTemplateInIpc } from "@/functions/ipc-client/constants"

//== popup menu定义结构 ==

export type MenuItem<P> = ButtonMenuItem<P> | CheckboxMenuItem<P> | RadioMenuItem<P> | SeparatorMenuItem | SubMenuItem<P>

interface SeparatorMenuItem {
    type: "separator"
}
interface ButtonMenuItem<P> {
    type: "normal"
    label: string
    enabled?: boolean
    click?: ClickFunction<P>
}
interface CheckboxMenuItem<P> {
    type: "checkbox"
    label: string
    enabled?: boolean
    checked?: boolean
    click?: ClickFunction<P>
}
interface RadioMenuItem<P> {
    type: "radio"
    label: string
    enabled?: boolean
    checked?: boolean
    click?: ClickFunction<P>
}
interface SubMenuItem<P> {
    type: "submenu"
    label: string
    enabled?: boolean
    submenu: MenuItem<P>[]
}
type ClickFunction<T> = (args: T) => void


//== 基础popup menu的实现 ==

interface PopupScale {
    x: number
    y: number
}

function useNativePopupMenu<P>() {
    const popupRequests = new Map<number, (eventId: number) => void>()
    
    function listener(event: {requestId: number, eventId: number}) {
        //FUTURE: 现阶段接收的事件会下发至所有的useNativePopupMenu，由每个use自己对requestId进行筛选。后续可以进行优化，固定每个use的reuquestId，并进行固定分发
        popupRequests.get(event.requestId)?.(event.eventId)
        popupRequests.clear()
    }

    function createMenuTemplate(item: MenuItem<P>[], obj: P | undefined): [MenuTemplateInIpc[], (() => void)[]] {
        let localArgument: P | undefined = obj
        const eventMap: (() => void)[] = []

        function mapMenuItems(menuItems: MenuItem<P>[]): MenuTemplateInIpc[] {
            return menuItems.map(item => {
                if(item.type === "normal" || item.type === "checkbox" || item.type === "radio") {
                    const { click, ...leave } = item
                    eventMap.push(() => {
                        click?.(localArgument!)
                        localArgument = undefined
                        eventMap.splice(0, eventMap.length)
                    })
                    return {
                        ...leave,
                        eventId: eventMap.length - 1
                    }
                }else if(item.type === "submenu") {
                    return {
                        ...item,
                        submenu: mapMenuItems(item.submenu)
                    }
                }else{
                    return item
                }
            })
        }

        return [mapMenuItems(item), eventMap]
    }


    onMounted(() => remoteIpcClient.remote.menu.popupResponseEvent.addEventListener(listener))
    onBeforeUnmount(() => {
        remoteIpcClient.remote.menu.popupResponseEvent.removeEventListener(listener)
        popupRequests.clear()
    })

    return {
        popup(items: MenuItem<P>[], scale: PopupScale | undefined, obj: P | undefined) {
            const [menuItems, eventList] = createMenuTemplate(items, obj)
            const requestId = remoteIpcClient.remote.menu.popup({items: menuItems, x: scale?.x, y: scale?.y})
            popupRequests.set(requestId, (eventId: number) => eventList[eventId]?.())
        }
    }
}

//== 一级包装的popup menu: 提供根据响应式变化生成的菜单 ==

interface DynamicAttachParameter extends Partial<PopupScale> {
    alt?: boolean
}

/**
 * 创建composition API模式的菜单，且不使用参数。在点击时，根据响应式内容或函数返回，生成菜单。
 * @param items 允许传入Ref, Reactive, 普通变量, 或一个函数
 */
export function usePopupMenu(items: MenuItem<undefined>[] | Ref<MenuItem<undefined>[]> | (() => MenuItem<undefined>[])): { popup(args?: undefined, scale?: PopupScale): void }

/**
 * 创建composition API模式的菜单，且使用参数。在点击时，根据响应式内容或函数返回，生成菜单。
 * @param items 允许传入Ref, Reactive, 普通变量, 或一个函数
 */
export function usePopupMenu<P>(items: MenuItem<P>[] | Ref<MenuItem<P>[]> | (() => MenuItem<P>[])): { popup(args: P, scale?: PopupScale): void }

export function usePopupMenu<P = undefined>(menuItems: MenuItem<P>[] | Ref<MenuItem<P>[]> | (() => MenuItem<P>[])) {
    const native = useNativePopupMenu<P>()

    if(typeof menuItems === "function") {
        return {
            popup(args: P, scale?: PopupScale) {
                native.popup(menuItems(), scale, args)
            }
        }
    }else if(isReactive(menuItems) || isRef(menuItems)) {
        return {
            popup(args: P, scale?: PopupScale) {
                native.popup(unref(menuItems), scale, args)
            }
        }
    }else{
        const items = unref(menuItems)
        return {
            popup(args: P, scale?: PopupScale) {
                native.popup(items, scale, args)
            }
        }
    }
}

//== 一级包装的popup menu: 提供根据popup参数动态生成的菜单 ==

/**
 * 创建composition API模式的菜单，此菜单使用参数，且根据点击参数的不同，生成不同的菜单。
 * @param generator
 */
export function useDynamicPopupMenu<P>(generator: (value: P, param: DynamicAttachParameter) => (MenuItem<P> | null | undefined)[]) {
    const native = useNativePopupMenu<P>()

    function popup(args: P, param?: DynamicAttachParameter) {
        const items = generator(args, param ?? {}).filter(item => item != null) as MenuItem<P>[]
        const scale = param?.x !== undefined && param?.y !== undefined ? {x: param.x, y: param.y} : undefined
        native.popup(items, scale, args)
    }

    return {popup}
}

//== 二级包装的popup menu: 提供元素定位 ==

export interface ElementPopupMenuOptions {
    position?: "top" | "bottom"
    align?: "left" | "center" | "right"
    offsetX?: number
    offsetY?: number
}

/**
 * 创建提供元素定位的popup menu。其打开位置根据ref element的位置决定。
 */
export function useElementPopupMenu(items: MenuItem<undefined>[] | Ref<MenuItem<undefined>[]> | (() => MenuItem<undefined>[]), options?: ElementPopupMenuOptions): {
    element: Ref<Element | undefined>
    popup(): void
}

/**
 * 创建提供元素定位的popup menu。其打开位置根据ref element的位置决定。
 */
export function useElementPopupMenu<P>(items: MenuItem<P>[] | Ref<MenuItem<P>[]> | (() => MenuItem<P>[]), options?: ElementPopupMenuOptions): {
    element: Ref<Element | undefined>
    popup(args: P): void
}

export function useElementPopupMenu<P = undefined>(items: MenuItem<P>[] | Ref<MenuItem<P>[]> | (() => MenuItem<P>[]), options?: ElementPopupMenuOptions) {
    const element = ref<Element>()

    const menu = usePopupMenu(items)

    const popup = function popup(args?: P) {
        const rect = element.value?.getBoundingClientRect?.()
        if(rect) {
            const x = Math.floor(rect.left) + (options?.align === "center" ? Math.floor(rect.width / 2) : options?.align === "right" ? rect.width : 0) + (options?.offsetX ?? 0)
            const y = Math.floor(rect.top) + (options?.position === "bottom" ? Math.floor(rect.height) : 0) + (options?.offsetY ?? 0)
            menu.popup(args!, {x, y})
        }else{
            menu.popup(args!, undefined)
        }
    }

    return {element, popup}
}
