<script setup lang="ts">
import { Button, Tag, Icon, Block } from "@/components/universal"
import { Group, Flex, FlexItem } from "@/components/layout"
import { Input } from "@/components/form"
</script>

<template>
    <div>
        <Button mode="light" type="primary" icon="star">测试按钮</Button>
        <Group>
            <Tag color="primary" clickable>测试标签</Tag>
            <Tag color="info" icon="star" clickable>测试标签</Tag>
            <Tag color="success" line-style="dashed" clickable>测试标签</Tag>
            <Tag color="warning">测试标签</Tag>
            <Tag color="danger">
                <b class="mr-1">[</b>
                <Icon icon="star"/>测试标签
                <b class="ml-1">]</b>
            </Tag>
        </Group>
        <Flex :class="$style['block-test']" :spacing="1" :width="100">
            <Block>A</Block>
            <Block color="success">B</Block>
            <Block color="pink">C</Block>
        </Flex>
        <Flex :class="$style['block-test']" :spacing="1" :width="100">
            <Block mode="light" color="primary">A</Block>
            <Block mode="light" color="success">B</Block>
            <Block mode="light" color="pink">C</Block>
        </Flex>
        <Flex :class="$style['block-test']" :spacing="1" :width="100">
            <Block mode="filled" color="primary">A</Block>
            <Block mode="filled" color="success">B</Block>
            <Block mode="filled" color="pink">C</Block>
        </Flex>
        <Flex :class="$style['block-test']" :spacing="1" :width="100">
            <Block mode="shadow">A</Block>
            <Block mode="shadow" color="primary">B</Block>
            <Block mode="shadow" color="pink">C</Block>
        </Flex>
    </div>
</template>

<style module lang="sass">
.block-test
    height: 40px
    width: 800px
    margin-bottom: 0.25rem
</style>
