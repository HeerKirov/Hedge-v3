import { Fragment, ReactNode, useState } from "react"
import { styled } from "styled-components"
import { Anchor, Button, CheckBox, FormattedText, Icon, Input, Label, LayouttedDiv, SecondaryText } from "@/components"
import { Setting } from "@/functions/setting"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { maps, objects } from "@/utils/primitives"
import { useAsyncLoading, useEditor } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { sessions } from "@/functions/storage"

interface OptionsSourceDataPanelProps {
    sourceData: Setting["sourceData"] | null | undefined
    onUpdateSourceData?(sourceData: Setting["sourceData"]): void
}

export function OptionsSourceDataPanel(props: OptionsSourceDataPanelProps) {
    const [closeAutoCollect, refreshCloseAutoCollect] = useAsyncLoading({call: sessions.cache.closeAutoCollect, default: false})

    const resetCloseAutoCollect = async () => {
        if(closeAutoCollect) {
            await sessions.cache.closeAutoCollect(false)
            refreshCloseAutoCollect(false)
        }
    }

    const { editor, changed, setProperty, save } = useEditor({
        value: props.sourceData,
        updateValue: props.onUpdateSourceData,
        from: v => ({
            autoCollectWhenDownload: v.autoCollectWhenDownload,
            rules: Object.entries(SOURCE_DATA_COLLECT_SITES).map(([siteName, rule]) => {
                const overrideRule = v.overrideRules[siteName]
                return {
                    siteName,
                    enable: overrideRule?.enable ?? true,
                    sourceSite: overrideRule?.sourceSite ?? rule.sourceSite,
                    additionalInfo: Object.entries(overrideRule?.additionalInfo ?? rule.additionalInfo).map(([key, additionalField]) => ({key, additionalField}))
                }
            })
        }),
        to: f => ({
            autoCollectWhenDownload: f.autoCollectWhenDownload,
            overrideRules: (() => {
                const overrideRules: Record<string, {enable: boolean, sourceSite: string, additionalInfo: Record<string, string>}> = {}
                for(let i = 0; i < f.rules.length; ++i) {
                    const rule = f.rules[i], stdRule = SOURCE_DATA_COLLECT_SITES[rule.siteName]
                    const additionalInfo = maps.parse(rule.additionalInfo.map(i => [i.key, i.additionalField]))
                    if(!rule.enable || rule.sourceSite !== stdRule.sourceSite || !objects.deepEquals(additionalInfo, stdRule.additionalInfo)) {
                        overrideRules[rule.siteName] = {
                            enable: rule.enable, 
                            sourceSite: rule.sourceSite, 
                            additionalInfo
                        }
                    }
                }
                return overrideRules
            })()
        }),
        default: () => ({
            autoCollectWhenDownload: false,
            rules: []
        })
    })

    const updateCollectRuleAt = (index: number, item: CollectRule) => {
        setProperty("rules", [...editor.rules.slice(0, index), item, ...editor.rules.slice(index + 1)])
    }

    return <>
        <p>来源数据收集功能在提供文件重命名建议的同时收集该项目的来源数据，并保存到Hedge。</p>
        <Label>设置</Label>
        <CheckBox checked={editor.autoCollectWhenDownload} onUpdateChecked={v => setProperty("autoCollectWhenDownload", v)}>在下载文件时，自动收集来源数据</CheckBox>
        {closeAutoCollect && <>
            <FormattedText bold ml={4}><Icon icon="warning" mr={1}/>自动收集功能已临时关闭。</FormattedText>
            <Button size="small" type="primary" onClick={resetCloseAutoCollect}><Icon icon="toggle-on" mr={1}/>重新打开</Button>
        </>}
        <Label>来源数据收集规则</Label>
        <SecondaryText>为每一类来源数据收集指定其在Hedge中对应的site名称，以及每一种附加数据在Hedge中对应的附加数据字段名。</SecondaryText>
        {editor.rules.map((rule, i) => <CollectRuleItem key={rule.siteName} {...rule} onUpdate={v => updateCollectRuleAt(i ,v)}/>)}
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

interface CollectRule {
    enable: boolean
    siteName: string
    sourceSite: string
    additionalInfo: {key: string, additionalField: string}[]
}

interface CollectRuleItemProps extends CollectRule {
    onUpdate(item: CollectRule): void
}

function CollectRuleItem({ onUpdate, ...rule }: CollectRuleItemProps) {
    const [showDetails, setShowDetails] = useState(false)

    return <LayouttedDiv mt={1}>
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}/>
        <StyledFixedRuleName>{rule.siteName}</StyledFixedRuleName>
        <Input disabled={!rule.enable} value={rule.sourceSite} placeholder="对应site名称" onUpdateValue={v => onUpdate({...rule, sourceSite: v})}/>
        {rule.additionalInfo.map((additionalInfo, i) => <Fragment key={additionalInfo.key}>
            <StyledFixedAdditionalKey>{additionalInfo.key}</StyledFixedAdditionalKey>
            <Input width="100px" disabled={!rule.enable} placeholder="对应附加数据字段名" value={additionalInfo.additionalField} onUpdateValue={v => onUpdate({...rule, additionalInfo: [...rule.additionalInfo.slice(0, i), {key: additionalInfo.key, additionalField: v}, ...rule.additionalInfo.slice(i + 1)]})}/>
        </Fragment>)}
        <LayouttedDiv display="inline-block" ml={2}><Anchor onClick={() => setShowDetails(v => !v)}><Icon icon={showDetails ? "caret-down" : "caret-right"} mr={1}/>收集内容详情</Anchor></LayouttedDiv>
        {showDetails && <LayouttedDiv border radius="std" padding={2} margin={1}>{RULE_ITEM_DESCRIPTION[rule.siteName]}</LayouttedDiv>}
    </LayouttedDiv>
}

