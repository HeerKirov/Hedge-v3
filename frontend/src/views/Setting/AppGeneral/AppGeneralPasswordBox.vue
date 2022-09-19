<script setup lang="ts">
import { Block, Icon, Button } from "@/components/universal"
import { Input } from "@/components/form"
import { MiddleLayout } from "@/components/layout"
import { ref } from "vue";

defineProps<{
    password: string | null
}>()

const emit = defineEmits<{
    (e: "update:password", value: string | null): void
}>()

const status = ref<"normal" | "set" | "remove">("normal")

const passwordText = ref("")

const setPassword = () => {
    if(passwordText.value.trim() === "") {
        status.value = "remove"
    }else{
        emit("update:password", passwordText.value.trim())
        status.value = "normal"
    }
}

const removePassword = () => {
    emit("update:password", null)
    status.value = "normal"
}

</script>

<template>
    <Block class="p-2">
        <MiddleLayout v-if="status === 'normal'">
            <template #left>
                <div v-if="!!password" class="has-text-success">
                    <Icon class="mx-2" icon="lock"/>
                    <span>已设置登录口令</span>
                </div>
                <div v-else>
                    <Icon class="mx-2" icon="lock-open"/>
                    <span>未设置登录口令</span>
                </div>
            </template>
            <template #right>
                <template v-if="!!password">
                    <Button @click="status = 'set'">修改口令</Button>
                    <Button class="ml-1" @click="status = 'remove'" type="danger">移除口令</Button>
                </template>
                <template v-else>
                    <Button @click="status = 'set'">设置口令</Button>
                </template>
            </template>
        </MiddleLayout>
        <MiddleLayout v-else-if="status === 'set'">
            <template #left>
                <Input v-model:value="passwordText" placeholder="新口令"/>
            </template>
            <template #right>
                <Button mode="light" type="primary" @click="setPassword">保存</Button>
                <Button class="ml-1" @click="status = 'normal'">取消</Button>
            </template>
        </MiddleLayout>
        <MiddleLayout v-else>
            <template #left>
                <span class="ml-2">确定要移除口令吗？</span>
                <span class="secondary-text">移除口令后，启动App不再需要登录认证。</span>
            </template>
            <template #right>
                <Button mode="light" type="danger" @click="removePassword">确定</Button>
                <Button class="ml-1" @click="status = 'normal'">取消</Button>
            </template>
        </MiddleLayout>
    </Block>
</template>

<style module lang="sass">

</style>
