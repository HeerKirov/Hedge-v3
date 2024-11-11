import process from "process"
import { createApplication } from "./application/application"
import { createParameters } from "./utils/parameters"

const parameters = createParameters(process.argv)

createApplication({
    channel: parameters.opt("--channel", () => import.meta.env.VITE_CHANNEL),
    debug: (parameters.contains("--debug-mode") || import.meta.env.VITE_DEBUG_MODE) ? {
        localDataPath: parameters.opt("--local-data-path", () => import.meta.env.VITE_LOCAL_DATA_PATH),
        frontendFromURL: parameters.opt("--frontend-from-url", () => import.meta.env.VITE_FRONTEND_FROM_URL),
        frontendFromFolder: parameters.opt("--frontend-from-folder", () => import.meta.env.VITE_FRONTEND_FROM_FOLDER),
        serverFromHost: parameters.opt("--server-from-host", () => import.meta.env.VITE_SERVER_FROM_HOST),
        serverFromFolder: parameters.opt("--server-from-folder", () => import.meta.env.VITE_SERVER_FROM_FOLDER),
        serverFromResource: parameters.opt("--server-from-resource", () => import.meta.env.VITE_SERVER_FROM_RESOURCE),
    } : undefined,
}).finally()
