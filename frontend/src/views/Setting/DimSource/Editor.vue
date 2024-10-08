<script setup lang="ts">
import { toRef } from "vue"
import { Input } from "@/components/form"
import { Block, Icon } from "@/components/universal"
import { Collapse } from "@/components/layout"
import { FormEditKit } from "@/components/interaction"
import { Site } from "@/functions/http-client/api/setting"
import { useFetchEndpoint } from "@/functions/fetch"
import { useMessageBox } from "@/modules/message-box"
import { SITE_ICONS, SITE_FEATURES, SITE_FEATURE_DESCRIPTIONS } from "@/constants/site"
import { checkVariableName } from "@/utils/validation"
import { objects } from "@/utils/primitives"
import TagTypeEditor from "./TagTypeEditor.vue"
import TagTypeMappingEditor from "./TagTypeMappingEditor.vue"
import AdditionalFieldEditor from "./AdditionalFieldEditor.vue"
import SourceLinkRuleEditor from "./SourceLinkRuleEditor.vue"

const props = defineProps<{
    name: string
    ordinal: number
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const message = useMessageBox()

const { data, setData, deleteData } = useFetchEndpoint({
    path: toRef(props, "name"),
    get: client => client.setting.source.site.get,
    update: client => client.setting.source.site.update,
    delete: client => client.setting.source.site.delete,
    afterDelete() {
        emit("close")
    },
})

const setTitle = async (title: string) => {
    return (title || null) === data.value?.title || await setData({ title: title || null })
}

const setAdditionalInfo = async (additionalInfo: Site["additionalInfo"]) => {
    for(const { field, label } of additionalInfo) {
        if(!checkVariableName(field)) {
            message.showOkMessage("prompt", "附加信息条目字段名错误。", "字段名必须以大小写字母开头，且仅允许包含大小写字母、数字、下划线。")
            return
        }else if(!label.trim()) {
            message.showOkMessage("prompt", "附加信息条目显示名称错误。", "显示名称不能设置为空。")
            return
        }
    }
    return objects.deepEquals(additionalInfo, data.value?.additionalInfo) || await setData({ additionalInfo })
}

const setSourceLinkRules = async (sourceLinkRules: Site["sourceLinkRules"]) => {
    for(const rule of sourceLinkRules) {
        if(!rule.trim()) {
            message.showOkMessage("prompt", "链接条目错误。", "链接内容不能为空。")
            return
        }
    }
    return objects.deepEquals(sourceLinkRules, data.value?.sourceLinkRules) || await setData({ sourceLinkRules })
}

const setTagTypes = async (tagTypes: Site["tagTypes"]) => {
    for(const rule of tagTypes) {
        if(!rule.trim()) {
            message.showOkMessage("prompt", "标签类型条目错误。", "标签类型内容不能为空。")
            return
        }
    }
    return objects.deepEquals(tagTypes, data.value?.tagTypes) || await setData({ tagTypes })
}

const setTagTypeMappings = async (tagTypeMappings: Site["tagTypeMappings"]) => {
    return objects.deepEquals(tagTypeMappings, data.value?.tagTypeMappings) || await setData({ tagTypeMappings })
}

const trash = async () => {
    if(await message.showYesNoMessage("warn", "确定删除此站点吗？", "此操作不可撤回。")) {
        await deleteData()
    }
}

</script>

<template>
    <div class="flex jc-between align-baseline">
        <label class="flex-item no-grow-shrink label mt-2 mb-1">{{ data?.isBuiltin ? '内建站点' : '自定义站点'}}</label>
        <div class="flex-item w-100"/>
        <a class="flex-item no-grow-shrink is-font-size-small has-text-danger" @click="trash"><Icon icon="trash"/>删除站点</a>
    </div>
    <div v-if="data !== null" class="flex align-center">
        <div :class="[$style['main-icon'], 'flex-item', 'no-grow-shrink', 'is-line-height-std']">
            <img v-if="data.isBuiltin" :src="SITE_ICONS[name]" alt="site icon"/>
            <Icon v-else icon="file-invoice"/>
        </div>
        <div class="flex-item w-60">
            <FormEditKit :value="data.title" :set-value="setTitle" :editable="!data.isBuiltin">
                <template #default="{ value }">
                    <Block mode="transparent" class="is-line-height-std px-2">{{value}}</Block>
                </template>
                <template #edit="{ value, setValue, save }">
                    <Input width="fullwidth" placeholder="站点显示名称" :value="value" @update:value="setValue" update-on-input @enter="save"/>
                </template>
            </FormEditKit>
        </div>
        <div class="flex-item w-40 is-line-height-std has-text-secondary pl-2">
            ({{name}})
        </div>
    </div>
    <div v-if="data !== null" class="flex mt-1">
        <div class="flex-item w-30">
            <label class="label mb-1">ID类型</label>
            <span :class="data.idMode === 'STRING' ? 'has-text-primary' : 'has-text-secondary'"><Icon :icon="data.idMode === 'STRING' ? 'font' : '1'"/>{{data.idMode === 'STRING' ? '字符类型ID' : '数字类型ID'}}</span>
        </div>
        <div class="flex-item w-30">
            <label class="label mb-1">分页</label>
            <span :class="data.partMode !== 'NO' ? 'has-text-primary' : 'has-text-secondary'"><Icon :icon="data.partMode !== 'NO' ? 'check' : 'close'"/>{{data.partMode === 'PAGE_WITH_NAME' ? '允许分页和可选页名' : data.partMode === 'PAGE' ? '允许分页' : '不允许分页'}}</span>
        </div>
    </div>
    <div class="mt-1">
        <p v-for="item in SITE_FEATURES[name]" class="secondary-text">
            <Icon icon="exclamation-triangle"/>{{SITE_FEATURE_DESCRIPTIONS[item]}}
        </p>
    </div>
    <div v-if="data !== null" class="mt-1">
        <label class="label">附加字段</label>
        <AdditionalFieldEditor class="mt-1" :additional-info="data.additionalInfo" @update:additional-info="setAdditionalInfo" :editable="!data.isBuiltin"/>
    </div>
    <div v-if="data !== null" class="mt-1">
        <label class="label">来源标签类型</label>
        <TagTypeEditor class="mt-1" :tag-types="data.tagTypes" @update:tag-types="setTagTypes" :editable="!data.isBuiltin"/>
    </div>
    <Collapse v-if="data !== null" class="mt-1" title="来源标签类型映射" memory-bucket="setting/sites/collapse/tag-type-mappings">
        <TagTypeMappingEditor class="mt-1" :tag-type-mappings="data.tagTypeMappings" @update:tag-type-mappings="setTagTypeMappings" :editable="!data.isBuiltin"/>
    </Collapse>
    <Collapse v-if="data !== null" class="mt-1" title="链接" memory-bucket="setting/sites/collapse/source-link-rules">
        <SourceLinkRuleEditor class="mt-1" :source-link-rules="data.sourceLinkRules" @update:source-link-rules="setSourceLinkRules" :editable="!data.isBuiltin"/>
    </Collapse>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
.main-icon
    position: relative
    width: $element-height-std
    > img, svg
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
