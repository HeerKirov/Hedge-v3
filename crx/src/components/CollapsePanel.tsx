import { ReactNode, useState } from "react"
import { styled } from "styled-components"
import { LayouttedDiv, Anchor, Icon, Layoutted } from "@/components"
import { SPACINGS } from "@/styles"


export function CollapsePanel(props: { title?: ReactNode, prefix?: ReactNode, children?: ReactNode, panel?: Layoutted } & Layoutted) {
    const { title, children, prefix, panel, ...attrs } = props
    const [showDetails, setShowDetails] = useState(false)

    return <LayouttedDiv {...attrs}>
        <LayouttedDiv display="inline-block">
            {prefix}
            <Anchor onClick={() => setShowDetails(v => !v)}>
                <StyledIconDiv><Icon icon={showDetails ? "caret-down" : "caret-right"}/></StyledIconDiv>
                {title}
            </Anchor>
        </LayouttedDiv>
        {showDetails && <LayouttedDiv {...panel}>{children}</LayouttedDiv>}
    </LayouttedDiv>
}

const StyledIconDiv = styled.div`
    display: inline-block;
    width: 10px;
    margin-right: ${SPACINGS[1]};
`