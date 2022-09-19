<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Block, Button, Icon } from "@/components/universal"
import { Input, SelectList } from "@/components/form"
import { Flex, FlexItem } from "@/components/layout"
import { useSettingChannel } from "@/services/api/setting"

const { channels, currentChannel, defaultChannel, toggle } = useSettingChannel()

const selectItems = computed(() => channels.value.map(channel => ({label: channel, value: channel})).concat({label: "新频道…", value: "<new>"}))

const selectedItem = ref<string>()

const restart = () => toggle(selectedItem.value!)

const setDefault = () => defaultChannel.value = selectedItem.value!

const restartByNew = () => toggle(newChannelNameText.value)

const newChannelNameText = ref("")

</script>

<template>
    <Block class="mt-2 p-3">
        <p class="has-text-success is-font-size-large">
            <Icon class="mr-2" icon="coins"/>当前频道：<code>{{currentChannel}}</code>
        </p>
        <p class="mt-4">频道是Hedge实行数据隔离的高级功能。以不同频道启动时，可以访问不同的数据、设置，与其他频道互不可见、完全隔离。</p>
        <p class="mt-1">要切换频道，可以：</p>
        <p>1. 在频道列表选择一个频道，并以此频道的身份重新启动。</p>
        <p>1. 在频道列表选择一个频道，将其设置为默认频道。此后当Hedge启动时，会以此默认频道的身份启动。</p>
        <p class="mt-4"><Icon class="mr-2" icon="circle"/>默认频道: <code>{{defaultChannel}}</code></p>
    </Block>
    <label class="label mt-4 mb-1">频道列表</label>
    <Flex :class="$style['channel-list']" horizontal="stretch" :spacing="1">
        <FlexItem :width="30">
            <SelectList :items="selectItems" v-model:value="selectedItem"/>
        </FlexItem>
        <FlexItem :width="70">
            <Block v-if="selectedItem !== undefined" class="p-2 relative">
                <template v-if="selectedItem === '<new>'">
                    <p class="mb-1">使用新频道</p>
                    <Input size="small" placeholder="频道名" v-model:value="newChannelNameText"/>
                    <Button class="ml-1" mode="light" type="success" size="small" icon="reply" @click="restartByNew">保存，并以此频道的身份重新启动</Button>
                    <p class="secondary-text mt-1">以新频道的身份启动并完成初始化后，它将被保存下来。</p>
                </template>
                <template v-else>
                    <p class="mb-4">频道：<code>{{selectedItem}}</code></p>
                    <div class="absolute bottom-stretch has-text-right p-2">
                        <Button v-if="currentChannel === selectedItem" class="mr-1" mode="filled" type="success" size="small" icon="reply" disabled>当前频道</Button>
                        <Button v-else class="mr-1" mode="light" type="success" size="small" icon="reply" @click="restart">以此频道的身份重新启动</Button>
                        <Button v-if="defaultChannel === selectedItem" mode="filled" type="primary" size="small" icon="circle" disabled>默认频道</Button>
                        <Button v-else mode="light" type="primary" size="small" icon="circle" @click="setDefault">设为默认频道</Button>
                    </div>
                </template>
            </Block>
        </FlexItem>
    </Flex>
</template>

<style module lang="sass">
.channel-list
    width: 100%
    min-height: 100px
    max-height: 400px
</style>
