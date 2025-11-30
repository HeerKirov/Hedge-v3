<script setup lang="ts">
import { Icon } from "@/components/universal"
import { FileInfoDisplay, MetaTagListDisplay, PartitionTimeDisplay, SourceInfo } from "@/components-business/form-display"
import { DetailIllust } from "@/functions/http-client/api/illust"

defineProps<{
    value: DetailIllust
    align: "left" | "right"
}>()

</script>

<template>
    <table :class="['table', 'w-100', `has-text-${align}`]">
        <tbody>
            <tr>
                <td>
                    <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{ value.id }}</b>
                    
                </td>
            </tr>
            <tr>
                <td class="word-wrap-anywhere">
                    <b class="ml-1 selectable">{{ value.fileName }}</b>
                </td>
            </tr>
            <tr>
                <td>
                    <MetaTagListDisplay :max="5" :tags="value.tags" :topics="value.topics" :authors="value.authors" self-is="IMAGE" category="self" direction="horizontal"/>
                </td>
            </tr>
            <tr>
                <td>
                    <FileInfoDisplay mode="inline" :extension="value.extension" :file-size="value.size" :resolution-width="value.resolutionWidth" :resolution-height="value.resolutionHeight" :video-duration="value.videoDuration"/>
                </td>
            </tr>
            <tr>
                <td>
                    <SourceInfo :source="value.source"/>
                </td>
            </tr>
            <tr>
                <td>
                    <PartitionTimeDisplay :partition-time="value.partitionTime" :order-time="value.orderTime" :create-time="value.createTime" :update-time="value.updateTime"/>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<style module lang="sass">

</style>