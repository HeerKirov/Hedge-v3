<script setup lang="ts">
import { computed } from "vue"
import { PopupBox } from "@/components/interaction"
import { SERVICE_CONF, useInternalService } from "./context"
import MetaTagCallout from "./MetaTagCallout/MetaTagCallout.vue"

const { context, close } = useInternalService()

const conf = computed(() => context.value !== null ? {...SERVICE_CONF["default"], ...SERVICE_CONF[context.value.callout]} : SERVICE_CONF["default"])

</script>

<template>
    <PopupBox v-if="context !== null" v-bind="conf" :base="context.base" @close="close">
        <MetaTagCallout v-if="context.callout === 'metaTag'" :meta-type="context.metaType" :meta-id="context.metaId"/>
    </PopupBox>
</template>
