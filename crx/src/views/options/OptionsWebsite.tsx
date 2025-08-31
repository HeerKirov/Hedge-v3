import { styled } from "styled-components"
import { Button, CheckBox, Header, Icon, LayouttedDiv, SecondaryText, Separator, MultilineAddList, CollapsePanel } from "@/components"
import { defaultSetting, Setting } from "@/functions/setting"
import { useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { SankakuIcon, EHentaiIcon, FanboxIcon, KemonoIcon } from "@/styles/assets"

interface OptionsWebsitePanelProps {
    website: Setting["website"] | null | undefined
    onUpdateWebsite?(website: Setting["website"]): void
}

export function OptionsWebsitePanel(props: OptionsWebsitePanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.website,
        updateValue: props.onUpdateWebsite,
        default: () => defaultSetting().website
    })

    const setKemono = usePartialSet(editor.kemono, v => setProperty("kemono", v))

    const setSankakucomplex = usePartialSet(editor.sankakucomplex, v => setProperty("sankakucomplex", v))

    const setEhentai = usePartialSet(editor.ehentai, v => setProperty("ehentai", v))

    const setFanbox = usePartialSet(editor.fanbox, v => setProperty("fanbox", v))

    return <>
        <p>扩展提供了面向一些站点的优化增强功能。</p>

        <Separator spacing={[4, 1]}/>
        <Header><IconImg src={EHentaiIcon} alt="e-hentai icon"/>E-Hentai</Header>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableUIOptimize} onUpdateChecked={v => setEhentai("enableUIOptimize", v)}>优化UI显示</CheckBox>
            <SecondaryText>图像页面的顶部标题栏和底部工具栏将始终保持在一行内，不会随宽度的不同而挪动位置。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableRenameScript} onUpdateChecked={v => setEhentai("enableRenameScript", v)}>添加"下载重命名脚本"功能</CheckBox>
            <SecondaryText>在画廊添加"Rename Script Download"功能，可以下载能将归档包内文件批量重命名的脚本。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentCNBlock} onUpdateChecked={v => setEhentai("enableCommentCNBlock", v)}>针对评论区的中文用户</CheckBox>
            <SecondaryText>在评论区可能打起来时，屏蔽评论区的所有中文评论。</SecondaryText>
            <SecondaryText>当存在Vote较低、被的屏蔽关键字/用户，还存在至少2条Vote较高的中文评论时，会连同其他中文评论一起屏蔽。</SecondaryText>
            <SecondaryText>并且，在某些重点关照区域，屏蔽规则还会进一步增强。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentVoteBlock} onUpdateChecked={v => setEhentai("enableCommentVoteBlock", v)}>评论区低Vote屏蔽</CheckBox>
            <SecondaryText>屏蔽Vote数被踩得比较低的评论。</SecondaryText>
        </StyledDiv>
        <TwoColDiv>
            <div>
                <StyledDiv>
                    <CheckBox checked={editor.ehentai.enableCommentKeywordBlock} onUpdateChecked={v => setEhentai("enableCommentKeywordBlock", v)}>评论区关键字屏蔽</CheckBox>
                    <SecondaryText>根据关键词屏蔽列表，屏蔽不想看到的评论。</SecondaryText>
                </StyledDiv>
                <CollapsePanel title="关键词屏蔽列表">
                    {editor.ehentai.enableCommentKeywordBlock && <MultilineAddList value={editor.ehentai.commentBlockKeywords} onUpdateValue={v => setEhentai("commentBlockKeywords", v)}/>}
                </CollapsePanel>
            </div>
            <div>
                <StyledDiv>
                    <CheckBox checked={editor.ehentai.enableCommentUserBlock} onUpdateChecked={v => setEhentai("enableCommentUserBlock", v)}>评论区用户屏蔽</CheckBox>
                    <SecondaryText>根据用户屏蔽列表，屏蔽不想看到的用户评论。</SecondaryText>
                </StyledDiv>
                <CollapsePanel title="用户屏蔽列表">
                    {editor.ehentai.enableCommentUserBlock && <MultilineAddList value={editor.ehentai.commentBlockUsers} onUpdateValue={v => setEhentai("commentBlockUsers", v)}/>}
                </CollapsePanel>
            </div>
        </TwoColDiv>

        <Separator spacing={[4, 1]}/>
        <Header><IconImg src={SankakuIcon} alt="sankaku icon"/>Sankaku Complex</Header>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableBlockAds} onUpdateChecked={v => setSankakucomplex("enableBlockAds", v)}>屏蔽部分广告和冗余UI</CheckBox>
            <SecondaryText>屏蔽一些显眼的嵌入式广告与一些冗余的UI，让视野干净一些。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableUIOptimize} onUpdateChecked={v => setSankakucomplex("enableUIOptimize", v)}>优化UI显示</CheckBox>
            <SecondaryText>移除"查看原始图像"的notice提示。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enablePaginationEnhancement} onUpdateChecked={v => setSankakucomplex("enablePaginationEnhancement", v)}>增强翻页器</CheckBox>
            <SecondaryText>使翻页可以突破最大页码上限。不过不能突破跳页限制，需要逐页翻页。</SecondaryText>
        </StyledDiv>

        <Separator spacing={[4, 1]}/>
        <Header><IconImg src={FanboxIcon} alt="fanbox icon"/>FANBOX</Header>
        <StyledDiv>
            <CheckBox checked={editor.fanbox.enableUIOptimize} onUpdateChecked={v => setFanbox("enableUIOptimize", v)}>优化UI显示</CheckBox>
            <SecondaryText>在创作者的名字后面追加显示userId和creatorId。</SecondaryText>
        </StyledDiv>

        <LayouttedDiv mt={2}>
            {changed && <>
                <Separator spacing={2}/>
                <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>
            </>}
        </LayouttedDiv>

        <Separator spacing={[4, 1]}/>
        <Header><IconImg src={KemonoIcon} alt="kemono icon"/>Kemono</Header>
        <StyledDiv>
            <CheckBox checked={editor.kemono.enableLinkReplace} onUpdateChecked={v => setKemono("enableLinkReplace", v)}>替换文章中指向原站点的链接</CheckBox>
            <SecondaryText>将文本中指向原站点的其他post的链接替换为指向Kemono。一部分非链接的文本型URL也会被附加站内链接。</SecondaryText>
        </StyledDiv>
    </>
}

const IconImg = styled.img`
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    transform: translateY(2px);
`

const TwoColDiv = styled.div`
    display: flex;
    width: 600px;
    gap: ${SPACINGS[4]};
    > div {
        width: 50%;
    }
`

const StyledDiv = styled.div`
    margin-top: ${SPACINGS[1]};
`

const StyledSaveButton = styled(Button)`
    padding: 0 ${SPACINGS[5]};
`
