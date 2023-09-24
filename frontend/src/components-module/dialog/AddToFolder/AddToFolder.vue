<script setup lang="ts">
import { computed } from "vue"
import { Button, Icon } from "@/components/universal"
import { FolderTable } from "@/components-module/data"
import { BottomLayout, AspectGrid, Flex, FlexItem } from "@/components/layout"
import { useAssets } from "@/functions/app"
import { AddToFolderProps, useAddToFolderContext } from "./context"

const props = defineProps<{
    p: AddToFolderProps
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const resolve = () => {
    props.p.resolve?.()
    emit("close")
}

const { assetsUrl } = useAssets()

const { tabType, folderTree, recentFolders, checkExists, selectedId, submit, chooseMove, chooseIgnore } = useAddToFolderContext(computed(() => props.p.illustIds), resolve)

</script>

<template>
    <BottomLayout>
        <p class="mt-2 pl-1 is-font-size-large">添加图像到目录</p>
        <p class="mb-2 pl-1">选择要将图像添加到的目录：</p>
        <Flex :spacing="1">
            <FlexItem :width="100">
                <div>
                    <Flex class="mb-1" :width="100" :spacing="1">
                        <Button :type="tabType === 'recent' ? 'primary' : undefined" icon="history" @click="tabType = 'recent'">最近使用</Button>
                        <Button :type="tabType === 'all' ? 'primary' : undefined" icon="database" @click="tabType = 'all'">所有目录</Button>
                    </Flex>
                    <div :class="$style['scroll-content']">
                        <FolderTable v-if="tabType === 'all'" :folders="folderTree" mode="simple" v-model:selected="selectedId"/>
                        <table v-else class="table hover round standard-td w-100">
                            <tbody>
                                <tr v-for="row in recentFolders" @click="selectedId = row.id">
                                    <td class="pl-1">
                                        <Icon icon="folder"/>
                                        {{row.address.join("/")}}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </FlexItem>
            <FlexItem :width="50">
                <div v-if="checkExists !== null">
                    <p class="mb-1 is-line-height-std">部分图像已存在于此目录。请确认处理策略：</p>
                    <div :class="$style['scroll-content']">
                        <AspectGrid :spacing="1" :column-num="3" img-style="no-radius" :items="checkExists.duplicates" v-slot="{ item }">
                            <img :src="assetsUrl(item.filePath.sample)" :alt="`situation-${item.id}`"/>
                            <div v-if="item.ordinal !== null" :class="$style['ordinal-flag']">{{item.ordinal + 1}}</div>
                        </AspectGrid>
                    </div>
                </div>
            </FlexItem>
        </Flex>

        <template #bottom>
            <div v-if="checkExists === null" class="mt-2">
                <Button class="float-right" mode="filled" type="primary" icon="check" @click="submit">确认</Button>
            </div>
            <div v-else class="mt-2">
                <span class="ml-2 is-line-height-std">移动选项将重复图像移动到新位置；忽略选项则将这些图像保留在原位置。</span>
                <Button class="float-right ml-1" mode="filled" type="primary" icon="check" @click="chooseIgnore">忽略</Button>
                <Button class="float-right" mode="filled" type="primary" icon="check" @click="chooseMove">移动</Button>
            </div>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.scroll-content
    overflow-y: auto
    max-height: 40vh

.ordinal-flag
    position: absolute
    right: 0.25rem
    bottom: 0.25rem
    line-height: 1.5em
    width: 1.5em
    text-align: center
    border-radius: $radius-size-round
    background-color: rgba(0, 0, 0, 0.65)
    color: $dark-mode-text-color
</style>
