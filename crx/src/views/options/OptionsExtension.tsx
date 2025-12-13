import React, { useState, ReactNode } from "react"
import { styled } from "styled-components"
import { Button, Group, Icon, Label, LayouttedDiv, SecondaryText, Header, Separator } from "@/components/universal"
import { CollapsePanel } from "@/components/layouts"
import { Input, CheckBox, Select, MultilineAddList } from "@/components/form"
import { defaultSetting, Setting } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { useAsyncLoading, useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { DanbooruIcon, EHentaiIcon, FanboxIcon, FantiaIcon, GelbooruIcon, KemonoIcon, PixivIcon, SankakuIcon } from "@/styles/assets"

interface OptionsExtensionPanelProps {
    extension: Setting["extension"] | null | undefined
    onUpdateExtension?(extension: Setting["extension"]): void
}

interface DeterminingRule {
    rename: string
    referrer: string | null
    filename: string | null
    url: string | null
}

interface DeterminingRuleItemProps extends DeterminingRule {
    onUpdate(item: DeterminingRule): void
    onRemove(): void
}

export function OptionsExtensionPanel(props: OptionsExtensionPanelProps) {
    const [closeAutoCollect, refreshCloseAutoCollect] = useAsyncLoading({call: sessions.cache.closeAutoCollect, default: false})

    const resetCloseAutoCollect = async () => {
        if(closeAutoCollect) {
            await sessions.cache.closeAutoCollect(false)
            refreshCloseAutoCollect(false)
        }
    }

    const { editor, changed, setProperty, save } = useEditor({
        value: props.extension,
        updateValue: props.onUpdateExtension,
        default: () => defaultSetting().extension
    })

    const setSidePanel = usePartialSet(editor.sidePanel, v => setProperty("sidePanel", v))
    const setBookmarkManager = usePartialSet(editor.bookmarkManager, v => setProperty("bookmarkManager", v))
    const setDownloadManager = usePartialSet(editor.downloadManager, v => setProperty("downloadManager", v))

    return <>
        <p>扩展本身的功能选项。</p>

        <Separator spacing={[4, 1]}/>
        <Header>边栏选项</Header>
        <LayouttedDiv mt={2}>
            <CheckBox checked={editor.sidePanel.openByActionButton} onUpdateChecked={v => setSidePanel("openByActionButton", v)}>通过点击Action按钮打开边栏</CheckBox>
        </LayouttedDiv>
        <Label>边栏启用的模块</Label>
        <LayouttedDiv mt={1} ml={2}>
            <CheckBox checked={editor.sidePanel.enableServerStatus} onUpdateChecked={v => setSidePanel("enableServerStatus", v)}>服务器状态显示</CheckBox>
        </LayouttedDiv>
        <LayouttedDiv mt={1} ml={2}>
            <CheckBox checked={editor.sidePanel.enableSourceInfo} onUpdateChecked={v => setSidePanel("enableSourceInfo", v)}>来源信息显示</CheckBox>
        </LayouttedDiv>
        <LayouttedDiv mt={1} ml={2}>
            <CheckBox checked={editor.sidePanel.enableBookmark} onUpdateChecked={v => setSidePanel("enableBookmark", v)}>书签面板</CheckBox>
        </LayouttedDiv>
        <LayouttedDiv mt={1} ml={2}>
            <CheckBox checked={editor.sidePanel.enableDownloadManager} onUpdateChecked={v => setSidePanel("enableDownloadManager", v)}>下载管理器</CheckBox>
        </LayouttedDiv>

        <Separator spacing={[4, 1]}/>
        <Header>书签管理器</Header>
        <TwoColDiv>
            <div>
                <Label>排除的域名列表</Label>
                <SecondaryText>在排除列表中的网站，不会在其页面中启用书签管理器。</SecondaryText>
                <CollapsePanel title="排除的域名列表">
                    <MultilineAddList value={editor.bookmarkManager.excludeDomains} onUpdateValue={v => setBookmarkManager("excludeDomains", v)}/>
                </CollapsePanel>
            </div>
            <div>
                <Label>启用的域名列表</Label>
                <SecondaryText>启用列表不为空时，仅在列出的网站中启用书签管理器。</SecondaryText>
                <CollapsePanel title="启用的域名列表">
                    <MultilineAddList value={editor.bookmarkManager.includeDomains} onUpdateValue={v => setBookmarkManager("includeDomains", v)}/>
                </CollapsePanel>
            </div>
        </TwoColDiv>

        <Separator spacing={[4, 1]}/>
        <Header>下载管理器</Header>
        <LayouttedDiv mt={1}>
            <Label>清理按钮的清理范围</Label>
            <Select items={CLEAR_BUTTON_ACTION_ITEMS} value={editor.downloadManager.clearButtonAction} onUpdateValue={v => setDownloadManager("clearButtonAction", v)}/>
        </LayouttedDiv>
        <LayouttedDiv mt={2}>
            <CheckBox checked={editor.downloadManager.autoClear} onUpdateChecked={v => setDownloadManager("autoClear", v)}>自动清理</CheckBox>
            <SecondaryText>每隔一段时间，自动清理下载管理器中的下载项。</SecondaryText>
            {editor.downloadManager.autoClear && <>
                <LayouttedDiv ml={2} mt={1}>
                    清理间隔: <Input type="number" width="50px" value={editor.downloadManager.autoClearIntervalSec.toString()} onUpdateValue={v => setDownloadManager("autoClearIntervalSec", parseInt(v))}/>秒
                </LayouttedDiv>
                <LayouttedDiv ml={2} mt={1}>
                    清理范围: <Select items={CLEAR_BUTTON_ACTION_ITEMS} value={editor.downloadManager.autoClearAction} onUpdateValue={v => setDownloadManager("autoClearAction", v)}/>
                </LayouttedDiv>
            </>}
        </LayouttedDiv>

        <LayouttedDiv mt={2}>
            {changed && <>
                <Separator spacing={2}/>
                <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>
            </>}
        </LayouttedDiv>
    </>
}

const CLEAR_BUTTON_ACTION_ITEMS: {label: string, value: Setting["extension"]["downloadManager"]["clearButtonAction"]}[] = [
    {label: "已取消，或已删除的下载项", value: "CANCELLED_AND_DELETED"},
    {label: "已取消，或已完成的下载项", value: "CANCELLED_AND_COMPLETE"},
    {label: "所有未活动的下载项", value: "ALL_NOT_PROGRESSING"},
]

const TwoColDiv = styled.div`
    display: flex;
    width: 600px;
    gap: ${SPACINGS[4]};
    > div {
        width: 50%;
    }
`

const StyledSaveButton = styled(Button)`
    padding: 0 ${SPACINGS[5]};
`