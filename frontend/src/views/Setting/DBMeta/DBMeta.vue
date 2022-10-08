<script setup lang="ts">
import { Icon } from "@/components/universal"
import { CheckBox, ColorPicker } from "@/components/form"
import { Group } from "@/components/layout"
import { useSettingMetaData } from "@/services/setting"
import { TOPIC_TYPES, TOPIC_TYPE_NAMES, TOPIC_TYPE_ICONS, AUTHOR_TYPES, AUTHOR_TYPE_NAMES, AUTHOR_TYPE_ICONS } from "@/constants/entity"

const { data: settingMeta } = useSettingMetaData()

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
            <CheckBox v-model:value="settingMeta.autoCleanTagme">自动清理Tagme</CheckBox>
            <p class="secondary-text">更改图库项目时，如果Tagme标记的部分发生变更，则自动去除这部分的Tagme标记。</p>
        </div>
    </template>
</template>

<style module lang="sass">
.meta-color-label
    width: 4em
</style>
