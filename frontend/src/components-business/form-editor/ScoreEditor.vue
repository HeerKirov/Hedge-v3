<script setup lang="ts">
import { Starlight, Block, Icon, Button } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"

const props = defineProps<{
    value: number | null
}>()

const emit = defineEmits<{
    (e: "update:value", value: number | null): void
}>()

const minus = () => {
    if(props.value !== null && props.value > 1) {
        emit("update:value", props.value - 1)
    }else if(props.value === null) {
        emit("update:value", 2)
    }
}

const plus = () => {
    if(props.value !== null && props.value < 5) {
        emit("update:value", props.value + 1)
    }else if(props.value === null) {
        emit("update:value", 3)
    }
}

const clear = () => emit("update:value", null)

</script>

<template>
    <Block class="p-1">
        <Flex align="center">
            <FlexItem :basis="100">
                <Starlight v-if="value !== null" class="ml-1" :value="value" show-text/>
                <div v-else class="has-text-secondary ml-1">
                    <Icon icon="star-half"/>
                    <i>评分空缺</i>
                </div>
            </FlexItem>
            <FlexItem :shrink="0" :grow="0">
                <Button square icon="minus" @click="minus"/>
                <Button square icon="plus" @click="plus"/>
                <Button square icon="times" @click="clear"/>
            </FlexItem>
        </Flex>
    </Block>
</template>
