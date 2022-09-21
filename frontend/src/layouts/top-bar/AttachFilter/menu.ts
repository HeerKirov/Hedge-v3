import { MenuItem } from "@/services/module/popup-menu"
import { AttachTemplate, RadioTemplate, CheckBoxTemplate, OrderTemplate, SearchTemplate } from "./template"

/**
 * 根据模板定义和当前值，生成菜单项。
 */
export function createMenuTemplate(templates: AttachTemplate[], filterValue: {[field: string]: any}, setValue: (field: string, value: any) => void, clear: () => void): MenuItem<undefined>[] {
    return templates.flatMap(t => {
        if(t.type === "separator") {
            return SEPARATOR_TEMPLATE
        }else if(t.type === "order") {
            return createOrderTemplate(t, filterValue["order"], v => setValue("order", v), filterValue["direction"], v => setValue("direction", v))
        }else if(t.type === "checkbox") {
            return createCheckBoxTemplate(t, filterValue[t.field], v => setValue(t.field, v))
        }else if(t.type === "radio"){
            return createRadioTemplate(t, filterValue[t.field], v => setValue(t.field, v))
        }else if(t.type === "search") {
            return createSearchTemplate(t)
        }else{
            return []
        }
    })
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

function createRadioTemplate(template: RadioTemplate, value: string, setValue: (v: string | undefined) => void): MenuItem<undefined>[] {
    return template.options.map(item => ({
        type: "checkbox",
        label: item.label,
        checked: value === item.value,
        click: value === item.value ? () => setValue(undefined) : () => setValue(item.value)
    }))
}

function createOrderTemplate(template: OrderTemplate,
                             order: string, setOrder: (v: string) => void,
                             direction: "ascending" | "descending", setDirection: (v: "ascending" | "descending") => void): MenuItem<undefined>[] {
    const orderItems: MenuItem<undefined>[] = template.items.map(item => ({
        type: "radio",
        label: item.label,
        checked: item.value === order,
        click: () => setOrder(item.value)
    }))
    const directionItems: MenuItem<undefined>[] = [
        {type: "radio", label: "升序", checked: direction === "ascending", click: () => setDirection("ascending")},
        {type: "radio", label: "降序", checked: direction === "descending", click: () => setDirection("descending")}
    ]
    return [...orderItems, {type: "separator"}, ...directionItems]
}

function createSearchTemplate(template: SearchTemplate): MenuItem<undefined>[] {
    return [{
        type: "normal",
        label: template.label,
        click: () => {
            //TODO
        }
    }]
}
