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
                name: "MainIllust",
                path: "illust",
                component: () => import("@/views/Main/Illust/Illust.vue")
            },
            {
                name: "MainPartition",
                path: "partition",
                component: () => import("@/views/Main/Partition/Partition.vue")
            },
            {
                name: "MainBook",
                path: "book",
                component: () => import("@/views/Main/Book/Book.vue")
            },
            {
                name: "MainAuthor",
                path: "author",
                component: () => import("@/views/Main/Author/Author.vue")
            },
            {
                name: "MainTopic",
                path: "topic",
                component: () => import("@/views/Main/Topic/Topic.vue")
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
            },
            {
                name: "MainSourceData",
                path: "source",
                component: () => import("@/views/Main/SourceData/SourceData.vue")
            },
            {
                name: "MainImport",
                path: "import",
                component: () => import("@/views/Main/Import/Import.vue")
            },
            {
                name: "MainFindSimilar",
                path: "find-similar",
                component: () => import("@/views/Main/FindSimilar/FindSimilar.vue")
            },
            {
                name: "MainTrash",
                path: "trash",
                component: () => import("@/views/Main/Trash/Trash.vue")
            },
            {
                name: "MainStagingPost",
                path: "staging-post",
                component: () => import("@/views/Main/StagingPost/StagingPost.vue")
            },
            {
                name: "MainFolder",
                path: "folder",
                component: () => import("@/views/Main/Folder/Folder.vue")
            }
        ]
    },
    {
        name: "Preview",
        path: "/preview",
        component: () => import("@/views/Preview.vue")
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
