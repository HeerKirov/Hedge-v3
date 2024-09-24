import { styled } from "styled-components"
import { Button, FormattedText, Icon, Input, Header, LayouttedDiv, SecondaryText } from "@/components"
import { Setting } from "@/functions/setting"
import { useServerHealth } from "@/hooks/server"
import { useEditor } from "@/utils/reactivity"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, FONT_SIZES, SPACINGS } from "@/styles"

interface OptionsGeneralPanelProps {
    general: Setting["general"] | null | undefined
    onUpdateGeneral?(general: Setting["general"]): void
}

export function OptionsGeneralPanel(props: OptionsGeneralPanelProps) {
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