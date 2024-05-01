<script setup lang="ts">
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

defineProps<{
    partitionTime?: LocalDate
    publishTime?: LocalDateTime
    orderTime?: LocalDateTime
    createTime?: LocalDateTime
    updateTime?: LocalDateTime
}>()

</script>

<template>
    <div>
        <p v-if="partitionTime" class="secondary-text">时间分区 {{date.toISOString(partitionTime)}}</p>
        <p v-if="orderTime" class="secondary-text">排序时间 {{datetime.toSimpleFormat(orderTime)}}</p>
        <p v-if="publishTime" class="secondary-text">发布时间 {{datetime.toSimpleFormat(publishTime)}}</p>
        <p v-if="createTime" class="secondary-text">创建时间 {{datetime.toSimpleFormat(createTime)}}</p>
        <p v-if="updateTime && (!createTime || updateTime.timestamp !== createTime.timestamp)" class="secondary-text">上次修改 {{datetime.toSimpleFormat(updateTime)}}</p>
    </div>
</template>

