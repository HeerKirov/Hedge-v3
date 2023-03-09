<script setup lang="ts">
import { Icon, Tag, Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SimpleMetaTagElement } from "@/components-business/element"
import { useEditorContext } from "./context"

const {
    typeFilter,
    form: {
        submit, submittable, removeAt,
        tags, topics, authors,
        validation: { exportedResults, validationResults },
        history: { canRedo, canUndo, undo, redo }
    }
} = useEditorContext()

//TODO 左键打开callout

</script>

<template>
    <BottomLayout>
        <div class="p-4">
            <template v-if="typeFilter.author">
                <SimpleMetaTagElement v-for="(author, idx) in authors" :key="author.id" class="mb-1" type="author" :value="author" wrapped-by-div>
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="author.color" icon="close" clickable @click="removeAt('author', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="typeFilter.topic">
                <SimpleMetaTagElement v-for="(topic, idx) in topics" :key="topic.id" class="mb-1" type="topic" :value="topic" wrapped-by-div>
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="topic.color" icon="close" clickable @click="removeAt('topic', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="typeFilter.tag">
                <SimpleMetaTagElement v-for="(tag, idx) in tags" :key="tag.id" class="mb-1" type="tag" :value="tag" wrapped-by-div>
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="tag.color" icon="close" clickable @click="removeAt('tag', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="exportedResults.tags.length > 0 || exportedResults.topics.length > 0 || exportedResults.authors.length > 0">
                <i class="label mt-3">已导出</i>
                <SimpleMetaTagElement v-for="author in exportedResults.authors" :key="author.id" class="mt-1" type="author" :value="author" wrapped-by-div/>
                <SimpleMetaTagElement v-for="topic in exportedResults.topics" :key="topic.id" class="mt-1" type="topic" :value="topic" wrapped-by-div/>
                <SimpleMetaTagElement v-for="tag in exportedResults.tags" :key="tag.id" class="mt-1" type="tag" :value="tag" wrapped-by-div/>
            </template>
        </div>

        <template #bottom>
            <div v-if="validationResults !== undefined">
                <div v-for="item in validationResults.notSuitable" class="mb-1">
                    <Icon icon="exclamation-triangle" class="has-text-danger"/>
                    标签
                    <Tag :color="item.color">{{item.name}}</Tag>
                    不能被用作关联对象，它的类型是地址段。
                </div>
                <div v-for="item in validationResults.forceConflictingMembers" class="mb-1">
                    <Icon icon="exclamation-triangle" class="has-text-danger"/>
                    标签
                    <Tag v-for="member in item.members" :color="member.color" class="mr-half">{{member.name}}</Tag>
                    不能被同时应用于一个项目，它们隶属同一个强制冲突组
                    <Tag :color="item.group.color">{{item.group.name}}</Tag>
                    。
                </div>
                <div v-for="item in validationResults.conflictingMembers" class="mb-1">
                    <Icon icon="exclamation-triangle" class="has-text-warning"/>
                    标签
                    <Tag v-for="member in item.members" :color="member.color" class="mr-half">{{member.name}}</Tag>
                    不建议同时应用于一个项目，它们隶属同一个冲突组
                    <Tag :color="item.group.color">{{item.group.name}}</Tag>
                    。
                </div>
            </div>
            <div class="mt-1 mr-4 mb-4 ml-1">
                <Button :type="canUndo ? 'primary' : undefined" :disabled="!canUndo" icon="undo" @click="undo">撤销</Button>
                <Button :type="canRedo ? 'primary' : undefined" :disabled="!canRedo" icon="redo" @click="redo">重做</Button>
                <Button class="float-right" type="primary" :disabled="!submittable" icon="save" @click="submit">保存</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">

</style>
