import DialogBox from "./DialogBox/DialogBox.vue"
import DialogFramework from "./DialogBox/DialogFramework.vue"
import Menu from "./SideMenu/Menu.vue"
import MenuScope from "./SideMenu/MenuScope.vue"
import MenuItem from "./SideMenu/MenuItem.vue"
import BrowserNavMenu from "./NavMenu/BrowserNavMenu.vue"
import RouterNavMenu from "./NavMenu/RouterNavMenu.vue"
import NavMenuItem from "./NavMenu/NavMenuItem.vue"
import NavMenuItems from "./NavMenu/NavMenuItems.vue"
import NavMenuItemsByHistory from "./NavMenu/NavMenuItemsByHistory.vue"
import ElementPopupMenu from "./ElementPopupMenu.vue"
import ElementPopupCallout from "./ElementPopupCallout.vue"
import PopupBox from "./PopupBox.vue"
import FormEditKit from "./FormEditKit.vue"

export { DialogBox, DialogFramework, ElementPopupMenu, ElementPopupCallout, PopupBox, FormEditKit }
export { Menu, MenuScope, MenuItem, BrowserNavMenu, RouterNavMenu, NavMenuItem, NavMenuItems, NavMenuItemsByHistory }
export type { MenuBadgeDefinition, MenuBadge, ContextMenuDefinition } from "./SideMenu/context"
export type { NavContextMenuDefinition } from "./NavMenu/context"

export interface Rect { x: number, y: number, width?: number, height?: number }

export type HorizontalPosition = "left" | "right"
export type VerticalPosition = "top" | "bottom"
export type Position = HorizontalPosition | VerticalPosition | `${HorizontalPosition}-${VerticalPosition}` | `${VerticalPosition}-${HorizontalPosition}`
