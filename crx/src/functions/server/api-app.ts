import { createRequest } from "./impl"

export const app = {
    health: createRequest<AppHealth, never>("/app/health")
}

export interface AppHealth {
    status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY"
}