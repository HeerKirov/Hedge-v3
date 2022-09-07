import { createApp } from "vue"
import { createRouter, createWebHashHistory } from "vue-router"
import routes from "./routes"
import App from "./App.vue"
import "@/styles"

const router = createRouter({
    history: createWebHashHistory(),
    routes: routes
})

createApp(App)
    .use(router)
    .mount("#app")
