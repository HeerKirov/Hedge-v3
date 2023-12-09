const fs = require("fs")
const child = require("child_process")

function makePackageProduction(packageFile) {
    const s = fs.readFileSync(packageFile, {encoding: 'utf-8'})
    const json = JSON.parse(s)
    if(json["productName"] === "Hedge-v3-development") {
        json["productName"] = "Hedge-v3"
        const s = JSON.stringify(json)
        fs.writeFileSync(packageFile, s)
    }else{
        throw new Error("package.json: productName is not Hedge-v3-development.")
    }
}

function renderPListFile(source, target, packageFile) {
    const buf = fs.readFileSync(source)
    const s = buf.toString("utf-8")
    const ver = getClientVersion(packageFile)
    const ss = s.replaceAll("{version}", ver)
    fs.writeFileSync(target, ss)
}

function getClientVersion(packageFile) {
    const s = fs.readFileSync(packageFile, {encoding: 'utf-8'})
    const json = JSON.parse(s)
    return json["version"]
}

function getServerVersion() {
    const c = child.spawnSync("./gradlew", ["printVersion", "-q"], {cwd: "../server"})
    if(c.stdout !== null) {
        return c.stdout.toString().trim()
    }else{
        return null
    }
}

module.exports = {makePackageProduction, renderPListFile, getServerVersion}