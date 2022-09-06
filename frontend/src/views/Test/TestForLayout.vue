<script setup lang="ts">
import { Flex, FlexItem, MiddleLayout, Container } from "@/components/layout"
import { Button } from "@/components/universal"
import { Input } from "@/components/form"
</script>

<template>
    <Flex :class="$style.flex" horizontal="stretch" :grow="0">
        <FlexItem :width="50">
            <Input placeholder="一个文本框"/>
        </FlexItem>
        <FlexItem :shrink="0">
            <Button mode="light" type="primary" icon="star" square/>
            <Button mode="light" type="success" icon="star">OK</Button>
        </FlexItem>
    </Flex>
    <Flex :class="$style.flex" :width="100">
        <Input placeholder="一个文本框"/>
        <FlexItem :width="50">
            <Input placeholder="一个文本框"/>
            <Input placeholder="一个文本框"/>
        </FlexItem>
    </Flex>
    <div :class="$style['middle-layout']">
        <MiddleLayout>
            <template #left>
                Hello, World
            </template>

            <Input placeholder="一个文本框"/>
            <Button mode="light" type="primary" icon="star" square/>

            <template #right>
                <Button mode="light" type="primary" icon="star" square/>
                <Button mode="light" type="primary" icon="star" square/>
            </template>
        </MiddleLayout>
    </div>
    <div :class="$style['container']">
        <Container>
            Hello, world!
        </Container>
    </div>
</template>

<style module lang="sass">
.flex
    width: 400px
    border: #1f2225 dashed 1px
    margin-bottom: 0.25rem
.middle-layout
    width: 800px
    border: #1f2225 dashed 1px
    margin-bottom: 0.25rem
.container
    width: 800px
    height: 50px
    border: #1f2225 dashed 1px
    margin-bottom: 0.25rem
    > *
        border: #1f2225 solid 1px
</style>
