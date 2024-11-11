<script setup lang="ts">
import { Flex, BottomLayout } from "@/components/layout"
import { Button } from "@/components/universal"
import { CheckBox } from "@/components/form"
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
                <div class="mt-2">
                    <CheckBox v-model:value="form.config.findBySimilarity">内容相似度判断</CheckBox>
                    <p class="secondary-text">计算图像的特征指纹，比对出内容相似的图像。</p>
                </div>
                <div class="mt-3">
                    <CheckBox v-model:value="form.config.findBySourceIdentity">来源一致性判断</CheckBox>
                    <p class="secondary-text">对于拥有相同的来源、ID、分页的图像，或拥有相同的来源、页名的图像，将其判定为相同项。</p>
                </div>
                <div class="mt-3">
                    <CheckBox v-model:value="form.config.findBySourcePart">来源近似性判断</CheckBox>
                    <p class="secondary-text">对于拥有相同的来源、ID，但分页不同的图像，将其判定为关系相近项。</p>
                </div>
                <div class="mt-1">
                    <CheckBox v-model:value="form.config.findBySourceRelation">来源关系判断</CheckBox>
                    <p class="secondary-text">对于来源的关联项相关的图像，将其判定为关系相近项。</p>
                </div>
                <div class="mt-1">
                    <CheckBox v-model:value="form.config.findBySourceBook">来源集合判断</CheckBox>
                    <p class="secondary-text">对于来源的集合相关的图像，将其判定为关系相近项。</p>
                </div>
                <label class="label mt-3">相似项查找范围</label>
                <p class="secondary-text">对于每一个待处理的任务项，按照下列可选范围查找其可能的相似项。</p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterInCurrentScope">当前待处理的所有项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterByPartition">相同时间分区的项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterByAuthor">相同作者标签的项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterByTopic">相同主题标签的项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterBySourcePart">相同来源、ID的项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterBySourceBook">相同来源集合的项</CheckBox></p>
                <p class="mt-2"><CheckBox v-model:value="form.config.filterBySourceRelation">来源关系相关的项</CheckBox></p>
                <div class="mt-2">
                    <p>来源类型标签过滤器</p>
                    <p class="secondary-text">根据指定的来源标签类型，选择此类型的标签，过滤持有相同来源标签的项。</p>
                    <SourceTagTypeListEditor class="mt-1" v-model:value="form.config.filterBySourceTagType"/>
                </div>
            </div>
        </Flex>

        <template #bottom>
            <div class="mt-2 has-text-right">
                <Button mode="filled" type="primary" icon="check" @click="submit">创建</Button>
            </div>
        </template>
    </BottomLayout>
</template>
