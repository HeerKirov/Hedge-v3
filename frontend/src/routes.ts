import { RouteRecordRaw } from "vue-router"

export default <RouteRecordRaw[]>[
    {
        name: "Index",
        path: "/",
        component: () => import("@/views/Index.vue")
    },
    {
        name: "Init",
        path: "/init",
        component: () => import("@/views/Init/Init.vue")
    },
    {
        name: "Login",
        path: "/login",
        component: () => import("@/views/Login.vue")
    },
    {
        name: "Main",
        path: "/main",
        component: () => import("@/views/Main/Main.vue"),
        children: [
            {
                name: "MainHome",
                path: "",
                component: () => import("@/views/Main/Home/Home.vue")
            }
        ]
    },
    {
        name: "Setting",
        path: "/setting",
        component: () => import("@/views/Setting/Setting.vue"),
        meta: {
            title: "Hedge偏好设置"
        },
        children: [
            {
                name: "SettingIndex",
                path: "",
                redirect: {name: "SettingAppGeneral"}
            },
            {
                name: "SettingAppGeneral",
                path: "app/general",
                component: () => import("@/views/Setting/AppGeneral/AppGeneral.vue")
            },
            {
                name: "SettingAdvancedServer",
                path: "advanced/server",
                component: () => import("@/views/Setting/AdvancedServer/AdvancedServer.vue")
            },
            {
                name: "SettingAdvancedChannel",
                path: "advanced/channel",
                component: () => import("@/views/Setting/AdvancedChannel/AdvancedChannel.vue")
            },
        ]
    },
    {
        name: "NotFound",
        path: "/:catchAll(.*)",
        component: () => import("@/views/NotFound.vue"),
        meta: {
            title: "Hedge"
        }
    }
]
