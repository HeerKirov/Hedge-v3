const argv = process.argv.slice(2)

const target = "../dist"

switch(process.platform) {
    case "darwin":
        require("../darwin/build").build(argv, target); break
    case "linux":
        require("../linux/build").build(argv, target); break
    default:
        throw new Error(`Build script not support current platform ${process.platform}.`)
}
