import { useState } from "react"
import { styled } from "styled-components"
import { Button, CheckBox, Group, Icon, Input, Label, LayouttedDiv, SecondaryText } from "@/components"
import { defaultSetting, Setting } from "@/functions/setting"
import { useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"

interface OptionsToolkitPanelProps {
    toolkit: Setting["toolkit"] | null | undefined
    onUpdateToolkit?(toolkit: Setting["toolkit"]): void
}

export function OptionsToolkitPanel(props: OptionsToolkitPanelProps) {
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
        <h3>下载工具栏</h3>
        <p>在所有受支持站点的图像详情页中，为图像附加下载工具栏。通过此工具栏，可以以统一的方式开始下载，自动按照来源重命名，并收集来源数据。</p>
        <CheckBox checked={editor.downloadToolbar.enabled} onUpdateChecked={v => setDownloadToolbar("enabled", v)}>启用</CheckBox>
        <CheckBox checked={editor.downloadToolbar.autoCollectSourceData} onUpdateChecked={v => setDownloadToolbar("autoCollectSourceData", v)}>启用自动收集来源数据</CheckBox>
        <h3>文件下载重命名</h3>
        <p>自定义规则以在任意站点支持任意形式的文件下载重命名。只要该站点提供了足够的信息。</p>
        <CheckBox checked={editor.determiningFilename.enabled} onUpdateChecked={v => setDeterminingFilename("enabled", v)}>启用</CheckBox>
        <CheckBox checked={editor.determiningFilename.autoCollectSourceData} onUpdateChecked={v => setDeterminingFilename("autoCollectSourceData", v)}>启用自动收集来源数据</CheckBox>
        <Label>扩展名</Label>
        <div>
            <SecondaryText>何种扩展名可以触发文件重命名。以逗号(,)分隔多个扩展名。</SecondaryText>
            <Input value={editor.determiningFilename.extensions.join(", ")} onUpdateValue={v => setDeterminingFilename("extensions", v.split(",").map(s => s.trim()).filter(s => !!s))}/>
        </div>
        <Label>重命名规则</Label>
        <SecondaryText>referrer、url、filename全部正则匹配成功时，应用规则。</SecondaryText>
        {editor.determiningFilename.rules.map((customRule, i) => <DeterminingRuleItem key={i} {...customRule} onUpdate={v => updateCustomRuleAt(i, v)} onRemove={() => removeCustomRuleAt(i)}/>)}
        <DeterminingRuleAddItem onAdd={addCustomRule}/>
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
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

function DeterminingRuleItem({ onUpdate, onRemove, ...rule }: DeterminingRuleItemProps) {
    return <LayouttedDiv mt={1}>
        <Group>
            <Input placeholder="referrer" value={rule.referrer} onUpdateValue={v => onUpdate({...rule, referrer: v})}/>
            <Input placeholder="url" value={rule.url} onUpdateValue={v => onUpdate({...rule, url: v})}/>
            <Input placeholder="filename" value={rule.filename} onUpdateValue={v => onUpdate({...rule, filename: v})}/>
            <Input placeholder="重命名模板" value={rule.rename} onUpdateValue={v => onUpdate({...rule, rename: v})}/>
            <Button onClick={onRemove}>删除</Button>
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
        <Input placeholder="重命名模板" value={rename} onUpdateValue={setRename}/>
        <Button disabled={disabled} onClick={add}>添加</Button>
    </Group>
}

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
`
