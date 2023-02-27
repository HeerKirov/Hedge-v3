import { LocalDate } from "@/utils/datetime"

/**
 * 定义此组件可用的导航地址，以及这些导航地址需要的参数。
 * app中没有任何复杂地址，所以所有的导航参数都是可选的。
 */
export interface RouteParameter {
    "MainIllust": RouteTemplate<{}, { topicName?: string, authorName?: string, tagName?: string, source?: {site: string, id: number} }>
    "MainAlbum": RouteTemplate<{}, { topicName?: string, authorName?: string, tagName?: string }>
    "MainTopic": RouteTemplate<{ detail: number }, undefined>
    "MainAuthor": RouteTemplate<{ detail: number }, undefined>
    "MainTag": RouteTemplate<{ detail: number }, undefined>
    "MainAnnotation": RouteTemplate<{ detail: number }, undefined>
    "MainPartition": RouteTemplate<{ detail: LocalDate }, undefined>
    "MainFolder": RouteTemplate<{ detail: number }, undefined>
    "Preview": RouteTemplate<{}, { type: "image", imageIds: number[], currentIndex?: number } | { type: "collection", collectionId: number} | { type: "album", albumId: number }>
}

export type RouteName = keyof RouteParameter

interface RouteTemplate<Q extends Object, P extends Object | undefined> { query: Q, params: P }
