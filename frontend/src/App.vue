<script setup lang="ts">
import { Button } from "@/components/forms"
// import { installAppService } from "@/functions/app"
//
// installAppService({
//     handleError(title, message) {
//         console.error(`${title}: ${message}`)
//     }
// })

</script>

<template>
    <div>
        <Button icon="star-half">测试按钮</Button>
        <Button type="primary" icon="star">测试按钮</Button>
        <Button type="success" icon="star-half">测试按钮</Button>
        <Button type="danger" icon="star-half">测试按钮</Button>
        <Button type="primary" disabled icon="star-half">测试按钮</Button>
    </div>
    <div>
        <Button mode="light" icon="star-half">测试按钮</Button>
        <Button mode="light" type="primary" icon="star">测试按钮</Button>
        <Button mode="light" type="success" icon="star-half">测试按钮</Button>
        <Button mode="light" type="danger" icon="star-half">测试按钮</Button>
        <Button mode="light" type="primary" disabled icon="star-half">测试按钮</Button>
    </div>
    <div>
        <Button mode="filled" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="primary" icon="star">测试按钮</Button>
        <Button mode="filled" type="success" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="danger" icon="star-half">测试按钮</Button>
        <Button mode="filled" type="primary" disabled icon="star-half">测试按钮</Button>
    </div>

</template>

<style scoped lang="sass">
div > button
    margin-right: 0.25rem
    margin-top: 0.25rem
</style>
