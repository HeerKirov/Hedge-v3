import React, { useState, ReactNode } from "react"
import { styled } from "styled-components"
import { Button, CheckBox, Group, Icon, Input, Label, LayouttedDiv, SecondaryText, Header, Separator, CollapsePanel } from "@/components"
import { defaultSetting, Setting } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { useAsyncLoading, useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { DanbooruIcon, EHentaiIcon, FanboxIcon, FantiaIcon, GelbooruIcon, KemonoIcon, PixivIcon, SankakuIcon } from "@/styles/assets"

interface OptionsToolkitPanelProps {
    toolkit: Setting["toolkit"] | null | undefined
    onUpdateToolkit?(toolkit: Setting["toolkit"]): void
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

export function OptionsToolkitPanel(props: OptionsToolkitPanelProps) {
    const [closeAutoCollect, refreshCloseAutoCollect] = useAsyncLoading({call: sessions.cache.closeAutoCollect, default: false})

    const resetCloseAutoCollect = async () => {
        if(closeAutoCollect) {
            await sessions.cache.closeAutoCollect(false)
            refreshCloseAutoCollect(false)
        }
    }

    const { editor, changed, setProperty, save } = useEditor({
        value: props.toolkit,
        updateValue: props.onUpdateToolkit,
        default: () => defaultSetting().toolkit
    })

    const setDownloadToolbar = usePartialSet(editor.downloadToolbar, v => setProperty("downloadToolbar", v))
    const setDeterminingFilename = usePartialSet(editor.determiningFilename, v => setProperty("determiningFilename", v))

    const addCustomRule = (item: DeterminingRule) => {
        setDeterminingFilename("rules", [...editor.determiningFilename.rules, item])
    }

    const updateCustomRuleAt = (index: number, item: DeterminingRule) => {
        setDeterminingFilename("rules", [...editor.determiningFilename.rules.slice(0, index), item, ...editor.determiningFilename.rules.slice(index + 1)])
    }

    const removeCustomRuleAt = (index: number) => {
        setDeterminingFilename("rules", [...editor.determiningFilename.rules.slice(0, index), ...editor.determiningFilename.rules.slice(index + 1)])
    }

    return <>
        <Header>下载工具栏</Header>
        <p>在受支持的网站中，为视图页主图像附加下载工具栏，通过此工具栏以以统一的方式下载文件，并自动对其进行重命名。</p>
        <IconDisplayDiv>
            <Label>支持的网站</Label>
            <img src={EHentaiIcon} alt="e-hentai icon"/><span>E-Hentai</span>
            <img src={FanboxIcon} alt="fanbox icon"/><span>FANBOX</span>
            <img src={KemonoIcon} alt="kemono icon"/><span>Kemono</span>
            <img src={SankakuIcon} alt="sankaku icon"/><span>Sankaku</span>
        </IconDisplayDiv>
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.downloadToolbar.enabled} onUpdateChecked={v => setDownloadToolbar("enabled", v)}>启用下载工具栏</CheckBox>
        </LayouttedDiv>

        <Separator spacing={[4, 1]}/>
        <Header>文件下载重命名</Header>
        <p>在受支持的网站中，当下载符合格式的文件时，自动对其进行重命名，使其符合来源数据识别的默认格式。</p>
        <IconDisplayDiv>
            <Label>支持的网站</Label>
            <img src={PixivIcon} alt="pixiv icon"/><span>Pixiv</span>
            <img src={FantiaIcon} alt="fantia icon"/><span>Fantia</span>
            <img src={DanbooruIcon} alt="danbooru icon"/><span>Danbooru</span>
            <img src={GelbooruIcon} alt="gelbooru icon"/><span>Gelbooru</span>
        </IconDisplayDiv>
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.determiningFilename.enabled} onUpdateChecked={v => setDeterminingFilename("enabled", v)}>启用文件下载重命名</CheckBox>
        </LayouttedDiv>
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.determiningFilename.referrerPolicy} onUpdateChecked={v => setDeterminingFilename("referrerPolicy", v)}>Referrer Policy注入</CheckBox>
            <SecondaryText>Chrome已禁止获得详细referrer，这会使重命名功能在某些网站完全不可用。开启此功能后，将在上述网站注入元数据，以允许下载项获得详细referrer。</SecondaryText>
        </LayouttedDiv>
        <Label>自定义规则</Label>
        <SecondaryText>添加自定义的重命名规则。referrer、url、filename全部正则匹配成功时，应用规则，并从其中提取参数，用于重命名模板。</SecondaryText>
        {editor.determiningFilename.rules.map((customRule, i) => <DeterminingRuleItem key={i} {...customRule} onUpdate={v => updateCustomRuleAt(i, v)} onRemove={() => removeCustomRuleAt(i)}/>)}
        <DeterminingRuleAddItem onAdd={addCustomRule}/>
        <Label>自定义扩展名</Label>
        <div>
            <SecondaryText>添加额外的可以触发文件重命名的扩展名。以逗号(,)分隔多个扩展名。</SecondaryText>
            <Input value={editor.determiningFilename.extensions.join(", ")} onUpdateValue={v => setDeterminingFilename("extensions", v.split(",").map(s => s.trim()).filter(s => !!s))}/>
        </div>

        <Separator spacing={[4, 1]}/>
        <Header>附件下载重命名标注</Header>
        <p>在受支持的网站中，当下载符合格式的附件时，自动在其文件名前添加<code>[ID]</code>作为标注。</p>
        <SecondaryText>支持的扩展名：ZIP, 7Z, PSD, CLIP</SecondaryText>
        <IconDisplayDiv>
            <Label>支持的网站</Label>
            <img src={FanboxIcon} alt="fanbox icon"/><span>FANBOX</span>
            <img src={KemonoIcon} alt="kemono icon"/><span>Kemono</span>
        </IconDisplayDiv>
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.determiningFilename.enabledAttachment} onUpdateChecked={v => setDeterminingFilename("enabledAttachment", v)}>启用附件下载重命名标注</CheckBox>
        </LayouttedDiv>

        <Separator spacing={[4, 1]}/>
        <Header>来源数据收集</Header>
        <p>在受支持的网站中，扩展可以自行分析来源项的来源数据，且可以伴随下载操作自动收集。</p>
        <IconDisplayDiv>
            <Label>支持的网站</Label>
            <img src={EHentaiIcon} alt="e-hentai icon"/><span>E-Hentai</span>
            <img src={PixivIcon} alt="pixiv icon"/><span>Pixiv</span>
            <img src={FanboxIcon} alt="fanbox icon"/><span>FANBOX</span>
            <img src={FantiaIcon} alt="fantia icon"/><span>Fantia</span>
            <img src={KemonoIcon} alt="kemono icon"/><span>Kemono(部分)</span>
            <img src={SankakuIcon} alt="sankaku icon"/><span>Sankaku</span>
        </IconDisplayDiv>
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.downloadToolbar.autoCollectSourceData} onUpdateChecked={v => setDownloadToolbar("autoCollectSourceData", v)}>在通过下载工具栏下载时，同步收集来源数据</CheckBox>
        </LayouttedDiv>
        {closeAutoCollect && <LayouttedDiv mt={1}>
            <Icon icon="warning" mr={1}/><b>自动收集功能已临时关闭。</b>
            <Button size="small" type="primary" onClick={resetCloseAutoCollect}><Icon icon="toggle-on" mr={1}/>重新打开</Button>
        </LayouttedDiv>}
        <LayouttedDiv mt={1}>
            <CheckBox checked={editor.determiningFilename.autoCollectSourceData} onUpdateChecked={v => setDeterminingFilename("autoCollectSourceData", v)}>在触发文件下载重命名时，同步收集来源数据</CheckBox>
        </LayouttedDiv>
        <LayouttedDiv mt={3}>
            {Object.keys(SOURCE_DATA_RULE_DESCRIPTIONS).map(name => <CollapsePanel key={name} prefix={<StyledFixedRuleName>{name}</StyledFixedRuleName>} title="收集内容详情" mt={1} panel={{border: true, radius: "std", padding: 2}}>
                {SOURCE_DATA_RULE_DESCRIPTIONS[name]}
            </CollapsePanel>)}
        </LayouttedDiv>
        <LayouttedDiv mt={2}>
            {changed && <>
                <Separator spacing={2}/>
                <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>
            </>}
        </LayouttedDiv>
    </>
}

