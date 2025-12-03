import { styled } from "styled-components"
import { Button, FormattedText, Icon, Header, LayouttedDiv, SecondaryText } from "@/components/universal"
import { Input } from "@/components/form"
import { Setting, settings } from "@/functions/setting"
import { notify } from "@/services/notification"
import { useServerHealth } from "@/hooks/server"
import { useEditor } from "@/utils/reactivity"
import { documents } from "@/utils/document"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, FONT_SIZES, SPACINGS } from "@/styles"

interface OptionsGeneralPanelProps {
    general: Setting["general"] | null | undefined
    onUpdateGeneral?(general: Setting["general"]): void
}

export function OptionsGeneralPanel(props: OptionsGeneralPanelProps) {
    return <>
        <ServerPanel general={props.general} onUpdateGeneral={props.onUpdateGeneral}/>
        <ConfigPanel/>
    </>
}

function ServerPanel(props: OptionsGeneralPanelProps) {
    const { health, refreshHealth } = useServerHealth()

    const { editor, changed, setProperty, save } = useEditor({
        value: props.general,
        updateValue: props.onUpdateGeneral,
        default: () => ({
            host: "",
            token: ""
        }),
        afterChange() {
            refreshHealth()
        }
    })

    return <>
        <Header>核心服务</Header>
        <p>扩展可连接到Hedge App的服务端，以提供来源数据收集、相似项查找等一系列功能。</p>
        <LayouttedDiv border radius="std" display="inline-block" padding={[1, 2]} mt={1}>
            <FormattedText color="secondary">SERVER STATUS: </FormattedText>
            <StyledHealth $status={health}>{health}</StyledHealth>
            <FormattedText color="secondary" size="small">{STATUS_TO_DESCRIPTION[health]}</FormattedText>
            <Button size="small" onClick={() => refreshHealth()}>刷新</Button>
        </LayouttedDiv>
        <StyledTable>
            <tbody>
            <tr>
                <th>连接Host</th>
                <th>连接Token</th>
            </tr>
            <tr>
                <td><Input placeholder="连接Host" value={editor.host} onUpdateValue={v => setProperty("host", v)}/></td>
                <td><Input placeholder="连接Token" value={editor.token} onUpdateValue={v => setProperty("token", v)}/></td>
                <td>{changed && <Button mode="filled" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</Button>}</td>
            </tr>
            </tbody>
        </StyledTable>
        <SecondaryText>连接到核心服务的地址。为了确保稳定连接，建议在「核心服务」设置中设定固定的端口号。</SecondaryText>
    </>
}

function ConfigPanel() {

    const exportConfig = async () => {
        const setting = await settings.get()
        documents.clickDownload("config.json", setting)
    }

    const importConfig = async () => {
        // 创建一个隐藏的文件输入框
        const fileInput = document.createElement("input")
        fileInput.type = "file"
        fileInput.accept = ".json"

        // 当用户选择文件时处理文件
        fileInput.onchange = (event) => {
            const file = (event.target as HTMLInputElement).files?.[0]
            if(file) {
                const reader = new FileReader()
                reader.onload = async e => {
                    try {
                        const config = JSON.parse((e.target as FileReader).result as string)
                        console.log("import config: ", config)
                        await settings.importAndMigrate(config)
                        notify({
                            title: "导入配置成功",
                            message: `已成功应用配置文件${file.name}。`
                        })
                        window.location.reload()
                    }catch (err) {
                        notify({
                            title: "导入配置失败",
                            message: err instanceof Error ? err.message : typeof err === "string" ? err : "未知错误，请查看控制台。"
                        })
                        console.error(err)
                    }
                }
                reader.readAsText(file)
            }
        }

        fileInput.click()
    }

    return <>
        <Header>导入/导出配置</Header>
        <p>将配置内容导入/导出以进行备份或迁移。</p>
        <LayouttedDiv mt={2}>
            <Button type="primary" onClick={exportConfig}><Icon icon="file-export" mr={2}/>导出配置</Button>
            <Button type="primary" onClick={importConfig}><Icon icon="file-import" mr={2}/>导入配置</Button>
        </LayouttedDiv>
    </>
}

const StyledHealth = styled.span<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    font-size: ${FONT_SIZES["large"]};
    margin-right: ${SPACINGS[4]};
    color: ${p => LIGHT_MODE_COLORS[STATUS_TO_COLOR[p.$status]]};
    @media (prefers-color-scheme: dark) {
        color: ${p => DARK_MODE_COLORS[STATUS_TO_COLOR[p.$status]]};
    }
`

const StyledTable = styled.table`
    text-align: left;
`

const STATUS_TO_COLOR = {
    "NOT_INITIALIZED": "warning",
    "INITIALIZING": "warning",
    "LOADING": "primary",
    "READY": "success",
    "DISCONNECTED": "danger",
    "UNKNOWN": "warning",
} as const

const STATUS_TO_DESCRIPTION = {
    "NOT_INITIALIZED": "核心服务还没有初始化。",
    "INITIALIZING": "核心服务正在初始化……",
    "LOADING": "核心服务正在启动……",
    "READY": "核心服务已连接。",
    "DISCONNECTED": "核心服务未连接。请检查核心服务是否开启，以及Host、Token是否正确配置。",
    "UNKNOWN": "核心服务状态未知。",
}