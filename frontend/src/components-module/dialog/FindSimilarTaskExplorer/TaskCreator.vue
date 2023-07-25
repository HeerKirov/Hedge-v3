<script setup lang="ts">
import { Flex, BottomLayout } from "@/components/layout"
import { Button } from "@/components/universal"
import { CheckBox, NumberInput } from "@/components/form"
import { SourceTagTypeListEditor } from "@/components-business/form-editor"
import { useTaskCreatorData } from "./context"
import TaskSelectorEditor from "./TaskSelectorEditor.vue"

defineOptions({
    inheritAttrs: false
})

const emit = defineEmits<{
    (e: "close"): void
}>()

const { form, submit } = useTaskCreatorData(() => emit("close"))

</script>

<template>
    <BottomLayout>
        <Flex class="ml-1" :width="100" :spacing="2">
            <div>
                <p class="my-2 is-font-size-large">相似项查找 新建任务</p>
                <label class="label">范围选择器</label>
                <p class="mb-2 secondary-text">要从哪些项开始查找。</p>
                <TaskSelectorEditor v-model:selector="form.selector"/>
            </div>
            <div class="pt-2">
                <label class="label">查找选项</label>
                <p class="mt-2">
                    <CheckBox v-model:value="form.config.findBySimilarity">内容相似度判断</CheckBox>
                    <p class="secondary-text">计算图像的特征指纹，比对出内容相似的图像。</p>
                </p>
                <p class="mt-3">
                    <CheckBox v-model:value="form.config.findBySourceKey">来源一致性判断</CheckBox>
                    <p class="secondary-text">对于拥有完全相同的来源、来源ID、分P的图像，直接将其判定为相同项。</p>
                </p>
                <p class="mt-1">
                    <CheckBox v-model:value="form.config.findBySourceRelation">来源关系判断</CheckBox>
                    <p class="secondary-text">根据来源的关联项、集合、分P等属性，查找出在来源具有血缘关系的图像。</p>
                </p>
                <p class="mt-1">
                    <CheckBox v-model:value="form.config.findBySourceMark">来源标记</CheckBox>
                    <p class="secondary-text">扩展功能：根据外来添加的标记获知图像之间的血缘关系。</p>
                </p>
                <label class="label mt-3">相似项查找范围</label>
                <p class="secondary-text">对于每一个待处理的任务项，按照下列可选范围查找可能的相似项。</p>
                <p class="mt-2"><CheckBox :value="form.config.filterByOtherImport">其他导入项目</CheckBox></p>
                <p class="mt-2"><CheckBox :value="form.config.filterByPartition">相同时间分区的项</CheckBox></p>
                <p class="mt-2"><CheckBox :value="form.config.filterByAuthor">相同作者标签的项</CheckBox></p>
                <p class="mt-2"><CheckBox :value="form.config.filterByTopic">相同主题标签的项</CheckBox></p>
                <p class="mt-2">
                    <p>来源类型标签过滤器</p>
                    <p class="secondary-text">根据指定的来源标签类型，选择此类型的标签，过滤持有相同来源标签的项。</p>
                    <SourceTagTypeListEditor class="mt-1" v-model:value="form.config.filterBySourceTagType"/>
                </p>
            </div>
        </Flex>

        <template #bottom>
            <div class="mt-2 has-text-right">
                <Button mode="filled" type="primary" icon="check" @click="submit">创建</Button>
            </div>
        </template>
    </BottomLayout>
</template>
