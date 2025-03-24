import fs from "fs"
import path from "path"
import child from "child_process"
import { PackageJson } from "type-fest"

export function writePackageFile(packageConfig: PackageJson, merge: Partial<PackageJson> | undefined, dest: string) {
    if(merge) {
        const json = {...packageConfig, ...merge}
        const s = JSON.stringify(json)
        fs.writeFileSync(dest, s)
    }else{
        const s = JSON.stringify(packageConfig)
        fs.writeFileSync(dest, s)
    }
}

export function copyDependencies(src: string, dest: string, dependencies: string[]) {
    for(const dependency of dependencies) {
        const SRC_DIR = path.join(src, dependency)
        const TARGET_DIR = path.join(dest, dependency)
        if(fs.existsSync(SRC_DIR)) {
            if(!fs.existsSync(TARGET_DIR)) {
                fs.cpSync(SRC_DIR, TARGET_DIR, { recursive: true, dereference: true, preserveTimestamps: true })
                const pkg = JSON.parse(fs.readFileSync(path.join(SRC_DIR, "package.json"), {encoding: "utf8"}))
                const subDeps = pkg["dependencies"] ? Object.keys(pkg["dependencies"]) : null
                if(subDeps && subDeps.length > 0) {
                    copyDependencies(src, dest, subDeps)
                }
            }
        }else{
            console.warn(`[copyDependencies] '${dependency}' not found in node_modules.`)
        }
    }
}

export function renderPListTemplate(templateFile: string, dest: string, dict: Record<string, string>): void {
    const buf = fs.readFileSync(templateFile)
    let s = buf.toString("utf-8")
    for(const [key, value] of Object.entries(dict)) {
        s = s.replaceAll(`{${key}}`, value)
    }
    fs.writeFileSync(dest, s)
}

export function getServerVersion(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        child.exec(`.${path.sep}gradlew printVersion -q`, {cwd: `..${path.sep}server`}, (err, stdout) => {
            if(err) {
                reject(err)
            }else if(stdout.trim()) {
                resolve(stdout.trim())
            }else{
                resolve(null)
            }
        })
    })
}

