import { useMemo } from "react"
import { WEBSITES } from "@/functions/sites"

export function useSupportedSite(tabURL: string | null | undefined) {
    return useMemo(() => getSupportedSite(tabURL), [tabURL])
}

export function ifArtworksPage(urlString: string | null | undefined) {
    return getSupportedSite(urlString).supportType === "artworks"
}

export function getSupportedSite(urlString: string | null | undefined): {supportType: "artworks" | "page" | null, siteName: string} | {supportType: null, siteName: null} {
    if(urlString) {
        const url = new URL(urlString)
        for(const siteName in WEBSITES) {
            const site = WEBSITES[siteName]
            if(site.host.some(host => typeof host === "string" ? host === url.host : host.test(url.host))) {
                if(site.artworksPages && site.artworksPages.some(i => i.test(url.pathname))) {
                    return {supportType: "artworks", siteName}
                }else if(site.activeTabPages && site.activeTabPages.some(i => i.test(url.pathname))) {
                    return {supportType: "page", siteName}
                }
            }
        }
    }
    return {supportType: null, siteName: null}
}