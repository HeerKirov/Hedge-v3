import { AllEvents } from "@/functions/ws-client/constants"

export const wsEventFilters = {
    app: {
        appStatus: {
            changed: () => (e: AllEvents) => e.eventType === "app/app-status/changed"
        }
    },
    entity: {
        annotation: {
            created: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/created" && (annotationId === undefined || e.annotationId === annotationId),
            updated: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/updated" && (annotationId === undefined || e.annotationId === annotationId),
            deleted: (annotationId?: number) => (e: AllEvents) => e.eventType === "entity/annotation/deleted" && (annotationId === undefined || e.annotationId === annotationId),
        }
    },
    setting: {

    }
} as const
