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
        component: () => import("@/views/Main/Main.vue")
    },
    {
        name: "Preview",
        path: "/preview",
        component: () => import("@/views/Preview.vue")
    },
    {
        name: "Note",
        path: "/note",
        component: () => import("@/views/Note/Note.vue"),
        meta: {
            title: "便签"
        }
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
                name: "SettingAppStorage",
                path: "app/storage",
                component: () => import("@/views/Setting/AppStorage/AppStorage.vue")
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
                name: "SettingDBFindSimilar",
                path: "db/find-similar",
                component: () => import("@/views/Setting/DBFindSimilar/DBFindSimilar.vue")
            },
            {
                name: "SettingDimAnnotation",
                path: "dim/annotation",
                component: () => import("@/views/Setting/DimAnnotation/Annotation.vue")
            },
            {
                name: "SettingDimSource",
                path: "dim/source",
                component: () => import("@/views/Setting/DimSource/Source.vue")
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
        name: "Guide",
        path: "/guide",
        component: () => import("@/views/Guide/Guide.vue"),
        meta: {
            title: "Hedge指南"
        }
    },
    {
        name: "NotFound",
        path: "/:catchAll(.*)",
        component: () => import("@/views/NotFound.vue"),
        meta: {
            title: "无效页面"
        }
    }
]
