import { networkInterfaces } from "os"

export function getIPAddress(): string[] {
    const interfaces = networkInterfaces()
    const ret = []
    for(const symbol in interfaces){
        const iface = interfaces[symbol]!
        for (let item of iface) {
            if(item.family === "IPv4") {
                ret.push(item.address)
            }
        }
    }
    return ret
}