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

function getServerVersion() {
    const c = child.spawnSync("gradle", ["printVersion", "-q"], {cwd: "../server"})
    if(c.stdout !== null) {
        return c.stdout.toString().trim()
    }else{
        return null
    }
}

module.exports = {makePackageProduction, getServerVersion}