const RULE_ITEM_DESCRIPTION: Record<string, ReactNode> = {
    "sankakucomplex": <table>
        <tbody>
            <tr>
                <td><i>Post</i></td><td>作为</td>
                <td>来源数据项</td><td>(<i>PostId</i> 作为 来源ID)</td>
            </tr>
            <tr>
                <td><i>Tag</i></td><td><Icon icon="arrow-right"/></td>
                <td>来源标签</td><td>(<i>TagType</i> <Icon icon="arrow-right"/> 类型，<i>TagName</i> <Icon icon="arrow-right"/> 标识编码/显示名称，<i>JPName</i> <Icon icon="arrow-right"/> 别名)</td>
            </tr>
            <tr>
                <td><i>Book</i></td><td><Icon icon="arrow-right"/></td>
                <td>来源集合</td><td>(<i>BookId</i> <Icon icon="arrow-right"/> 标识编码，<i>BookTitle</i> <Icon icon="arrow-right"/> 标题)</td>
            </tr>
            <tr>
                <td><i>Children</i>&<i>Parent</i></td><td><Icon icon="arrow-right"/></td>
                <td>来源关联项</td><td>(<i>PostId</i> <Icon icon="arrow-right"/> 关联项)</td>
            </tr>
        </tbody>
    </table>,
    "pixiv": <table>
        <tbody>
        <tr>
            <td><i>Artwork</i></td><td>作为</td>
            <td>来源数据项</td><td>(<i>ArtworkID</i> 作为 来源ID，其中的项作为分页)</td>
        </tr>
        <tr>
            <td><i>Artwork Page</i></td><td>作为</td>
            <td>分页</td><td>(<i>Page Num</i> 作为 分页，从0开始)</td>
        </tr>
        <tr>
            <td><i>Artist</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(固定类型<code>artist</code>，<i>UserId</i> <Icon icon="arrow-right"/> 标识编码，<i>UserName</i> <Icon icon="arrow-right"/> 显示名称)</td>
        </tr>
        <tr>
            <td><i>Tag</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(固定类型<code>tag</code>，<i>TagName</i> <Icon icon="arrow-right"/> 标识名称/显示名称)，<i>SecondaryName</i> <Icon icon="arrow-right"/> 别名)</td>
        </tr>
        <tr>
            <td><i>Title</i></td><td><Icon icon="arrow-right"/></td>
            <td>标题</td><td></td>
        </tr>
        <tr>
            <td><i>Description</i></td><td><Icon icon="arrow-right"/></td>
            <td>描述</td><td></td>
        </tr>
        </tbody>
    </table>,
    "ehentai": <table>
        <tbody>
        <tr>
            <td><i>Gallery</i></td><td>作为</td>
            <td>来源数据项</td><td>(<i>GalleryID</i> 作为 来源ID，其中的项作为分页，<i>Image Hash</i>作为分页页名)</td>
        </tr>
        <tr>
            <td><i>Gallery Image</i></td><td>作为</td>
            <td>分页</td><td>(<i>Page Num</i> 作为 分页，从1开始，<i>Image Hash</i> 作为 分页页名)</td>
        </tr>
        <tr>
            <td><i>Tag</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(<i>TagType</i> <Icon icon="arrow-right"/> 类型，<i>TagName</i> <Icon icon="arrow-right"/> 标识编码/显示名称，<i>OtherName</i> <Icon icon="arrow-right"/> 别名)</td>
        </tr>
        <tr>
            <td><i>Gallery Category</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(固定类型<code>category</code>，<i>Category Name</i> <Icon icon="arrow-right"/> 标识编码/显示名称</td>
        </tr>
        <tr>
            <td><i>JP Title</i></td><td><Icon icon="arrow-right"/></td>
            <td>标题</td><td>(<i>JP Title</i>不存在时，使用<i>EN Title</i>)</td>
        </tr>
        <tr>
            <td><i>Uploader Comment</i>&<i>EN Title</i></td><td><Icon icon="arrow-right"/></td>
            <td>描述</td><td></td>
        </tr>
        <tr>
            <td><i>Gallery Token</i></td><td><Icon icon="arrow-right"/></td>
            <td>附加信息</td><td>(token)</td>
        </tr>
        </tbody>
    </table>
}

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
`

const StyledFixedRuleName = styled.span`
    display: inline-block;
    width: 150px;
`

const StyledFixedAdditionalKey = styled.span`
    display: inline-block;
    text-align: center;
    width: 50px;
`
