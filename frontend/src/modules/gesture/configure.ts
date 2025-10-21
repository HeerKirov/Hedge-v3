import { BrowserViewContext } from "@/modules/browser"

export function executeGesture(gestureString: string, browserView: BrowserViewContext) {
    switch(gestureString) {
        case "L":
            browserView.browserTabs.prevTab()
            break
        case "R":
            browserView.browserTabs.nextTab()
            break
        case "UL":
            browserView.browserTabs.routeBack()
            break
        case "UR":
            browserView.browserTabs.routeForward()
            break
        case "DR":
            browserView.browserTabs.closeTab()
            break
        case "LU":
            browserView.closedTabs.resume()
            break
        case "RU":
            browserView.browserTabs.newTab()
            break
    }
}