import { styled } from "styled-components"
import { Button, CheckBox, Icon, Input, Label, LayouttedDiv, SecondaryText } from "@/components"
import { defaultSetting, Setting } from "@/functions/setting"
import { useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"

interface OptionsToolPanelProps {
    tool: Setting["tool"] | null | undefined
    onUpdateTool?(tool: Setting["tool"]): void
}

export function OptionsToolPanel(props: OptionsToolPanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.tool,
        updateValue: props.onUpdateTool,
        from: v => ({
            sankakucomplex: v.sankakucomplex,
            ehentai: {
                ...v.ehentai,
                commentBlockKeywords: v.ehentai.commentBlockKeywords?.map(s => s.includes(" ") ? s.replaceAll(" ", "_") : s).join(" "),
                commentBlockUsers: v.ehentai.commentBlockUsers?.map(s => s.includes(" ") ? s.replaceAll(" ", "_") : s).join(" ")
            }
        }),
        to: f => ({
            sankakucomplex: f.sankakucomplex,
            ehentai: {
                ...f.ehentai,
                commentBlockKeywords: f.ehentai.commentBlockKeywords?.split(" ").filter(s => !!s).map(s => s.includes("_") ? s.replaceAll("_", " ") : s),
                commentBlockUsers: f.ehentai.commentBlockUsers?.split(" ").filter(s => !!s).map(s => s.includes("_") ? s.replaceAll("_", " ") : s)
            }
        }),
        default: () => {
            const d = defaultSetting()
            return {
                sankakucomplex: d.tool.sankakucomplex,
                ehentai: {
                    ...d.tool.ehentai,
                    commentBlockKeywords: d.tool.ehentai.commentBlockKeywords?.map(s => s.includes(" ") ? s.replaceAll(" ", "_") : s).join(" "),
                    commentBlockUsers: d.tool.ehentai.commentBlockUsers?.map(s => s.includes(" ") ? s.replaceAll(" ", "_") : s).join(" ")
                }
            }
        }
    })

    const setSankakucomplexProperty = usePartialSet(editor.sankakucomplex, v => setProperty("sankakucomplex", v))

    const setEHentaiProperty = usePartialSet(editor.ehentai, v => setProperty("ehentai", v))

    return <>
        <p>
            扩展工具提供了几种图源网站易用性优化功能。
        </p>
        <Label>Sankaku Complex</Label>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableBlockAds} onUpdateChecked={v => setSankakucomplexProperty("enableBlockAds", v)}>屏蔽部分广告和弹窗</CheckBox>
            <SecondaryText>网站总有一些弹窗无法被广告屏蔽插件干掉，但CSS选择器可以做到。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableShortcutForbidden} onUpdateChecked={v => setSankakucomplexProperty("enableShortcutForbidden", v)}>屏蔽部分快捷键</CheckBox>
            <SecondaryText>屏蔽网站的Tab快捷键与CTRL+D快捷键。这两个快捷键给浏览器的使用带来了一些麻烦。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enablePaginationEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enablePaginationEnhancement", v)}>增强翻页</CheckBox>
            <SecondaryText>使翻页可以突破最大页码上限。不过不能突破跳页限制，需要逐页翻页。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableTagListEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enableTagListEnhancement", v)}>增强标签列表</CheckBox>
            <SecondaryText>在artist, publish, copyright, character类型的标签后面追加该标签的Post/Book数量。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableBookNoticeEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enableBookNoticeEnhancement", v)}>增强Book列表</CheckBox>
            <SecondaryText>在Book链接的后面追加Legacy Pool的跳转链接。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableImageLinkReplacement} onUpdateChecked={v => setSankakucomplexProperty("enableImageLinkReplacement", v)}>替换图像链接</CheckBox>
            <SecondaryText>将所有图像的<code>https://v</code>链接替换为<code>https://s</code>链接。此举可能减少无法访问的文件数量。</SecondaryText>
        </StyledDiv>
        <Label>E-Hentai</Label>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableUIOptimize} onUpdateChecked={v => setEHentaiProperty("enableUIOptimize", v)}>优化图像页面的UI显示</CheckBox>
            <SecondaryText>顶部标题栏和底部工具栏将始终保持在一行内，不会随宽度的不同而挪动位置。</SecondaryText>
            <SecondaryText>将下载链接的实现方式替换为使用Extension API实现，与原链接的性状不完全一致，它总是能触发下载操作。</SecondaryText>
            <SecondaryText>没有original的图像，也增加一个链接，因此可以统一操作模式。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentCNBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentCNBlock", v)}>针对评论区的中文用户</CheckBox>
            <SecondaryText>在评论区可能打起来时，屏蔽评论区的所有中文评论。</SecondaryText>
            <SecondaryText>当存在Vote较低、被的屏蔽关键字/用户，还存在至少2条Vote较高的中文评论时，会连同其他中文评论一起屏蔽。</SecondaryText>
            <SecondaryText>并且，在某些重点关照区域，屏蔽规则还会进一步增强。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentVoteBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentVoteBlock", v)}>评论区低Vote屏蔽</CheckBox>
            <SecondaryText>屏蔽Vote数被踩得比较低的评论。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentKeywordBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentKeywordBlock", v)}>评论区关键字屏蔽</CheckBox>
            <SecondaryText>根据关键词屏蔽列表，屏蔽不想看到的评论。</SecondaryText>
        </StyledDiv>
        {editor.ehentai.enableCommentKeywordBlock && <StyledDiv>
            <LayouttedDiv size="small">关键词屏蔽列表 (以空格分隔多个关键词)</LayouttedDiv>
            <Input type="textarea" size="small" width="400px" value={editor.ehentai.commentBlockKeywords} onUpdateValue={v => setEHentaiProperty("commentBlockKeywords", v)}/>
        </StyledDiv>}
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentUserBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentUserBlock", v)}>评论区用户屏蔽</CheckBox>
            <SecondaryText>根据用户屏蔽列表，屏蔽不想看到的用户评论。</SecondaryText>
        </StyledDiv>
        {editor.ehentai.enableCommentUserBlock && <StyledDiv>
            <LayouttedDiv size="small">用户屏蔽列表 (以空格分隔多个关键词)</LayouttedDiv>
            <Input type="textarea" size="small" width="400px" value={editor.ehentai.commentBlockUsers} onUpdateValue={v => setEHentaiProperty("commentBlockUsers", v)}/>
        </StyledDiv>}
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

const StyledDiv = styled.div`
    margin-top: ${SPACINGS[1]};
`

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
`
