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
        name: "NotFound",
        path: "/:catchAll(.*)",
        component: () => import("@/views/NotFound.vue"),
        meta: {
            title: "Hedge"
        }
    }
]
