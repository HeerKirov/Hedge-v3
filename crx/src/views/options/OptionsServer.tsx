import { styled } from "styled-components"
import { Button, Icon, Input, Label, SecondaryText } from "@/components"
import { Setting } from "@/functions/setting"
import { useServerHealth } from "@/hooks/server"
import { useEditor } from "@/utils/reactivity"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, FONT_SIZES, SPACINGS } from "@/styles"

interface OptionsServerPanelProps {
    server: Setting["server"] | null | undefined
    onUpdateServer?(server: Setting["server"]): void
}

export function OptionsServerPanel(props: OptionsServerPanelProps) {
    const { health, refreshHealth } = useServerHealth()
    
    const { editor, changed, setProperty, save } = useEditor({
        value: props.server,
        updateValue: props.onUpdateServer,
        from: v => ({
            host: v.host,
            token: v.token
        }),
        to: f => ({
            host: f.host,
            token: f.token
        }),
        default: () => ({
            host: "",
            token: ""
        }),
        afterChange() {
            refreshHealth()
        }
    })

    return <>
        <div>
            连接到后台服务后，可以使用一系列与来源数据相关的交互功能。
        </div>
        <Label>后台服务连通状态</Label>
        <StyledHealthDiv>
            <StyledHealth $status={health}>{health}</StyledHealth>
            <Button size="small" onClick={() => refreshHealth()}>刷新</Button>
            <SecondaryText>{STATUS_TO_DESCRIPTION[health]}</SecondaryText>
        </StyledHealthDiv>
        <Label>连接Host</Label>
        <div>
            <Input placeholder="连接Host" value={editor.host} onUpdateValue={v => setProperty("host", v)}/>
            <SecondaryText>连接到后台服务的地址。为了确保稳定连接，建议在「核心服务」设置中设定固定的端口号。</SecondaryText>
        </div>
        <Label>连接Token</Label>
        <div>
            <Input placeholder="连接Token" value={editor.token} onUpdateValue={v => setProperty("token", v)}/>
            <SecondaryText>连接到后台服务的Token。建议在「核心服务」设置中设定固定的Token。</SecondaryText>
        </div>
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

const StyledHealthDiv = styled.div`
    padding: ${SPACINGS[2]};
    vertical-align: middle;
`

const StyledHealth = styled.span<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    font-size: ${FONT_SIZES["large"]};
    margin-right: ${SPACINGS[4]};
    color: ${p => LIGHT_MODE_COLORS[STATUS_TO_COLOR[p.$status]]};
    @media (prefers-color-scheme: dark) {
        color: ${p => DARK_MODE_COLORS[STATUS_TO_COLOR[p.$status]]};
    }
`

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
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
    "NOT_INITIALIZED": "后台服务还没有初始化。",
    "INITIALIZING": "后台服务正在初始化……",
    "LOADING": "后台服务正在启动……",
    "READY": "后台服务已连接。",
    "DISCONNECTED": "后台服务未连接。请检查后台服务是否开启，以及Host、Token是否正确配置。",
    "UNKNOWN": "后台服务状态未知。",
}