function DeterminingRuleItem({ onUpdate, onRemove, ...rule }: DeterminingRuleItemProps) {
    return <LayouttedDiv mb={1}>
        <Group>
            <Input placeholder="referrer" value={rule.referrer} onUpdateValue={v => onUpdate({...rule, referrer: v})}/>
            <Input placeholder="url" value={rule.url} onUpdateValue={v => onUpdate({...rule, url: v})}/>
            <Input placeholder="filename" value={rule.filename} onUpdateValue={v => onUpdate({...rule, filename: v})}/>
            <Input placeholder="重命名模板" value={rule.rename} onUpdateValue={v => onUpdate({...rule, rename: v})}/>
            <Button onClick={onRemove}><Icon icon="trash"/></Button>
        </Group>
    </LayouttedDiv>
}

function DeterminingRuleAddItem({ onAdd }: {onAdd(item: DeterminingRule): void}) {
    const [referrer, setReferrer] = useState("")
    const [url, setUrl] = useState("")
    const [filename, setFilename] = useState("")
    const [rename, setRename] = useState("")

    const disabled = !((referrer || url || filename) && rename)

    const add = () => {
        onAdd({referrer, url, filename, rename})
        setReferrer("")
        setUrl("")
        setFilename("")
        setRename("")
    }

    return <Group>
        <Input placeholder="referrer" value={referrer} onUpdateValue={setReferrer}/>
        <Input placeholder="url" value={url} onUpdateValue={setUrl}/>
        <Input placeholder="filename" value={filename} onUpdateValue={setFilename}/>
        <Input placeholder="重命名模板 $<参数>" value={rename} onUpdateValue={setRename}/>
        <Button disabled={disabled} mode={!disabled ? "filled" : "transparent"} type={!disabled ? "success" : undefined} onClick={add}><Icon icon="plus"/> 添加</Button>
    </Group>
}

