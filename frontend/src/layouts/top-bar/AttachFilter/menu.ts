import { MenuItem } from "@/services/module/popup-menu"
import { AttachTemplate, RadioTemplate, CheckBoxTemplate, OrderTemplate, SearchTemplate } from "./template"
import { generateOrder, parseOrder } from "./utils"

/**
 * 根据模板定义和当前值，生成菜单项。
 */
export function createMenuTemplate(templates: AttachTemplate[],
                                   filterValue: {[field: string]: any},
                                   setValue: (field: string, value: any) => void,
                                   activePicker: (template: SearchTemplate) => void,
                                   clear: () => void): MenuItem<undefined>[] {
    return templates.flatMap(t => {
        if(t.type === "separator") {
            return SEPARATOR_TEMPLATE
        }else if(t.type === "order") {
            return createOrderTemplate(t, filterValue["order"], v => setValue("order", v))
        }else if(t.type === "checkbox") {
            return createCheckBoxTemplate(t, filterValue[t.field], v => setValue(t.field, v))
        }else if(t.type === "radio"){
            return createRadioTemplate(t, filterValue[t.field], v => setValue(t.field, v))
        }else if(t.type === "search") {
            return createSearchTemplate(t, activePicker)
        }else{
            return []
        }
    }).concat(
        {type: "separator"}, 
        {type: "normal", label: "恢复默认值", click: clear}
    )
}

const SEPARATOR_TEMPLATE: MenuItem<undefined> = {type: "separator"}

function createCheckBoxTemplate(template: CheckBoxTemplate, value: boolean, setValue: (v: boolean) => void): MenuItem<undefined>[] {
    return [{
        type: "checkbox",
        label: template.label,
        checked: value,
        click: () => setValue(!value)
    }]
}

function createRadioTemplate(template: RadioTemplate, value: any | undefined, setValue: (v: any | undefined) => void): MenuItem<undefined>[] {
    return template.options.map(item => ({
        type: "checkbox",
        label: item.label,
        checked: value === item.value,
        click: value === item.value ? () => setValue(undefined) : () => setValue(item.value)
    }))
}

function createOrderTemplate(template: OrderTemplate, order: string | undefined, setOrder: (v: string) => void): MenuItem<undefined>[] {
    const [orderValue, orderDirection] = order ? parseOrder(order) : [template.defaultValue, template.defaultDirection]

    const orderItems: MenuItem<undefined>[] = template.items.map(item => ({
        type: "radio",
        label: item.label,
        checked: item.value === orderValue,
        click: () => setOrder(generateOrder(item.value, orderDirection))
    }))
    const directionItems: MenuItem<undefined>[] = [
        {type: "radio", label: "升序", checked: orderDirection === "ascending", click: () => setOrder(generateOrder(orderValue, "ascending"))},
        {type: "radio", label: "降序", checked: orderDirection === "descending", click: () => setOrder(generateOrder(orderValue, "descending"))}
    ]
    return [...orderItems, {type: "separator"}, ...directionItems]
}

function createSearchTemplate(template: SearchTemplate, activateSearchPicker: (template: SearchTemplate) => void): MenuItem<undefined>[] {
    return [{
        type: "normal",
        label: template.label,
        click: () => activateSearchPicker(template)
    }]
}
