<script setup lang="ts">
import { Icon, Tag, Button } from "@/components/universal"
import { BottomLayout } from "@/components/layout"
import { SimpleMetaTagElement, SourceTagElement } from "@/components-business/element"
import { useCalloutService } from "@/components-module/callout"
import { MetaTagTypes, MetaTagValues } from "@/functions/http-client/api/all"
import { useEditorContext } from "./context"

const {
    typeFilter,
    form: {
        submit, submittable, submitting, removeAt, add,
        tags, topics, authors, mappings, exists, overwriteMode,
        validation: { exportedResults, validationResults },
        history: { canRedo, canUndo, undo, redo }
    }
} = useEditorContext()

const callout = useCalloutService()

const click = (e: MouseEvent, type: MetaTagTypes, value: MetaTagValues) => {
    callout.show({base: (e.target as Element).getBoundingClientRect(), callout: "metaTag", metaType: type, metaId: value.id})
}

</script>

<template>
    <BottomLayout>
        <div class="p-4">
            <template v-if="typeFilter.author">
                <SimpleMetaTagElement v-for="(author, idx) in authors" :key="author.id" class="mb-1" type="author" :value="author" wrapped-by-div @click="click($event, 'author', author)">
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="author.color" icon="close" clickable @click="removeAt('author', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="typeFilter.topic">
                <SimpleMetaTagElement v-for="(topic, idx) in topics" :key="topic.id" class="mb-1" type="topic" :value="topic" wrapped-by-div @click="click($event, 'topic', topic)">
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="topic.color" icon="close" clickable @click="removeAt('topic', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="typeFilter.tag">
                <SimpleMetaTagElement v-for="(tag, idx) in tags" :key="tag.id" class="mb-1" type="tag" :value="tag" wrapped-by-div @click="click($event, 'tag', tag)">
                    <template #behind>
                        <Tag class="ml-half" line-style="none" :color="tag.color" icon="close" clickable @click="removeAt('tag', idx)"/>
                    </template>
                </SimpleMetaTagElement>
            </template>
            <template v-if="mappings.length > 0">
                <i class="label mt-3">生效的来源推导</i>
                <div v-for="(m, idx) in mappings" :key="`${m.site}/${m.type}/${m.code}`" class="flex mb-half">
                    <div class="flex-item w-50">
                        <SourceTagElement :site="m.site" :value="m.sourceTag"/>
                        <Tag class="ml-half" line-style="none" icon="close" clickable @click="removeAt('mapping', idx)"/>
                    </div>
                    <div class="flex-item w-50">
                        <SimpleMetaTagElement v-for="item in m.mappings" :key="`${item.metaType}-${item.metaTag.id}`"
                                              :type="item.metaType.toLowerCase() as MetaTagTypes" :value="item.metaTag"/>
                    </div>
                </div>
            </template>
            <template v-if="exportedResults.tags.length > 0 || exportedResults.topics.length > 0 || exportedResults.authors.length > 0">
                <i class="label mt-3">已导出</i>
                <SimpleMetaTagElement v-for="author in exportedResults.authors" :key="author.id" class="mt-1" type="author" :value="author" wrapped-by-div @click="click($event, 'author', author)"/>
                <SimpleMetaTagElement v-for="topic in exportedResults.topics" :key="topic.id" class="mt-1" type="topic" :value="topic" wrapped-by-div @click="click($event, 'topic', topic)"/>
                <SimpleMetaTagElement v-for="tag in exportedResults.tags" :key="tag.id" class="mt-1" type="tag" :value="tag" wrapped-by-div @click="click($event, 'tag', tag)"/>
            </template>
            <template v-if="exists.length > 0">
                <i class="label mt-3">已持有</i>
                <SimpleMetaTagElement v-for="(t, idx) in exists" :key="t.value.id"
                                      :class="{'mt-1': true, 'has-text-del': t.removed || overwriteMode}"
                                      :type="t.type" :value="t.value"
                                      :color="t.removed || overwriteMode ? 'secondary' : undefined"
                                      wrapped-by-div
                                      @click="click($event, t.type, t.value)"
                                      @dblclick="add(t.type, t.value)">
                    <template #behind>
                        <Tag v-if="!overwriteMode" class="ml-half" line-style="none" icon="close" :color="t.removed ? 'secondary' : undefined" clickable @click="removeAt('exists', idx)"/>
                    </template>
                </SimpleMetaTagElement>
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
                <div v-for="item in validationResults.conflictingMembers" class="mb-1">
                    <Icon icon="exclamation-triangle" class="has-text-warning"/>
                    标签
                    <Tag v-for="member in item.members" :color="member.color" class="mr-half">{{member.name}}</Tag>
                    不建议同时应用于一个项目，它们属于同一个组
                    <Tag :color="item.group.color">{{item.group.name}}</Tag>
                    。
                </div>
            </div>
            <div class="mt-1 mr-4 mb-4 ml-1">
                <Button :type="canUndo ? 'primary' : undefined" :disabled="!canUndo" icon="undo" @click="undo">撤销</Button>
                <Button :type="canRedo ? 'primary' : undefined" :disabled="!canRedo" icon="redo" @click="redo">重做</Button>
                <Button class="float-right" mode="filled" type="primary" :disabled="!submittable || submitting" :icon="submitting ? 'circle-notch' : 'save'" :icon-spin="submitting" @click="submit">保存</Button>
            </div>
        </template>
    </BottomLayout>
</template>
