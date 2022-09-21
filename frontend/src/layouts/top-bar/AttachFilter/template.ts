import { WsEventConditions } from "@/functions/ws-client"
import { HttpClient, Response } from "@/functions/http-client"
import { ListResult } from "@/functions/http-client/api/all"

/**
 * AttachFilter中的过滤器项的配置模板。所有的过滤器选项都会在总菜单中依次排列。
 */
export type AttachTemplate = Separator | OrderTemplate | CheckBoxTemplate | RadioTemplate | SearchTemplate

/**
 * 只是个菜单项分隔符。
 */
export interface Separator {
    type: "separator"
}

/**
 * 排序项。排序项要求必须指定默认值和默认方向，且总是要给出一个排序项，不能不选。
 */
export interface OrderTemplate {
    type: "order"
    /**
     * 所有的排序项可选项。
     */
    items: {label: string, value: string}[]
    /**
     * 默认值。
     */
    defaultValue: string
    /**
     * 默认方向。
     */
    defaultDirection: "ascending" | "descending"
}

/**
 * 复选项。它是单独的一项，且只会给field一个true的布尔值。
 */
export interface CheckBoxTemplate {
    type: "checkbox"
    /**
     * 此项的field名称。
     */
    field: string
    /**
     * 此项的显示标签。
     */
    label: string
    /**
     * 在按钮组中显示时的图标。
     */
    icon?: string
    /**
     * 在按钮组中显示时的颜色。
     */
    color?: string
}

/**
 * 单选选项组。它可以在一组选项中选出一个并赋值给field。
 */
export interface RadioTemplate {
    type: "radio"
    /**
     * 此项的field名称。
     */
    field: string
    /**
     * 此项的可选项列表。
     */
    options: TemplateOption[]
    /**
     * 在按钮组中时，是否显示标签。
     */
    showLabel?: boolean
}

/**
 * 搜索选择器项。此项的内容需要通过搜索得到，因此会打开搜索面板以供查询。
 */
export interface SearchTemplate {
    type: "search"
    /**
     * 此项的field名称。
     */
    field: string
    /**
     * 在菜单项显示的标签。
     */
    label: string
    /**
     * 是否开启多项选择。开启后，允许在当前项中选择多个结果，相应地，结果会返回数组。
     */
    multiSelection?: boolean
    /**
     * 查询所用的请求调用。
     */
    request(httpClient: HttpClient): (offset: number, limit: number, search: string) => Promise<Response<ListResult<unknown>>>
    /**
     * 可选方法：用一个map函数，将request的结果转换为选择项模板。若未指定此方法，则认为request的结果就是可用的选择项模板。
     */
    map?(item: unknown): TemplateOption
    /**
     * 传入此参数，使搜索面板支持历史记录。
     */
    history?: {
        /**
         * 通过此请求获得历史记录。
         */
        request(httpClient: HttpClient): (limit: number) => Promise<Response<ListResult<unknown>>>
        /**
         * 通过此请求发送历史记录。历史记录将在选定一个选择项时发送。
         */
        push(httpClient: HttpClient): (item: TemplateOption) => Promise<Response<null>>
        /**
         * 可选方法：用一个map函数，将request的结果转换为选择项模板。若未指定此方法，则认为request的结果就是可用的选择项模板。
         */
        map?(item: unknown): TemplateOption
        /**
         * 此事件通知历史记录的更新。
         */
        eventFilter?: WsEventConditions
    }
}

/**
 * 一个选项组的选择项。囊括了在菜单项中和在按钮组中的必备显示参数。
 */
export interface TemplateOption {
    /**
     * 显示标签。
     */
    label: string
    /**
     * 值。
     */
    value: string
    /**
     * 在按钮组中显示时的图标。
     */
    icon?: string
    /**
     * 在按钮组中显示时的颜色。
     */
    color?: string
}