const IconDisplayDiv = styled.div`
    margin: ${SPACINGS[2]} 0 ${SPACINGS[3]} 0;
    display: flex;
    align-items: center;
    > :first-child {
        margin-right: ${SPACINGS[4]};
    }
    > img {
        width: 16px;
        height: 16px;
    }
    > span {
        padding: 0 ${SPACINGS[2]};
    }
    
`

const StyledSaveButton = styled(Button)`
    padding: 0 ${SPACINGS[5]};
`

const StyledFixedRuleName = styled.span`
    display: inline-block;
    width: 75px;
`

const SOURCE_DATA_RULE_DESCRIPTIONS: Record<string, ReactNode> = {
    "E-Hentai": <table>
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
    </table>,
    "Pixiv": <table>
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
            <td>来源标签</td><td>(固定类型<code>tag</code>，<i>TagName</i> <Icon icon="arrow-right"/> 标识名称/显示名称，<i>SecondaryName</i> <Icon icon="arrow-right"/> 别名)</td>
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
    "Fanbox": <table>
        <tbody>
        <tr>
            <td><i>Post</i></td><td>作为</td>
            <td>来源数据项</td><td>(<i>PostID</i> 作为 来源ID，其中的项作为分页)</td>
        </tr>
        <tr>
            <td><i>Post Image</i></td><td>作为</td>
            <td>分页</td><td>(<i>Image Index</i> 作为 分页，封面为0，内容从1开始)</td>
        </tr>
        <tr>
            <td><i>Creator</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(固定类型<code>artist</code>，<i>UserId</i> <Icon icon="arrow-right"/> 标识编码，<i>UserName</i> <Icon icon="arrow-right"/> 显示名称, <i>CreatorId</i> <Icon icon="arrow-right"/> 别名)</td>
        </tr>
        <tr>
            <td><i>Tag</i></td><td><Icon icon="arrow-right"/></td>
            <td>来源标签</td><td>(固定类型<code>tag</code>，<i>TagName</i> <Icon icon="arrow-right"/> 标识名称/显示名称)</td>
        </tr>
        <tr>
            <td><i>Title</i></td><td><Icon icon="arrow-right"/></td>
            <td>标题</td><td></td>
        </tr>
        <tr>
            <td><i>Content</i></td><td><Icon icon="arrow-right"/></td>
            <td>描述</td><td></td>
        </tr>
        </tbody>
    </table>,
    "Sankaku": <table>
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
}
