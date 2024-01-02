<script setup lang="ts">
import { Button } from "@/components/universal"
import { useInterceptedKey } from "@/modules/keyboard"
import { useStackedView } from "./context"

const { isRootView, closeView } = useStackedView()

useInterceptedKey(["Escape", "Backspace"], closeView)

</script>

<template>
    <Button v-if="!isRootView" square icon="arrow-left" @click="closeView"/>
</template>
