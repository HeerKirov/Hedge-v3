import path from "path"
import { arrays } from "../../utils/types"
import { unzip, rename, chmod, rmdir, readFile, writeFile } from "../../utils/fs"
import { DATA_FILE, APP_FILE, RESOURCE_FILE } from "../../constants/file"
import { ClientException } from "../../exceptions"
import { Version, VersionLock, VersionStatus, VersionStatusSet } from "./model"

/**
 * 记录系统中资源组件的最新版本号。必须更新此记录值至最新，才能正确触发版本更新。
 * TODO 有没有什么办法，在编译时从gradle项目取版本号？包括migrate项目也需要这个
 */
const VERSION = {
    server: "0.1.0"
}

/**
 * 对app程序资源进行管理的管理器。
 * 程序资源指的是server资源。平时打包在App资源包下，但运行时需要解压缩并放到userData目录下。
 * 同时，这种解压缩还涉及到app版本更新的问题，因此需要一个组件专门去管理。
 */
export interface ResourceManager {
    /**
     * 在app的后初始化环节调用。异步地读取资源的当前状况，将状态记录下来，以供后续策略调用。
     */
    load(): Promise<void>
    /**
     * 在资源不是最新的情况下，将资源更新至最新。
     */
    update(): Promise<void>
    /**
     * 查看资源的当前状态。
     * - NOT_INIT: server资源没有初始化。
     * - NEED_UPDATE: server任意资源需要更新。
     * - UPDATING: 资源更新中。
     * - LATEST: server处于最新。
     */
    status(): ResourceStatus
}

export enum ResourceStatus {
    UNKNOWN = "UNKNOWN",
    NOT_INIT = "NOT_INIT",
    NEED_UPDATE = "NEED_UPDATE",
    UPDATING = "UPDATING",
    LATEST = "LATEST"
}

/**
 * 构造参数。
 */
export interface ResourceManagerOptions {
    /**
     * app的数据目录。
     */
    userDataPath: string
    /**
     * app的资源目录，指代/Resource/app目录，在此目录下寻找资源。
     */
    appPath: string
    /**
     * 在调试模式下运行，默认将禁用资源管理，除非指定其他选项，对资源管理进行调试。
     */
    debug?: {
        /**
         * 使用此位置的压缩包提供的后台资源，进行资源组件的调试。
         */
        serverFromResource?: string
    }
}

export function createResourceManager(options: ResourceManagerOptions): ResourceManager {
    if(options.debug && !options.debug.serverFromResource) {
        //禁用资源管理
        console.log("[ResourceManager] Resource manager is disabled because of develop mode.")
        return createForbiddenResourceManager()
    }else{
        //在生产环境或调试模式启用资源管理
        return createProductionResourceManager(options)
    }
}

function createForbiddenResourceManager(): ResourceManager {
    return {
        async load() {},
        async update() {},
        status() {
            return ResourceStatus.LATEST
        }
    }
}

function createProductionResourceManager(options: ResourceManagerOptions): ResourceManager {
    const versionLockPath = path.join(options.userDataPath, DATA_FILE.RESOURCE.VERSION_LOCK)

    let status: ResourceStatus = ResourceStatus.UNKNOWN
    const version: VersionStatusSet = {}

    async function load() {
        try {
            const versionLock = await readFile<VersionLock>(versionLockPath)
            if(versionLock == null) {
                status = ResourceStatus.NOT_INIT
            }else{
                version.server = createVersionStatus(versionLock.server, VERSION.server)
                if(version.server.latestVersion) {
                    status = ResourceStatus.NEED_UPDATE
                }else{
                    status = ResourceStatus.LATEST
                }
            }
        }catch (e) {
            throw new ClientException("RESOURCE_LOAD_ERROR", e)
        }
    }

    async function update() {
        try {
            if(status == ResourceStatus.NOT_INIT || status == ResourceStatus.NEED_UPDATE) {
                if(status == ResourceStatus.NOT_INIT || status == ResourceStatus.NEED_UPDATE) {
                    status = ResourceStatus.UPDATING
                    if(version.server == undefined || version.server.latestVersion != undefined) {
                        await updatePartServer()
                    }
                    status = ResourceStatus.LATEST
                }
                await save()
            }
        }catch (e) {
            throw new ClientException("RESOURCE_UPDATE_ERROR", e)
        }
    }

    async function save() {
        await writeFile<VersionLock>(versionLockPath, {
            server: {updateTime: version.server!.lastUpdateTime.getTime(), version: version.server!.currentVersion}
        })
    }

    async function updatePartServer() {
        const originDest = path.join(options.userDataPath, DATA_FILE.RESOURCE.SERVER_ORIGINAL_DIR)
        const dest = path.join(options.userDataPath, DATA_FILE.RESOURCE.SERVER_FOLDER)
        await rmdir(dest)
        //image.zip解压后的文件是/image目录，因此采取将其解压到根目录然后重命名的方法。
        await unzip(options.debug?.serverFromResource || path.join(options.appPath, APP_FILE.SERVER_ZIP), options.userDataPath)
        await rename(originDest, dest)
        //通过unzipper解压后，可执行信息丢失，需要重新添加。
        await chmod(path.join(dest, RESOURCE_FILE.SERVER.BIN), "755")
        await chmod(path.join(dest, "bin/java"), "755")
        await chmod(path.join(dest, "bin/keytool"), "755")
        await chmod(path.join(dest, "lib/jspawnhelper"), "755")
        version.server = {lastUpdateTime: new Date(), currentVersion: version.server?.latestVersion ?? VERSION.server}
    }

    return {
        load,
        update,
        status() {
            return status
        }
    }
}

/**
 * 构造一个version status单元。构造的同时判断此单元是否需要升级。
 */
function createVersionStatus(version: Version, latestVersion: string): VersionStatus {
    return {
        currentVersion: version.version,
        lastUpdateTime: new Date(version.updateTime),
        latestVersion: isVersionNeedChange(version.version, latestVersion) ? latestVersion : undefined
    }
}

/**
 * 判断到目标版本号是否需要变更。
 * 变更有两种可能：一，版本升级；二，版本在x.y版本号上进行了降级。
 */
function isVersionNeedChange(current: string, latest: string): boolean {
    const [cA, cB, cC] = current.split(".").map(i => parseInt(i))
    const [lA, lB, lC] = latest.split(".").map(i => parseInt(i))

    if(cA === lA && cB === lB && cC === lC) {
        return false
    }else if(arrays.compare([cA, cB, cC], [lA, lB, lC]) < 0) {
        return true
    }else{
        return arrays.compare([cA, cB], [lA, lB]) > 0
    }
}
