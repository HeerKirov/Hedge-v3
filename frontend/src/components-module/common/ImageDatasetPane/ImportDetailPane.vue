<script setup lang="ts">
import { ref } from "vue"
import { BasePane } from "@/components/layout"
import { Icon, Block, Button, Separator, ThumbnailImage } from "@/components/universal"
import { SourceInfo, FileInfoDisplay } from "@/components-business/form-display"
import { SourceIdentityEditor } from "@/components-business/form-editor"
import { SourceDataPath } from "@/functions/http-client/api/all"
import { useImportDetailPane } from "@/services/main/import"
import { usePopupMenu } from "@/modules/popup-menu"
import { datetime, date } from "@/utils/datetime"

defineEmits<{
    (e: "close"): void
}>()

const { data, selector: { selected }, gotoIllust, showStatusInfoMessage, openImagePreview, analyseTime, retryAllowNoSource, retryWithSource } = useImportDetailPane()

const sourceDataEditorSwitch = ref(false)
const sourceDataPathEditor = ref<SourceDataPath | null>(null)

const saveSourceDataPath = async () => {
    if(sourceDataPathEditor.value !== null && await retryWithSource(sourceDataPathEditor.value)) {
        sourceDataEditorSwitch.value = false
    }
}

const analyseTimeMenu = usePopupMenu([
    {type: "normal", label: "重新生成时间属性", enabled: false},
    {type: "separator"},
    {type: "normal", label: "根据创建时间生成", enabled: data.value?.status === "COMPLETED", click: () => analyseTime("CREATE_TIME")},
    {type: "normal", label: "根据修改时间生成", enabled: data.value?.status === "COMPLETED", click: () => analyseTime("UPDATE_TIME")},
    {type: "normal", label: "根据导入时间生成", enabled: data.value?.status === "COMPLETED", click: () => analyseTime("IMPORT_TIME")}
])

const sourceAnalyseNoneMenu = usePopupMenu([
    {type: "normal", label: "允许无来源数据", click: retryAllowNoSource},
    {type: "normal", label: "编写来源数据", click: () => sourceDataEditorSwitch.value = true},
])

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <span v-if="selected.length > 1" class="has-bg-background-color">已选择<b>{{selected.length}}</b>项</span>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template #top>
            <ThumbnailImage class="is-cursor-zoom-in" :aspect="1" :file="data?.filePath?.thumbnail" :draggable-file="data?.filePath?.original" :drag-icon-file="data?.filePath?.sample" @click="openImagePreview"/>
        </template>

        <template v-if="!!data">
            <p v-if="data.fileName" class="selectable word-wrap-anywhere mb-1">{{data.fileName}}</p>
            <p v-if="data.fileCreateTime" class="secondary-text mt-2" @contextmenu="analyseTimeMenu.popup()">文件创建时间 {{datetime.toSimpleFormat(data.fileCreateTime)}}</p>
            <p v-if="data.fileUpdateTime" class="secondary-text" @contextmenu="analyseTimeMenu.popup()">文件修改时间 {{datetime.toSimpleFormat(data.fileUpdateTime)}}</p>
            <p v-if="data.importTime" class="secondary-text" @contextmenu="analyseTimeMenu.popup()">文件导入时间 {{datetime.toSimpleFormat(data.importTime)}}</p>
            <FileInfoDisplay class="mt-2" 
                :extension="data.illust?.extension" 
                :file-size="data.illust?.size" 
                :resolution-height="data.illust?.resolutionHeight" 
                :resolution-width="data.illust?.resolutionWidth" 
                :video-duration="data.illust?.videoDuration"
            />
            <Separator direction="horizontal"/>
            <template v-if="data.statusInfo !== null">
                <Block v-if="data.statusInfo.thumbnailError" class="p-half is-font-size-small is-cursor-pointer" mode="light" color="danger" @click="showStatusInfoMessage('thumbnailError')"><Icon icon="exclamation-triangle"/>错误：缩略图生成失败。</Block>
                <Block v-if="data.statusInfo.fingerprintError" class="p-half is-font-size-small is-cursor-pointer" mode="light" color="danger" @click="showStatusInfoMessage('fingerprintError')"><Icon icon="exclamation-triangle"/>错误：指纹生成失败。</Block>
                <Block v-if="data.statusInfo.sourceAnalyseError" class="p-half is-font-size-small is-cursor-pointer" mode="light" color="danger" @click="showStatusInfoMessage('sourceAnalyseError')"><Icon icon="exclamation-triangle"/>错误：来源数据解析失败。</Block>
                <Block v-if="data.statusInfo.sourceAnalyseNone" class="p-half is-font-size-small is-cursor-pointer" mode="light" color="danger" @click="showStatusInfoMessage('sourceAnalyseNone')" @contextmenu="sourceAnalyseNoneMenu.popup()"><Icon icon="exclamation-triangle"/>错误：无来源数据。</Block>
                <template v-if="sourceDataEditorSwitch">
                    <SourceIdentityEditor class="mt-1" v-model:source="sourceDataPathEditor" @enter="saveSourceDataPath"/>
                    <Button class="mt-1 w-100" type="primary" mode="light" size="small" icon="save" @click="saveSourceDataPath">保存</Button>
                </template>
            </template>
            <template v-if="data.illust !== null">
                <div class="is-cursor-pointer" @click="gotoIllust">
                    <Icon icon="id-card"/><b class="ml-1 selectable">{{ data.illust.id }}</b>
                    <a class="float-right">在图库定位此项<Icon icon="angle-double-right"/></a>
                </div>
                <SourceInfo class="mt-1" :source="data.illust.source ?? null"/>
                <p class="mt-1 secondary-text">时间分区 {{date.toISOString(data.illust.partitionTime)}}</p>
                <p class="secondary-text">排序时间 {{datetime.toSimpleFormat(data.illust.orderTime)}}</p>
            </template>
        </template>
    </BasePane>
</template>
