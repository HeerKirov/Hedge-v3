import { HttpClient, Response, ListResult } from "@/functions/http-client"
import { NotFound } from "@/functions/http-client/exceptions"
import { Colors } from "@/constants/ui"

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
 * 排序项。提供包含value和direction的排序功能。
 * menu: 生成一组排序值和两个排序方向，可供选择。如果filter没有值，那么使用默认值。默认值是必须被指定的。
 * buttons: 排序项不会出现在按钮组中。
 * filter: 排序项会被组合成order字段，填充到结果中。排序项总是会生成值，即使选定的是默认值。
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
 * 复选项。提供只包含布尔值的复选功能。
 * menu: 它是单独的一项，可以被勾选。
 * buttons: 单独的一项，点击弹出的菜单也只有取消勾选一种选择。
 * filter: 被选定时其值为true，不选定则没有值(undefined)。
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
    color?: Colors
    /**
     * 在按钮组中时，是否显示标签。默认值是只显示icon。
     */
    modeInButtons?: ModeInButtons
    /**
     * 在按钮组中，显示的样式风格。
     */
    displayStyle?: DisplayStyle
}

/**
 * 单选选项组。它可以在一组选项中选出一个并赋值给field。
 * menu: 提供一组选项，可以勾选其中的一个。
 * buttons: 单独的一项，点击弹出的菜单也可以重新选择勾选项。重复选择已勾选项则取消勾选。
 * filter: 任意类型，依据option提供的value而定。
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
     * 在按钮组中时，是否显示标签。默认值是icon和label都显示。
     */
    modeInButtons?: ModeInButtons
    /**
     * 在按钮组中，显示的样式风格。
     */
    displayStyle?: DisplayStyle
}

/**
 * 搜索选择器项。此项的内容需要通过搜索得到，因此会打开搜索面板以供查询。
 * menu: 普通点击项，点击打开搜索面板。
 * buttons: 展示一或多个已选择的项。点击打开搜索面板，可以继续添加搜索项或清除已选择项。
 * filter: 任意类型，依据搜索函数生成的option的value而定。如果开启{multiSelection}，则是任意类型的数组any[]。
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
    query(httpClient: HttpClient): (offset: number, limit: number, search: string) => Promise<Response<ListResult<unknown>>>
    /**
     * 辅助查询函数，查询单个项。
     * 因为filter的值只包含value不包含整个TemplateOption，因此当缓存清空/value来自外部时，可能不包含value对应项的值。
     * 此时，需要利用此函数，从外部查询获得TemplateOption。
     * 而如果未指定此函数，当遇到未缓存的项时，会直接将value作为label展示。
     */
    queryOne?(httpClient: HttpClient): (value: any) => Promise<Response<unknown, NotFound>>
    /**
     * 可选方法：用一个map函数，将request的结果转换为选择项模板。若未指定此方法，则认为request的结果就是可用的选择项模板。
     */
    mapQuery?(item: unknown): TemplateOption
    /**
     * 可选方法：用一个map函数，将query one的结果转换为选择项模板。若未指定此方法，则认为query one的结果就是可用的选择项模板。
     */
    mapQueryOne?(item: unknown): TemplateOption
    /**
     * 传入此参数，使搜索面板支持历史记录。
     */
    history?: {
        /**
         * 通过此请求获得历史记录。
         */
        list(httpClient: HttpClient): (limit: number) => Promise<Response<unknown[]>>
        /**
         * 通过此请求发送历史记录。历史记录将在选定一个选择项时发送。
         */
        push(httpClient: HttpClient): (item: TemplateOption) => Promise<Response<null>>
        /**
         * 可选方法：用一个map函数，将request的结果转换为选择项模板。若未指定此方法，则认为request的结果就是可用的选择项模板。
         */
        mapList?(item: unknown): TemplateOption
    }
    /**
     * 在按钮组中时，是否显示标签。默认值是icon和label都显示。
     */
    modeInButtons?: ModeInButtons
    /**
     * 在按钮组中，显示的样式风格。
     */
    displayStyle?: DisplayStyle
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
    value: any
    /**
     * 在按钮组中显示时的图标。
     */
    icon?: string
    /**
     * 在按钮组中显示时的颜色。
     */
    color?: Colors
}

export type ModeInButtons = "icon-only" | "label-only" | "icon-and-label"
export type DisplayStyle = "normal" | "tag" | "annotation"
