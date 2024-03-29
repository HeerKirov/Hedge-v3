import DialogBox from "./DialogBox/DialogBox.vue"
import DialogFramework from "./DialogBox/DialogFramework.vue"
import Menu from "./Menu/Menu.vue"
import { MenuDefinition, MenuItemDefinition, SubMenuItemDefinition, BadgeDefinition, MenuBadge } from "./Menu/definition"
import ElementPopupMenu from "./ElementPopupMenu.vue"
import ElementPopupCallout from "./ElementPopupCallout.vue"
import PopupBox from "./PopupBox.vue"
import FormEditKit from "./FormEditKit.vue"

export { DialogBox, DialogFramework, Menu, ElementPopupMenu, ElementPopupCallout, PopupBox, FormEditKit }
export type { MenuDefinition, MenuItemDefinition, SubMenuItemDefinition, BadgeDefinition, MenuBadge }

export interface Rect { x: number, y: number, width?: number, height?: number }

export type HorizontalPosition = "left" | "right"
export type VerticalPosition = "top" | "bottom"
export type Position = HorizontalPosition | VerticalPosition | `${HorizontalPosition}-${VerticalPosition}` | `${VerticalPosition}-${HorizontalPosition}`
