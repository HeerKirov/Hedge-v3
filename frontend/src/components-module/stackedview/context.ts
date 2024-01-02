import { ref, Ref } from "vue"
import { useRoute } from "vue-router"
import { AllSlice, ListIndexSlice, SliceOrPath } from "@/functions/fetch"
import { Illust } from "@/functions/http-client/api/illust"
import { windowManager } from "@/modules/window"
import { installation } from "@/utils/reactivity"

export type StackViewInfo = {
    type: "image"
    sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
    modifiedCallback?: (illustId: number) => void
}

export const [installStackedView, useStackedView] = installation(function (options?: {isRootView: boolean}) {
    const { isRootView = false } = options ?? {}

    const current = ref<StackViewInfo | null>(null)

    const operations = generateOperations(current)

    if(isRootView) {
        const route = useRoute()
        if(route.path === "/preview") {
            const q = route.query["imageIds"], q2 = route.query["focusIndex"]
            const imageIds = q && typeof q === "string" ? JSON.parse(window.atob(q)) as number[] : undefined
            const focusIndex = q2 && typeof q2 === "string" ? parseInt(q2) as number : undefined
            if(imageIds) operations.openImageView({imageIds, focusIndex})
        }
    }

    return {current, isRootView, ...operations}
})

function generateOperations(current: Ref<StackViewInfo | null>) {
    return {
        openImageView(slice: AllSlice<Illust, number> | ListIndexSlice<Illust, number> | number[] | {imageIds: number[], focusIndex?: number}, modifiedCallback?: (illustId: number) => void) {
            const sliceOrPath: SliceOrPath<Illust, number, AllSlice<Illust, number> | ListIndexSlice<Illust, number>, number[]>
                = slice instanceof Array ? {type: "path", path: slice}
                : (<AllSlice<Illust, number>>slice).type === "ALL" ? {type: "slice", slice: <AllSlice<Illust, number>>slice}
                : (<ListIndexSlice<Illust, number>>slice).type === "LIST" ? {type: "slice", slice: <AllSlice<Illust, number>>slice}
                : {type: "path", path: (<{imageIds: number[], focusIndex: number}>slice).imageIds, focusIndex: (<{imageIds: number[], focusIndex: number}>slice).focusIndex}
            current.value = {type: "image", sliceOrPath, modifiedCallback}
        },
        openImageViewInNewWindow(slice: number[] | {imageIds: number[], focusIndex?: number}) {
            const imageIds = slice instanceof Array ? slice : slice.imageIds
            const focusIndex = slice instanceof Array ? undefined : slice.focusIndex
            const encodedImageIds = encodeURIComponent(window.btoa(JSON.stringify(imageIds)))
            const encodedFocusIndex = focusIndex !== undefined ? encodeURIComponent(focusIndex) : ""
            windowManager.newWindow(`/preview?imageIds=${encodedImageIds}&focusIndex=${encodedFocusIndex}`)
        },
        closeView() {
            current.value = null
        }
    }
}
