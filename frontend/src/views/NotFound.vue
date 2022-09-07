<script setup lang="ts">
import { Block, Button } from "@/components/universal"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const goHome = () => router.push({name: "Index"})

</script>

<template>
    <Block :class="$style.block" color="danger">
        <b>未知的URL</b>
        <p><b>{{route.fullPath}}</b>不是程序可识别的URL。请回到正确的地址。</p>
        <Button size="small" type="danger" @click="goHome">返回主页</Button>
    </Block>
</template>

<style module lang="sass">
@import "../styles/base/size"

.block
    position: fixed
    left: 50%
    top: 50%
    transform: translate(-50%, -50%)
    text-align: center
    padding: $spacing-2

    > p
        margin-top: $spacing-2
        margin-bottom: $spacing-2
</style>
