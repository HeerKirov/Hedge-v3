import { useState } from "react"
import { styled } from "styled-components"
import { Button, CheckBox, Group, Icon, Input, Label, LayouttedDiv, SecondaryText } from "@/components"
import { DOWNLOAD_RENAME_SITES, DOWNLOAD_EXTENSIONS } from "@/functions/sites"
import { Setting } from "@/functions/setting"
import { useEditor } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"

interface OptionsDownloadPanelProps {
    download: Setting["download"] | null | undefined
    onUpdateDownload?(download: Setting["download"]): void
}

export function OptionsDownloadPanel(props: OptionsDownloadPanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.download,
        updateValue: props.onUpdateDownload,
        from: v => ({
            customExtensions: v.customExtensions.join(", "),
            customRules: v.customRules,
            rules: Object.entries(DOWNLOAD_RENAME_SITES).map(([siteName, site]) => {
                const overrideRule = v.overrideRules[siteName]
                return {
                    siteName,
                    rename: overrideRule?.rename ?? site.rename,
                    enable: overrideRule?.enable ?? true
                }
            })
        }),
        to: f => ({
            customExtensions: f.customExtensions.split(",").map(s => s.trim()).filter(s => !!s),
            customRules: f.customRules,
            overrideRules: (() => {
                const overrideRules: Record<string, {enable: boolean, rename: string}> = {}
                for(let i = 0; i < f.rules.length; ++i) {
                    const rule = f.rules[i], stdRule = DOWNLOAD_RENAME_SITES[rule.siteName]
                    if(!rule.enable || rule.rename !== stdRule.rename) {
                        overrideRules[rule.siteName] = {enable: rule.enable, rename: rule.rename}
                    }
                }
                return overrideRules
            })()
        }),
        default: () => ({
            customExtensions: "",
            customRules: [],
            rules: []
        })
    })

    const updateStandardRuleAt = (index: number, item: StandardRule) => {
        setProperty("rules", [...editor.rules.slice(0, index), item, ...editor.rules.slice(index + 1)])
    }

    const addCustomRule = (item: CustomRule) => {
        setProperty("customRules", [...editor.customRules, item])
    }

    const updateCustomRuleAt = (index: number, item: CustomRule) => {
        setProperty("customRules", [...editor.customRules.slice(0, index), item, ...editor.customRules.slice(index + 1)])
    }

    const removeCustomRuleAt = (index: number) => {
        setProperty("customRules", [...editor.customRules.slice(0, index), ...editor.customRules.slice(index + 1)])
    }

    return <>
        <div>
            文件下载功能提供在图源网站下载图像时的重命名建议功能，在建议名称中包含图源网站的类型、图像ID等信息，方便保存后的溯源操作。
        </div>
        <Label>自定义扩展名</Label>
        <div>
            <SecondaryText>何种扩展名可以触发建议。以逗号(,)分隔多个扩展名。默认的扩展名包括{DOWNLOAD_EXTENSIONS.join(", ")}。</SecondaryText>
            <Input value={editor.customExtensions} onUpdateValue={v => setProperty("customExtensions", v)}/>
        </div>
        <Label>重命名规则</Label>
        <SecondaryText>内置的重命名规则。可以调整规则的启用与否，以及重命名模板。</SecondaryText>
        {editor.rules.map((rule, i) => <StandardRuleItem key={rule.siteName} {...rule} onUpdate={v => updateStandardRuleAt(i, v)}/>)}
        <Label>自定义重命名规则</Label>
        <SecondaryText>自行添加的重命名规则。referrer、url、filename全部正则匹配成功时，应用规则。</SecondaryText>
        {editor.customRules.map((customRule, i) => <CustomRuleItem key={i} {...customRule} onUpdate={v => updateCustomRuleAt(i, v)} onRemove={() => removeCustomRuleAt(i)}/>)}
        <CustomRuleAddItem onAdd={addCustomRule}/>
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

interface CustomRule {
    rename: string
    referrer: string | null
    filename: string | null
    url: string | null
}

interface StandardRule {
    siteName: string
    rename: string
    enable: boolean
}

interface CustomRuleItemProps extends CustomRule {
    onUpdate(item: CustomRule): void
    onRemove(): void
}

interface StandardRuleProps extends StandardRule {
    onUpdate(item: StandardRule): void
}

function StandardRuleItem({ onUpdate, ...rule }: StandardRuleProps) {
    return <LayouttedDiv mt={1}>
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}/>
        <StyledFixedRuleName>{rule.siteName}</StyledFixedRuleName>
        <Input width="300px" placeholder="重命名模板" disabled={!rule.enable} value={rule.rename} onUpdateValue={v => onUpdate({...rule, rename: v})}/>
    </LayouttedDiv>
}

function CustomRuleItem({ onUpdate, onRemove, ...rule }: CustomRuleItemProps) {
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

function CustomRuleAddItem({ onAdd }: {onAdd(item: CustomRule): void}) {
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
        <Input placeholder="url"  value={url} onUpdateValue={setUrl}/>
        <Input placeholder="filename"  value={filename} onUpdateValue={setFilename}/>
        <Input placeholder="重命名模板"  value={rename} onUpdateValue={setRename}/>
        <Button disabled={disabled} onClick={add}>添加</Button>
    </Group>
}

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
`

const StyledFixedRuleName = styled.span`
    display: inline-block;
    width: 150px;
`
