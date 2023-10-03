import { computed, isReactive, isRef, ref, Ref, unref, watch, watchEffect } from "vue"
import { remoteIpcClient, MenuTemplate } from "@/functions/ipc-client"

//== popup menu定义解构 ==

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


//== 基础popup menu的实现，直接提供「打开popup menu」的方法 ==

interface PopupOptions<P> {
    items: MenuItem<P>[]
    scale?: PopupScale
    args?: P
}

interface PopupScale {
    x: number
    y: number
}

/**
 * 打开一个popup menu。
 */
export function popupMenu(menuItems: MenuItem<undefined>[]): void

/**
 * 打开一个popup menu，并提供一个参数作为所有事件的参数。
 * @param obj
 * @param menuItems
 */
export function popupMenu<P = undefined>(obj: P, menuItems: MenuItem<P>[]): void

/**
 * 提供更复杂的popup menu启动参数。
 * @param options
 */
export function popupMenu<P = undefined>(options: PopupOptions<P>): void

export function popupMenu<P>(a: MenuItem<P>[] | PopupOptions<P> | P, b?: MenuItem<P>[]) {
    if(b !== undefined) {
        popupNativeMenu(b, undefined, a as P)
    }else if(a instanceof Array) {
        popupNativeMenu(a, undefined, undefined)
    }else{
        popupNativeMenu((a as PopupOptions<P>).items, (a as PopupOptions<P>).scale, (a as PopupOptions<P>).args)
    }
}

function popupNativeMenu<P>(items: MenuItem<P>[], scale: PopupScale | undefined, obj: P | undefined) {
    let localArgument: P | undefined = obj

    function mapMenuItems(menuItems: MenuItem<P>[]): MenuTemplate[] {
        return menuItems.map(item => {
            if(item.type === "normal" || item.type === "checkbox" || item.type === "radio") {
                return {
                    ...item,
                    click() {
                        item.click?.(localArgument!)
                        localArgument = undefined
                    }
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

    const popupOptions = {
        items: mapMenuItems(items),
        x: scale?.x,
        y: scale?.y
    }

    remoteIpcClient.remote.menu.popup(popupOptions)
}

//== 一级包装的popup menu: 提供根据响应式变化生成的菜单 ==

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
    if(typeof menuItems === "function") {
        return {
            popup(args: P, scale?: PopupScale) {
                popupMenu({items: menuItems(), scale, args})
            }
        }
    }else if(isReactive(menuItems) || isRef(menuItems)) {
        return {
            popup(args: P, scale?: PopupScale) {
                popupMenu({items: unref(menuItems), scale, args})
            }
        }
    }else{
        const items = unref(menuItems)
        return {
            popup(args: P, scale?: PopupScale) {
                popupMenu({items, scale, args})
            }
        }
    }
}

//== 一级包装的popup menu: 提供根据popup参数动态生成的菜单 ==

/**
 * 创建composition API模式的菜单，此菜单使用参数，且根据点击参数的不同，生成不同的菜单。
 * @param generator
 */
export function useDynamicPopupMenu<P>(generator: (value: P) => (MenuItem<P> | null | undefined)[]) {
    function popup(args: P, scale?: PopupScale) {
        const items = generator(args).filter(item => item != null) as MenuItem<P>[]
        popupMenu({items, scale, args})
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
