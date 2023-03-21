<script setup lang="ts">
import { toRefs } from "vue"
import { ThumbnailImage, Icon, Button, Separator } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { TagmeEditor, DateEditor, DescriptionEditor, DateTimeEditor, ScoreEditor } from "@/components-business/form-editor"
import { useIllustDetailPaneMultiple } from "@/services/main/illust"

const props = defineProps<{
    selected: number[]
    latest: number
}>()

const { selected, latest } = toRefs(props)

const { data, actives, anyActive, form, submit, clear } = useIllustDetailPaneMultiple(selected, latest)

</script>

<template>
    <ThumbnailImage minHeight="12rem" maxHeight="40rem" :file="data?.thumbnailFile"/>
    <p class="mt-1 mb-1">
        <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{data?.id}}</b>
    </p>
    <Separator direction="horizontal"/>
    <p class="mt-2"><Icon icon="edit"/>批量编辑</p>
    <p class="mt-2"><CheckBox v-model:value="actives.metaTag">设置标签</CheckBox></p>
    <template v-if="actives.metaTag">
        <a>编辑已选择的标签</a>
        <p>已设置{{form.tags.length}}个标签、{{form.topics.length}}个主题、{{form.authors.length}}个作者</p>
        <p class="mb-2"><i class="secondary-text">批量设定将覆盖所有已存在的标签。</i></p>
    </template>
    <p class="mt-1"><CheckBox v-model:value="actives.tagme">设置Tagme</CheckBox></p>
    <TagmeEditor v-if="actives.tagme" class="mt-1 mb-2" v-model:value="form.tagme"/>
    <p class="mt-1"><CheckBox v-model:value="actives.description">设置描述</CheckBox></p>
    <DescriptionEditor v-if="actives.description" class="mt-1 mb-2" v-model:value="form.description"/>
    <p class="mt-1"><CheckBox v-model:value="actives.score">设置评分</CheckBox></p>
    <ScoreEditor v-if="actives.score" class="mt-1 mb-2" v-model:value="form.score"/>
    <p class="mt-1"><CheckBox v-model:value="actives.partitionTime">设置时间分区</CheckBox></p>
    <DateEditor v-if="actives.partitionTime" class="mt-1 mb-2" v-model:value="form.partitionTime"/>
    <p class="mt-1"><CheckBox v-model:value="actives.orderTime">设置排序时间范围</CheckBox></p>
    <template v-if="actives.orderTime">
        <label class="label mt-1">起始时间点</label>
        <DateTimeEditor class="mt-1" v-model:value="form.orderTime.begin"/>
        <label class="label mt-1">末尾时间点</label>
        <DateTimeEditor class="mt-1" v-model:value="form.orderTime.end"/>
        <p class="mb-1"><i class="secondary-text">批量设定的排序时间将均匀分布在设定的时间范围内。</i></p>
    </template>
    <Button class="w-100 mt-3" icon="check" :type="anyActive ? 'primary' : undefined" :mode="anyActive ? 'filled' : undefined" :disabled="!anyActive" @click="submit">批量更改</Button>
</template>
