import { createPathRequest, createRequest } from "./impl"
import { NotFound } from "./exceptions"

export const app = {
    health: createRequest<AppHealth, never>("/app/health"),
    archiveFiles: createPathRequest<string, string, NotFound>(path => `/archives/${path}`, "GET"),
}

export interface AppHealth {
    status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY"
}