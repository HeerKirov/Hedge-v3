
export type MenuDefinition = ScopeDefinition | MenuItemDefinition

export type MenuBadge = string | number | BadgeDefinition | BadgeDefinition[] | null | undefined

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
    badge?: MenuBadge
    submenu?: SubMenuItemDefinition[]
}

export interface SubMenuItemDefinition {
    id: string
    label: string
    badge?: MenuBadge
}

export interface BadgeDefinition {
    count: number
    type: "std" | "danger"
}