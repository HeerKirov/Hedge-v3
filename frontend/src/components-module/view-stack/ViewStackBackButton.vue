<script setup lang="ts">
import { Button } from "@/components/universal"
import { useViewStack } from "@/components-module/view-stack"
import { useInterceptedKey } from "@/modules/keyboard"

const { closeView, isClosable } = useViewStack()

useInterceptedKey(["Escape", "Backspace"], closeView)

</script>

<template>
    <Button v-if="isClosable()" square icon="arrow-left" @click="closeView"/>
</template>
