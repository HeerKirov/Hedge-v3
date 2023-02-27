<script setup lang="ts">
import { datetime, LocalDateTime } from "@/utils/datetime"

defineProps<{
    orderTime?: LocalDateTime
    createTime?: LocalDateTime
    updateTime?: LocalDateTime
}>()

</script>

<template>
    <div>
        <p v-if="orderTime" class="secondary-text">排序时间 {{datetime.toSimpleFormat(orderTime)}}</p>
        <p v-if="createTime" class="secondary-text">添加时间 {{datetime.toSimpleFormat(createTime)}}</p>
        <p v-if="updateTime && (!createTime || updateTime.timestamp !== createTime.timestamp)" class="has-text-secondary">上次修改 {{datetime.toSimpleFormat(updateTime)}}</p>
    </div>
</template>

