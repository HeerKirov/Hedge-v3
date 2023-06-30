
export type MenuDefinition = ScopeDefinition | MenuItemDefinition

interface ScopeDefinition {
    type: "scope"
    id: string
    label: string
}

export interface MenuItemDefinition {
    type: "menu"
    id: string
    icon: string
    label: string
    badge?: number | null | undefined
    submenu?: SubMenuItemDefinition[]
}

export interface SubMenuItemDefinition {
    id: string
    label: string
}
