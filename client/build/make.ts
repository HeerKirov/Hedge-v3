import fs from "fs"
import path from "path"
import child from "child_process"
import type { PackageJson } from "type-fest"
import { renderPListTemplate, copyDependencies, writePackageFile } from "./utils"

interface MakePackageConfig {
    target: string
    asarFiles?: {src: string, dest: string}[]
    asarUnpack?: string
    resourceFiles?: {src: string, dest: string}[]
    dependencies?: string[]
    package?: {
        productName?: string
        main?: string
    }
}

function makePackage(config: MakePackageConfig) {
    const env = PLATFORM[process.platform]

    const APP_PATH = path.join(config.target, env.APP_NAME)
    const RESOURCE_PATH = path.join(APP_PATH, env.ELECTRON_RESOURCE)
    const ASAR_PATH = path.join(RESOURCE_PATH, "app")

    const packageConfig: PackageJson = JSON.parse(fs.readFileSync("package.json", { encoding: "utf-8" }))

    function installElectronApp() {
        if(fs.existsSync(config.target)) fs.rmSync(config.target, { recursive: true, force: true })
        fs.mkdirSync(config.target, { recursive: true })

        //tips: cp函数的拷贝行为与cp命令不同，在拷贝Electron.app时会造成文件损坏。因此，在这里依旧使用了更底层的cp命令。
        child.spawnSync("cp", ["-R", env.ELECTRON_PATH, APP_PATH])
        //移除默认asar文件
        fs.rmSync(path.join(RESOURCE_PATH, "default_app.asar"))
        //添加icon图标
        fs.cpSync(path.join("build/resources", env.APP_ICON_NAME), path.join(RESOURCE_PATH, env.APP_ICON_NAME))
        //修改可执行文件名称
        fs.renameSync(path.join(APP_PATH, env.ELECTRON_BINARY), path.join(APP_PATH, env.APP_BINARY))
        //创建asar打包目录
        fs.mkdirSync(ASAR_PATH, { recursive: true })

        if(process.platform === "darwin") {
            fs.rmSync(path.join(RESOURCE_PATH, "electron.icns"))
            renderPListTemplate("build/resources/Info.template.plist", path.join(APP_PATH, "Contents/Info.plist"), {"version": packageConfig.version ?? "<unknown version>"})
        }
    }

    function addAsarPackageFile() {
        writePackageFile(packageConfig, config.package, path.join(ASAR_PATH, "package.json"))
    }

    function addAsar(src: string, dest: string) {
        fs.cpSync(src, path.join(ASAR_PATH, dest), { recursive: true })
    }

    function addDependencies(dependencies: string[]) {
        copyDependencies("node_modules", path.join(ASAR_PATH, "node_modules"), dependencies)
    }

    function addResource(src: string, dest: string) {
        fs.cpSync(src, path.join(RESOURCE_PATH, dest), { recursive: true })
    }

    function packAsar() {
        child.spawnSync("npx", ["asar", "p", "app", "app.asar", ...(config.asarUnpack ? ["--unpack", config.asarUnpack] : [])], {cwd: RESOURCE_PATH})
        fs.rmSync(ASAR_PATH, { recursive: true })
    }

    installElectronApp()

    addAsarPackageFile()

    if(config.asarFiles?.length) {
        for(const { src, dest } of config.asarFiles) {
            addAsar(src, dest)
        }
    }

    if(config.resourceFiles?.length) {
        for(const { src, dest } of config.resourceFiles) {
            addResource(src, dest)
        }
    }

    if(config.dependencies?.length) addDependencies(config.dependencies)

    packAsar()

    console.log(`${path.join(config.target, env.APP_NAME)} package complete.`)
}

interface PlatformEnvironment {
    APP_NAME: string
    APP_ICON_NAME: string
    ELECTRON_PATH: string
    ELECTRON_BINARY: string
    ELECTRON_RESOURCE: string
    APP_BINARY: string
}

const PLATFORM: Record<string, PlatformEnvironment> = {
    "darwin": {
        APP_NAME: "Hedge.app",
        APP_ICON_NAME: "hedge.icns",
        ELECTRON_PATH: "node_modules/electron/dist/Electron.app",
        ELECTRON_RESOURCE: "Contents/Resources",
        ELECTRON_BINARY: "Contents/MacOS/Electron",
        APP_BINARY: "Contents/MacOS/Hedge",
    },
    "linux": {
        APP_NAME: "Hedge",
        APP_ICON_NAME: "hedge.png",
        ELECTRON_PATH: "node_modules/electron/dist",
        ELECTRON_RESOURCE: "resources",
        ELECTRON_BINARY: "electron",
        APP_BINARY: "hedge",
    }
}

makePackage({
    target: "dist",
    asarFiles: [
        {src: "dist-electron", dest: "client"},
        {src: "../frontend/dist", dest: "frontend"},
    ],
    resourceFiles: [
        {src: "../server/build/image.zip", dest: "server.zip"}
    ],
    dependencies: ["classic-level"],
    asarUnpack: "*.node",
    package: {
        productName: "Hedge-v3",
        main: "client/main.js"
    }
})
