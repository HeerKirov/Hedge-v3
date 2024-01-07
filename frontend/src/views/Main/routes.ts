import { RouteDefinition } from "@/modules/browser"

export default {
    routes: <RouteDefinition[]>[
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
            routeName: "CollectionDetail",
            defaultTitle: "集合",
            component: () => import("./Illust/CollectionDetail.vue")
        },
        {
            routeName: "Partition",
            defaultTitle: "时间分区",
            component: () => import("./Partition/Partition.vue")
        },
        {
            routeName: "PartitionDetail",
            defaultTitle: "时间分区详情",
            component: () => import("./Partition/PartitionDetail.vue")
        },
        {
            routeName: "Book",
            defaultTitle: "画集",
            component: () => import("./Book/Book.vue")
        },
        {
            routeName: "BookDetail",
            defaultTitle: "画集详情",
            component: () => import("./Book/BookDetail.vue")
        },
        {
            routeName: "Author",
            defaultTitle: "作者",
            component: () => import("./Author/AuthorList.vue")
        },
        {
            routeName: "AuthorCreate",
            defaultTitle: "新建作者",
            component: () => import("./Author/AuthorCreate.vue")
        },
        {
            routeName: "AuthorDetail",
            defaultTitle: "作者详情",
            component: () => import("./Author/AuthorDetail.vue")
        },
        {
            routeName: "Topic",
            defaultTitle: "主题",
            component: () => import("./Topic/TopicList.vue")
        },
        {
            routeName: "TopicCreate",
            defaultTitle: "新建主题",
            component: () => import("./Topic/TopicCreate.vue")
        },
        {
            routeName: "TopicDetail",
            defaultTitle: "主题详情",
            component: () => import("./Topic/TopicDetail.vue")
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
            component: () => import("./FindSimilar/FindSimilarList.vue")
        },
        {
            routeName: "FindSimilarDetail",
            defaultTitle: "相似项详情",
            component: () => import("./FindSimilar/FindSimilarDetail.vue")
        },
        {
            routeName: "QuickFindDetail",
            defaultTitle: "快速查找",
            component: () => import("./FindSimilar/QuickFindDetail.vue")
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
            component: () => import("./Folder/FolderList.vue")
        },
        {
            routeName: "FolderDetail",
            defaultTitle: "目录详情",
            component: () => import("./Folder/FolderDetail.vue")
        }
    ],
    stackDefinitions: [
        ["Illust", "CollectionDetail"],
        ["Partition", "PartitionDetail", "CollectionDetail"],
        ["Book", "BookDetail", "CollectionDetail"],
        ["Partition", "PartitionDetail"],
        ["Book", "BookDetail"],
        ["Author", "AuthorDetail"],
        ["Topic", "TopicDetail"],
        ["FindSimilar", "FindSimilarDetail"],
        ["Folder", "FolderDetail"]
    ]
}