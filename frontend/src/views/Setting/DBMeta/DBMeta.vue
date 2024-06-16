<script setup lang="ts">
import { Icon } from "@/components/universal"
import { CheckBox, ColorPicker } from "@/components/form"
import { Group } from "@/components/layout"
import { useSettingMeta } from "@/services/setting"
import { TOPIC_TYPES, TOPIC_TYPE_NAMES, TOPIC_TYPE_ICONS, AUTHOR_TYPES, AUTHOR_TYPE_NAMES, AUTHOR_TYPE_ICONS } from "@/constants/entity"

const { data: settingMeta } = useSettingMeta()

</script>

<template>
    <template v-if="!!settingMeta">
        <label class="label mt-2">标签颜色</label>
        <label class="label mt-2 mb-1">主题</label>
        <Group>
            <Group v-for="topic in TOPIC_TYPES">
                <ColorPicker v-model:value="settingMeta.topicColors[topic]"/>
                <Icon :icon="TOPIC_TYPE_ICONS[topic]"/>
                <span :class="$style['meta-color-label']">{{TOPIC_TYPE_NAMES[topic]}}</span>
            </Group>
        </Group>
        <label class="label mb-1">作者</label>
        <Group>
            <Group v-for="author in AUTHOR_TYPES">
                <ColorPicker v-model:value="settingMeta.authorColors[author]"/>
                <Icon :icon="AUTHOR_TYPE_ICONS[author]"/>
                <span :class="$style['meta-color-label']">{{AUTHOR_TYPE_NAMES[author]}}</span>  
            </Group>
        </Group>
        <label class="label mt-2">杂项</label>
        <div class="mt-2">
            <CheckBox v-model:value="settingMeta.centralizeCollection">向集合添加不同分区的项时聚集集合</CheckBox>
            <p class="secondary-text">创建或向集合添加分属不同时间分区的项时，允许选择一个时间分区，将项聚集到此分区中。</p>
        </div>
        <div class="mt-2">
            <CheckBox v-model:value="settingMeta.bindingPartitionWithOrderTime">将排序时间的更改同步至时间分区</CheckBox>
            <p class="secondary-text">更改项的排序时间时，根据排序时间自动更改时间分区。</p>
        </div>
        <div class="mt-2">
            <CheckBox v-model:value="settingMeta.autoCleanTagme">自动清理Tagme</CheckBox>
            <p class="secondary-text">更改图库项目时，如果Tagme标记的部分发生变更，则自动去除这部分的Tagme标记。</p>
            <CheckBox class="ml-4 is-font-size-small" v-model:value="settingMeta.onlyCleanTagmeByCharacter">仅在角色标签变更时清理主题Tagme</CheckBox>
        </div>
    </template>
</template>

<style module lang="sass">
.meta-color-label
    width: 4em
</style>
