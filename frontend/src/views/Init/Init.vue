<script setup lang="ts">
import { reactive, ref } from "vue"
import { Block } from "@/components/universal"
import { NativeTheme } from "@/functions/ipc-client"
import WelcomePage from "./WelcomePage.vue"
import PasswordPage from "./PasswordPage.vue"
import DatabasePage from "./DatabasePage.vue"
import ThemePage from "./ThemePage.vue"
import FinishPage from "./FinishPage.vue"

const page = ref(0)

const data = reactive({
    password: {
        hasPassword: false,
        password: ""
    },
    database: {
        customLocation: false,
        storagePath: ""
    },
    theme: {
        theme: <NativeTheme>"system"
    }
})

const submitPassword = (hasPassword: boolean, password: string) => {
    data.password = { hasPassword, password }
    page.value += 1
}
const submitDatabase = (customLocation: boolean, storagePath: string) => {
    data.database = { customLocation, storagePath }
    page.value += 1
}
const submitTheme = (theme: NativeTheme) => {
    data.theme = { theme }
    page.value += 1
}

</script>

<template>
    <Block :class="[$style.area, 'fixed', 'center', 'p-4']" mode="shadow">
        <WelcomePage v-if="page === 0" @next="page++"/>
        <PasswordPage v-else-if="page === 1" v-bind="data.password" @submit="submitPassword"/>
        <DatabasePage v-else-if="page === 2" v-bind="data.database" @submit="submitDatabase" @prev="page--"/>
        <ThemePage v-else-if="page === 3" v-bind="data.theme" @submit="submitTheme" @prev="page--"/>
        <FinishPage v-else-if="page === 4" v-bind="data" @prev="page--"/>
    </Block>
</template>

<style module lang="sass">
.area
    height: 31.25rem
    width: 25rem
</style>
