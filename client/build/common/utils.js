const fs = require("fs")

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

module.exports = {makePackageProduction}