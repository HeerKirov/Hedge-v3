<script setup lang="ts">
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { VirtualRowView } from "@/components/data"
import { TaskSelector } from "@/functions/http-client/api/find-similar"
import { datetime } from "@/utils/datetime"
import { useTaskListData } from "./context"

defineOptions({
    inheritAttrs: false
})

const { paginationData } = useTaskListData()

const SLEECTOR_TYPE_NAMES: Record<TaskSelector["type"], string> = {
    "image": "图像",
    "author": "作者",
    "topic": "主题",
    "sourceTag": "来源标签",
    "partitionTime": "时间分区"
}

</script>

<template>
    <p class="mt-2 pl-1 is-font-size-large">相似项查找 任务队列</p>
    <div v-if="paginationData.data.metrics.total !== undefined && paginationData.data.metrics.total <= 0" class="absolute center has-text-centered has-text-secondary">
        <i>队列中无查找任务</i>
    </div>
    <VirtualRowView v-else :row-height="80" :padding="6" :buffer-size="8" v-bind="paginationData.data.metrics" @update="paginationData.dataUpdate">
        <div v-for="item in paginationData.data.result" :key="item.id" :class="$style.item">
            <Flex>
                <FlexItem :width="10">
                    {{ item.id }}
                </FlexItem>
                <FlexItem :width="50">
                    <Icon icon="filter"/>选择器: {{ SLEECTOR_TYPE_NAMES[item.selector.type] }}
                </FlexItem>
                <FlexItem :width="40">
                    <div>
                        {{ datetime.toSimpleFormat(item.recordTime) }}
                    </div>
                </FlexItem>
            </Flex>
        </div>
    </VirtualRowView>
</template>

<style module lang="sass">
.item
    height: 80px
    padding: 0.5rem 0.25rem
</style>