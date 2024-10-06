<script setup lang="ts">
import { ref } from "vue"
import { Button, Icon } from "@/components/universal"
import { Input } from "@/components/form"
import { Collapse } from "@/components/layout"
import { ElementPopupMenu } from "@/components/interaction"
import { Site, SiteCreateForm } from "@/functions/http-client/api/setting"
import { useCreatingHelper } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { MenuItem } from "@/modules/popup-menu"
import { checkVariableName } from "@/utils/validation"
import TagTypeEditor from "./TagTypeEditor.vue"
import TagTypeMappingEditor from "./TagTypeMappingEditor.vue"
import SourceLinkRuleEditor from "./SourceLinkRuleEditor.vue"
import AdditionalFieldEditor from "./AdditionalFieldEditor.vue"

const props = defineProps<{
    builtins?: Site[]
}>()

const emit = defineEmits<{
    (e: "created", name: string): void
}>()

const message = useMessageBox()

const form = ref({
    name: "",
    title: "",
    idMode: <Site["idMode"]>"NUMBER",
    partMode: <Site["partMode"]>"NO",
    additionalInfo: <Site["additionalInfo"]>[],
    sourceLinkRules: <Site["sourceLinkRules"]>[],
    tagTypes: <Site["tagTypes"]>[],
    tagTypeMappings: <Site["tagTypeMappings"]>{}
})

const { submit } = useCreatingHelper({
    form,
    mapForm: f => (<SiteCreateForm>{
        name: f.name,
        title: f.title || undefined,
        idMode: f.idMode,
        partMode: f.partMode,
        additionalInfo: f.additionalInfo,
        sourceLinkRules: f.sourceLinkRules,
        tagTypes: f.tagTypes,
        tagTypeMappings: f.tagTypeMappings,
    }),
    create: client => client.setting.source.site.create,
    beforeCreate(form) {
        if(!form.name.trim()) {
            message.showOkMessage("prompt", "站点唯一标识名称错误。", "站点唯一标识名称不能设置为空。")
            return false
        }else if(form.name.length > 16) {
            message.showOkMessage("prompt", "站点唯一标识名称错误。", "站点唯一标识名称长度不能超过16。")
            return false
        }else if(props.builtins?.some(i => i.name === form.name.trim())) {
            message.showOkMessage("prompt", "不能使用的唯一标识名称。", `${form.name.trim()}是内置站点的标识名称。`)
            return false
        }
        for(const rule of form.sourceLinkRules) {
            if(!rule.trim()) {
                message.showOkMessage("prompt", "链接条目错误。", "链接内容不能为空。")
                return false
            }
        }
        for(const { field, label } of form.additionalInfo) {
            if(!checkVariableName(field)) {
                message.showOkMessage("prompt", "附加信息条目字段名错误。", "字段名必须以大小写字母开头，且仅允许包含大小写字母、数字、下划线。")
                return false
            }else if(!label.trim()) {
                message.showOkMessage("prompt", "附加信息条目显示名称错误。", "显示名称不能设置为空。")
                return false
            }
        }
        for(const rule of form.tagTypes) {
            if(!rule.trim()) {
                message.showOkMessage("prompt", "标签类型条目错误。", "标签类型内容不能为空。")
                return false
            }
        }
    },
    afterCreate() {
        emit("created", form.value.name)
    },
    handleError(e) {
        if(e.code === "ALREADY_EXISTS") {
            message.showOkMessage("prompt", "该站点已存在。", "请尝试编辑此站点。")
        }
    }
})

const idModeMenuItems: MenuItem<undefined>[] = [
    {type: "normal", label: "数字类型ID", click: () => form.value.idMode = "NUMBER"},
    {type: "normal", label: "字符类型ID", click: () => form.value.idMode = "STRING"},
]

const partModeMenuItems: MenuItem<undefined>[] = [
    {type: "normal", label: "不允许分页", click: () => form.value.partMode = "NO"},
    {type: "normal", label: "允许分页", click: () => form.value.partMode = "PAGE"},
    {type: "normal", label: "允许分页和可选页名", click: () => form.value.partMode = "PAGE_WITH_NAME"},
]

</script>

<template>
    <div class="flex align-center">
        <div :class="[$style['main-icon'], 'flex-item', 'no-grow-shrink', 'is-line-height-std']">
            <Icon icon="file-invoice"/>
        </div>
        <div class="flex-item w-60">
            <Input width="fullwidth" placeholder="站点显示名称" v-model:value="form.title"/>
        </div>
        <div class="flex-item w-40 is-line-height-std has-text-secondary pl-2">
            <Input width="fullwidth" placeholder="站点唯一标识名称" v-model:value="form.name"/>
        </div>
    </div>
    <div class="flex no-wrap mt-1">
        <div class="flex-item w-30">
            <label class="label mb-1">ID类型</label>
            <ElementPopupMenu :items="idModeMenuItems" position="bottom" align="left" v-slot="{ popup, setEl, attrs}">
                <a :ref="setEl" v-bind="attrs" :class="form.idMode === 'STRING' ? 'has-text-primary' : 'has-text-secondary'" @click="popup"><Icon :icon="form.idMode === 'STRING' ? 'font' : '1'"/>{{form.idMode === 'STRING' ? '字符类型ID' : '数字类型ID'}}</a>
            </ElementPopupMenu>
        </div>
        <div class="flex-item w-30">
            <label class="label mb-1">分页</label>
            <ElementPopupMenu :items="partModeMenuItems" position="bottom" align="left" v-slot="{ popup, setEl, attrs}">
                <a :ref="setEl" v-bind="attrs" :class="form.partMode !== 'NO' ? 'has-text-primary' : 'has-text-secondary'" @click="popup"><Icon :icon="form.partMode !== 'NO' ? 'check' : 'close'"/>{{form.partMode === 'PAGE_WITH_NAME' ? '允许分页和可选页名' : form.partMode === 'PAGE' ? '允许分页' : '不允许分页'}}</a>
            </ElementPopupMenu>
        </div>
    </div>
    <div class="mt-1">
        <label class="label">附加字段</label>
        <AdditionalFieldEditor class="mt-1" v-model:additional-info="form.additionalInfo" editable/>
    </div>
    <div class="mt-1">
        <label class="label">来源标签类型</label>
        <TagTypeEditor class="mt-1" v-model:tag-types="form.tagTypes" editable/>
    </div>
    <Collapse class="mt-1" title="来源标签类型映射" memory-bucket="setting/sites/collapse/tag-type-mappings">
        <TagTypeMappingEditor class="mt-1" v-model:tag-type-mappings="form.tagTypeMappings" editable/>
    </Collapse>
    <Collapse class="mt-1" title="链接" memory-bucket="setting/sites/collapse/source-link-rules">
        <SourceLinkRuleEditor class="mt-1" v-model:source-link-rules="form.sourceLinkRules" editable/>
    </Collapse>
    <Button class="w-100 mt-1" mode="filled" type="primary" icon="check" @click="submit">创建</Button>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
.main-icon
    position: relative
    width: $element-height-std
    > svg
        position: absolute
        left: 50%
        top: 50%
        transform: translate(-50%, -50%)
        display: inline-block
        width: 20px
        height: 20px

.tag-block
    padding: 0 $spacing-2
    line-height: #{$element-height-small - 2px}
</style>

