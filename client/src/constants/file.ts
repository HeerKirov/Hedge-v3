import path from "path"

export const APP_FILE = {
    FRONTEND_FOLDER: "frontend",
    SERVER_ZIP: path.join("..", "server.zip")
}

export const DATA_FILE = {
    RESOURCE: {
        VERSION_LOCK: "version.lock",
        SERVER_FOLDER: "server",
        FRONTEND_FOLDER: path.join("server", "frontend"),
        SERVER_ORIGINAL_DIR: "image",
    },
    APPDATA: {
        CHANNEL_CONFIG: path.join("appdata", "channel.json"),
        CHANNEL_FOLDER: path.join("appdata", "channel"),
        CHANNEL: {
            CACHES_DIR: "caches",
            SERVER_DIR: "server",
            SERVER_PID: "PID",
            SERVER_LOG_DIR: "logs",
            CLIENT_DATA: "client.dat",
            LEVEL_DB: "leveldb"
        }
    }
}

export const RESOURCE_FILE = {
    SERVER: {
        BIN: path.join("bin", "hedge-v3-server.bat")
    },
    FRONTEND: {
        INDEX: "index.html"
    }
}
