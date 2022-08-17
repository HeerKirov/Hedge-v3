import { app } from "electron"
import { readdir, readFile, writeFile } from "../../utils/fs"
import { DATA_FILE } from "../../constants/file"
import { ClientException } from "../../exceptions"
import { sleep } from "../../utils/process"

/**
 * 信道和启动参数管理器。它没有初始化函数，但构造函数异步，初始化在所有组件之前，因为需要依赖此组件获得channel属性。
 */
export interface Channel {
    currentChannel(): string
    getChannelList(): Promise<string[]>
    getDefaultChannel(): Promise<string>
    setDefaultChannel(channel: string): Promise<void>
    restartWithChannel(channel: string): Promise<void>
}

export interface ChannelOptions {
    userDataPath: string
    defaultChannel: string
    manualChannel?: string
}

export async function createChannel(options: ChannelOptions): Promise<Channel> {
    const channelConfigPath = `${options.userDataPath}/${DATA_FILE.APPDATA.CHANNEL_CONFIG}`
    const channelFolderPath = `${options.userDataPath}/${DATA_FILE.APPDATA.CHANNEL_FOLDER}`

    //在client.json只有defaultChannel一项参数的情况下，围绕此参数完成逻辑
    const channel = options.manualChannel ?? await getDefaultChannelFromConfiguration() ?? options.defaultChannel

    async function getDefaultChannelFromConfiguration() {
        try {
            const configuration = await readFile<ChannelConfiguration>(channelConfigPath)
            return configuration?.defaultChannel
        }catch (e) {
            throw new ClientException("CHANNEL_READ_ERROR", e)
        }
    }

    async function getChannelList(): Promise<string[]> {
        try {
            return (await readdir(channelFolderPath)).filter(file => file.isDirectory()).map(file => file.name)
        }catch (e) {
            throw new ClientException("CHANNEL_READ_ERROR", e)
        }
    }

    async function getDefaultChannel(): Promise<string> {
        return await getDefaultChannelFromConfiguration() ?? options.defaultChannel
    }

    async function setDefaultChannel(channel: string): Promise<void> {
        const configuration = await readFile<ChannelConfiguration>(channelConfigPath) || {}
        await writeFile<ChannelConfiguration>(channelConfigPath, {...configuration, defaultChannel: channel})
    }

    async function restartWithChannel(channel: string) {
        //懒得从旧参数里剔除--channel了。放在开头覆盖就行。
        await sleep(150)
        console.log(`restart with channel ${channel}`)
        app.relaunch({args: ["--channel", channel, ...process.argv.slice(2)]})
        app.exit(0)
    }

    return {
        currentChannel() {
            return channel
        },
        getChannelList,
        getDefaultChannel,
        setDefaultChannel,
        restartWithChannel
    }
}

interface ChannelConfiguration {
    defaultChannel?: string
    cliUsedChannel?: string
}
