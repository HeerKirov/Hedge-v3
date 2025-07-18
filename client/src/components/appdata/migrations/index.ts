import { Migrate, migrate as migrateIt } from "@/utils/migrations"
import { AppData } from "../model"

const migrations: {[version: string]: Migrate<MigrateContext>} = {
    async "0.1.0"() {/*v0.1.0的占位符。只为将版本号升级到v0.1.0*/},
    async "0.9.0"(context) {
        const data = context.appData as any
        if(!data.loginOption.mode) {
            data.loginOption.mode = "local"
        }
        if(!data.storageOption) {
            data.storageOption = {
                cacheCleanIntervalDay: 7,
                fileWatchPaths: [],
                autoFileWatch: false,
                fileWatchMoveMode: true,
                fileWatchInitialize: true
            }
        }
    },
    async "0.13.0"(context) {
        const data = context.appData as any
        if(!data.behaviourOption) {
            data.behaviourOption = {
                customBrowserList: [],
                externalBrowser: null
            }
        }
    }
}

export interface MigrateContext {
    appData: AppData
}

export async function migrate(context: MigrateContext): Promise<MigrateContext & {changed: boolean}> {
    return await migrateIt(context, migrations, {
        set(context, v) {
            context.appData.version = v
        },
        get(context) {
            return context.appData.version
        }
    })
}
