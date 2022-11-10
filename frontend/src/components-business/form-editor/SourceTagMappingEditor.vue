<script setup lang="ts">
import { reactive, ref } from "vue"
import { Block, Button, Tag } from "@/components/universal"
import { Input } from "@/components/form"
import { Flex } from "@/components/layout"
import { SourceSiteSelectBox } from "@/components-business/form-editor"
import { MappingSourceTag } from "@/functions/http-client/api/source-tag-mapping"
import { useMessageBox } from "@/modules/message-box"

const props = defineProps<{
    value: MappingSourceTag[]
    direction?: "horizontal" | "vertical"
}>()

const emit = defineEmits<{
    (e: "update:value", value: MappingSourceTag[]): void
}>()

const message = useMessageBox()

const selectedIndex = ref<number | "new">()

const form = reactive({
    site: <string | null>null,
    code: "",
    name: "",
    otherName: "",
    type: ""
})

const add = () => {

}

</script>

<template>
    <div :class="[$style.root, direction === 'vertical' ? $style.vertical : $style.horizontal]">
        <div>
            <component v-for="item in value" :is="direction === 'vertical' ? 'p' : 'span'" :class="{'mb-1': true, 'mr-1': direction !== 'vertical'}">
                [{{item.site}}]<Tag>{{ item.name }}{{ item.otherName !== null ? `(${item.otherName})` : null }}</Tag>
            </component>
            <component :is="direction === 'vertical' ? 'p' : 'span'" :class="{'mb-1': true, 'mr-1': direction !== 'vertical'}">
                <Tag color="success" icon="plus" clickable @click="add">添加来源标签</Tag>
            </component>
        </div>
        <Block v-if="selectedIndex !== undefined" class="p-1 mt-1">
            <SourceSiteSelectBox class="mb-1" v-model:value="form.site"/>
            <Flex class="mb-1" :width="100" :spacing="1">
                <Input width="fullwidth" size="small" placeholder="编码" v-model:value="form.code"/>
                <Input width="fullwidth" size="small" placeholder="分类" v-model:value="form.type"/>
            </Flex>
            <Input class="mb-1" width="fullwidth" size="small" placeholder="名称" v-model:value="form.name"/>
            <Input class="mb-1" width="fullwidth" size="small" placeholder="别名" v-model:value="form.otherName"/>
            <div>
                <Button class="float-right" size="small" type="danger" icon="trash">删除</Button>
            </div>
        </Block>
    </div>
</template>

<style module lang="sass">
.root
    &.horizontal
    &.vertical
</style>
