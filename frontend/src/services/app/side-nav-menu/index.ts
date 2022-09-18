import { SideNavMenu, GeneratedNavMenuItem, NavSubMenuItem, NavItemSetup, installNavMenu, useNavMenu } from "./side-nav-menu"
import { NavHistory, installNavHistory, useNavHistory } from "./side-nav-history"
import { setupItemByNavHistory, setupItemByRef, setupSubItemByNavHistory } from "./some-setups"

export { installNavMenu, useNavMenu }
export { installNavHistory, useNavHistory }
export { setupItemByRef, setupItemByNavHistory, setupSubItemByNavHistory }
export type { GeneratedNavMenuItem, NavSubMenuItem, SideNavMenu, NavItemSetup }
export type { NavHistory }
