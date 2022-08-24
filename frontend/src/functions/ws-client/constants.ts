import { ServerServiceStatus } from "@/functions/ipc-client"
import { MetaType } from "@/functions/http-client/api/all"

export interface BaseWsEvent<ET extends string> {
    eventType: ET
}

export type AllEventTypes = AllEvents["eventType"]

export type AllEvents
    = AppEvents
    | EntityEvents

type AppEvents = AppStatusChanged

type EntityEvents
    = AnnotationCreated
    | AnnotationUpdated
    | AnnotationDeleted

//== App相关的系统通知 ==

export interface AppStatusChanged extends BaseWsEvent<"app/app-status/changed"> {
    status: ServerServiceStatus
}

//== 实体类相关的变更通知 ==

export interface AnnotationCreated extends BaseWsEvent<"entity/annotation/created"> {
    annotationId: number
    metaType: MetaType
}

export interface AnnotationUpdated extends BaseWsEvent<"entity/annotation/updated"> {
    annotationId: number
    metaType: MetaType
}

export interface AnnotationDeleted extends BaseWsEvent<"entity/annotation/deleted"> {
    annotationId: number
    metaType: MetaType
}
