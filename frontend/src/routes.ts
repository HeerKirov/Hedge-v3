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
            },
            {
                name: "MainTag",
                path: "tag",
                component: () => import("@/views/Main/Tag/Tag.vue")
            },
            {
                name: "MainAnnotation",
                path: "annotation",
                component: () => import("@/views/Main/Annotation/Annotation.vue")
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
                name: "SettingDBMeta",
                path: "db/meta",
                component: () => import("@/views/Setting/DBMeta/DBMeta.vue")
            },
            {
                name: "SettingDBQuery",
                path: "db/query",
                component: () => import("@/views/Setting/DBQuery/DBQuery.vue")
            },
            {
                name: "SettingDBImport",
                path: "db/import",
                component: () => import("@/views/Setting/DBImport/DBImport.vue")
            },
            {
                name: "SettingDBSource",
                path: "db/source",
                component: () => import("@/views/Setting/DBSource/DBSource.vue")
            },
            {
                name: "SettingDBFindSimilar",
                path: "db/find-similar",
                component: () => import("@/views/Setting/DBFindSimilar/DBFindSimilar.vue")
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
