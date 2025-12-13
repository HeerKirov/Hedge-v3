import { memo } from "react"
import { styled } from "styled-components"
import { useServerHealth } from "@/hooks/server"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, FONT_SIZES, SPACINGS } from "@/styles"


export const ServerStatusNotice = memo(function ServerStatusNotice() {
    const { health } = useServerHealth()

    return <HealthDiv $status={health}>
        SERVER STATUS:<span>{health}</span>
    </HealthDiv>
})


const HealthDiv = styled.div<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    box-sizing: border-box;
    text-align: center;
    color: ${LIGHT_MODE_COLORS["secondary-text"]};
    font-size: ${FONT_SIZES["small"]};
    > span {
        margin-left: ${SPACINGS[1]};
        color: ${p => LIGHT_MODE_COLORS[p.$status === "READY" ? "text" : p.$status === "DISCONNECTED" ? "danger" : "warning"]};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["secondary-text"]};
        > span {
            color: ${p => DARK_MODE_COLORS[p.$status === "READY" ? "text" : p.$status === "DISCONNECTED" ? "danger" : "warning"]};
        }
    }
`
