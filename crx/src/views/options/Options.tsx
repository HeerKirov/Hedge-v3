import { useState } from "react"
import { styled } from "styled-components"
import { Button, Icon, StandardSideLayout } from "@/components"
import { useSetting } from "@/hooks/setting"
import { usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { OptionsGeneralPanel } from "./OptionsGeneral"
import { OptionsWebsitePanel } from "./OptionsWebsite"
import { OptionsToolkitPanel } from "./OptionsToolkit"

export function Options() {
    const { setting, saveSetting } = useSetting()

    const [panel, setPanel] = useState<"general" | "website" | "toolkit">("general")

    const setSettingPartial = usePartialSet(setting, saveSetting)

    const left = <>
        <Header>Hedge v3 Helper</Header>
        <SecondaryHeader>工具配置与扩展选项</SecondaryHeader>
        <SideButtonDiv><Button width="100%" type={panel === "general" ? "primary" : undefined} onClick={() => setPanel("general")}><Icon icon="server" mr={2}/>通用选项</Button></SideButtonDiv>
        <SideButtonDiv><Button width="100%" type={panel === "website" ? "primary" : undefined} onClick={() => setPanel("website")}><Icon icon="toolbox" mr={2}/>网站增强</Button></SideButtonDiv>
        <SideButtonDiv><Button width="100%" type={panel === "toolkit" ? "primary" : undefined} onClick={() => setPanel("toolkit")}><Icon icon="download" mr={2}/>扩展工具</Button></SideButtonDiv>
    </>

    const content = panel === "general" ? <OptionsGeneralPanel general={setting?.general} onUpdateGeneral={v => setSettingPartial("general", v)}/>
        : panel === "website" ? <OptionsWebsitePanel website={setting?.website} onUpdateWebsite={v => setSettingPartial("website", v)}/>
        : panel === "toolkit" ? <OptionsToolkitPanel toolkit={setting?.toolkit} onUpdateToolkit={v => setSettingPartial("toolkit", v)}/>
        :  undefined

    return <StandardSideLayout left={left} content={content} contentPadding={4}/>
}

const Header = styled.h3`
    text-align: center;
    margin-bottom: ${SPACINGS[3]};
    user-select: none;
`

const SecondaryHeader = styled.div`
    text-align: center;
    margin-bottom: ${SPACINGS[6]};
    user-select: none;
`

const SideButtonDiv = styled.div`
    margin-bottom: ${SPACINGS[1]};
    text-align: center;
`
