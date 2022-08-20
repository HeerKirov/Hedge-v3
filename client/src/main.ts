import { createApplication } from "./application/application"
import { createParameters } from "./utils/parameters"

const parameters = createParameters(process.argv)

createApplication({
    channel: parameters.opt("--channel"),
    debug: parameters.contains("--debug-mode") ? {
        localDataPath: parameters.opt("--local-data-path"),
        frontendFromURL: parameters.opt("--frontend-from-url"),
        frontendFromFolder: parameters.opt("--frontend-from-folder"),
        serverFromHost: parameters.opt("--server-from-host"),
        serverFromFolder: parameters.opt("--server-from-folder"),
        serverFromResource: parameters.opt("--server-from-resource")
    } : undefined,
}).finally()
