import { RouteDefinition } from "@/modules/browser"

export default <RouteDefinition[]>[
    {
        routeName: "Home",
        defaultTitle: "主页",
        component: () => import("./Home/Home.vue")
    },
    {
        routeName: "Illust",
        defaultTitle: "图库",
        component: () => import("./Illust/Illust.vue")
    },
    {
        routeName: "Partition",
        defaultTitle: "时间分区",
        component: () => import("./Partition/Partition.vue")
    },
    {
        routeName: "Book",
        defaultTitle: "画集",
        component: () => import("./Book/Book.vue")
    },
    {
        routeName: "Author",
        defaultTitle: "作者",
        component: () => import("./Author/Author.vue")
    },
    {
        routeName: "Topic",
        defaultTitle: "主题",
        component: () => import("./Topic/Topic.vue")
    },
    {
        routeName: "Tag",
        defaultTitle: "标签",
        component: () => import("./Tag/Tag.vue")
    },
    {
        routeName: "Annotation",
        defaultTitle: "注解",
        component: () => import("./Annotation/Annotation.vue")
    },
    {
        routeName: "SourceData",
        defaultTitle: "来源数据",
        component: () => import("./SourceData/SourceData.vue")
    },
    {
        routeName: "Import",
        defaultTitle: "导入",
        component: () => import("./Import/Import.vue")
    },
    {
        routeName: "FindSimilar",
        defaultTitle: "相似项目",
        component: () => import("./FindSimilar/FindSimilar.vue")
    },
    {
        routeName: "Trash",
        defaultTitle: "已删除",
        component: () => import("./Trash/Trash.vue")
    },
    {
        routeName: "StagingPost",
        defaultTitle: "暂存区",
        component: () => import("./StagingPost/StagingPost.vue")
    },
    {
        routeName: "Folder",
        defaultTitle: "目录",
        component: () => import("./Folder/Folder.vue")
    }
]