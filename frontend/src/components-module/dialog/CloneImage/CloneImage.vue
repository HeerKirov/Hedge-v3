<script setup lang="ts">
import { Block, Button, Icon } from "@/components/universal"
import { CheckBox } from "@/components/form"
import { ImagePropsCloneForm } from "@/functions/http-client/api/illust"
import { CloneImageProps, useCloneImageContext } from "./context"
import ReplaceListItem from "./ReplaceListItem.vue"

const props = defineProps<{
    p: CloneImageProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const succeed = props.p.onSucceed && function() {
    props.p.onSucceed!()
    emit("close")
}

const onlyGetProps = props.p.onlyGetProps && function(form: ImagePropsCloneForm) {
    props.p.onlyGetProps!(form)
    emit("close")
}

const { replaceList, unmatched, exchange, openImagePreview, drop, options, execute } = useCloneImageContext(props.p.illustIds, succeed, onlyGetProps)

</script>

<template>
    <div class="flex h-100 gap-2">
        <div :class="$style['info-content']">
            <div class="flex gap-1">
                <Block class="flex-item w-50 flex jc-between p-1" mode="transparent" color="blue">
                    <div>基于此元数据信息</div>
                    <div class="is-font-size-large bold">源图像</div>
                </Block>
                <Block class="flex-item w-50 flex jc-between p-1" mode="transparent" color="red">
                    <div class="is-font-size-large bold">目标图像</div>
                    <div>使用此实际图像</div>
                </Block>
            </div>
            <ReplaceListItem v-for="(item, index) in replaceList" class="mt-1" :from="item.from" :to="item.to" :index @preview="openImagePreview" @drop="drop"/>
        </div>
        <div :class="$style['action-content']">
            <Button class="w-100" icon="exchange-alt" @click="exchange">交换源与目标</Button>
            <p class="mt-2 bold">共{{ replaceList.length }}对图像</p>
            <label class="label mt-2">替换选项</label>
            <p class="mt-1"><CheckBox v-model:value="options.merge">合并元数据而非覆盖</CheckBox></p>
            <p class="mt-1"><CheckBox v-model:value="options.deleteFrom">删除源图像</CheckBox></p>
            <div v-if="unmatched" class="mt-2 flex align-baseline">
                <span><Icon icon="exclamation-triangle" class="has-text-warning"/></span>
                <span>存在未配对的图像，它们将被忽略。</span>
            </div>
            <Button class="absolute bottom mt-4 w-100" mode="filled" type="primary" icon="check" @click="execute">执行替换</Button>
        </div>
    </div>
</template>

<style module lang="sass">
.info-content
    width: 100%
    overflow-y: auto
    overflow-x: hidden
    height: 100%

.action-content
    position: relative
    width: 12rem
    flex-shrink: 0
</style>
