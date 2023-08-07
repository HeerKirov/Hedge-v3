const path = require("path")
const fs = require("fs")
const child = require("child_process")
const utils = require("../common/utils")

const APP_NAME = "Hedge.app"

const APP_BIN_NAME = "hedge"
const APP_ICN_NAME = "hedge.icns"

function build(argv, target) {
    if(argv.length) {
        for (const arg of argv) {
            switch (arg) {
                case "clean": clean(target); break
                case "install-app": installElectronApp(target); break
                case "build-client": buildClient(); break
                case "install-client": installClient(target); break
                case "build-frontend": buildFrontend(); break
                case "install-frontend": installFrontend(target); break
                case "build-server": buildServer(); break
                case "install-server": installServer(target); break
                default: throw new Error(`unknown command: ${arg}`)
            }
        }
    }else{
        installElectronApp(target)
        buildClient()
        installClient(target)
        buildFrontend()
        installFrontend(target)
        buildServer()
        installServer(target)
    }
    console.log("build completed.")
}

function clean(target) {
    if(fs.existsSync(target)) {
        fs.rmSync(target, {recursive: true, force: true})
    }
}

function installElectronApp(target) {
    console.log("install electron app...")
    clean(target)
    fs.mkdirSync(target)
    const appPath = path.join(target, APP_NAME)
    child.spawnSync("cp", ["-R", "node_modules/electron/dist/Electron.app", appPath])
    fs.renameSync(path.join(appPath, "Contents/MacOS/Electron"), path.join(appPath, `Contents/MacOS/${APP_BIN_NAME}`))
    fs.copyFileSync(path.join(__dirname, "files/Info.plist"), path.join(appPath, "Contents/Info.plist"))
    fs.copyFileSync(path.join(__dirname, "files", APP_ICN_NAME), path.join(appPath, `Contents/Resources/${APP_ICN_NAME}`))
    fs.rmSync(path.join(appPath, "Contents/Resources/electron.icns"))
    fs.rmSync(path.join(appPath, "Contents/Resources/default_app.asar"))
}

function buildClient() {
    console.log("build client...")
    child.spawnSync("npm", ["run", "compile"])
}

function installClient(target) {
    console.log("install client...")
    const appPath = path.join(target, APP_NAME, "Contents/Resources/app")
    if(fs.existsSync(appPath)) {
        fs.rmSync(appPath, {recursive: true, force: true})
    }
    fs.mkdirSync(appPath)
    child.spawnSync("cp", ["-R", "target", "node_modules", appPath])
    child.spawnSync("cp", ["package.json", appPath])
    utils.makePackageProduction(path.join(appPath, "package.json"))
    fs.rmSync(path.join(appPath, "node_modules/typescript"), {recursive: true, force: true})
    fs.rmSync(path.join(appPath, "node_modules/electron/dist"), {recursive: true, force: true})
    fs.rmSync(path.join(appPath, "node_modules/@types"), {recursive: true, force: true})
}

function buildFrontend() {
    console.log("build frontend...")
    child.spawnSync("yarn", ["build"], {cwd: "../frontend", stdio: "ignore"})
}

function installFrontend(target) {
    console.log("install frontend...")
    const frontendPath = path.join(target, APP_NAME, "Contents/Resources/frontend")
    if(fs.existsSync(frontendPath)) {
        fs.rmSync(frontendPath, {recursive: true, force: true})
    }
    child.spawnSync("cp", ["-R", "../frontend/dist", frontendPath])
}

function buildServer() {
    console.log("build server...")
    child.spawnSync("gradle", ["clean", "jlinkZip"], {cwd: "../server", stdio: "ignore"})
}

function installServer(target) {
    console.log("install server...")
    const resourcePath = path.join(target, APP_NAME, "Contents/Resources")
    child.spawnSync("cp", ["-R", "../server/build/image.zip", path.join(resourcePath, "server.zip")])
}

module.exports = { build }
