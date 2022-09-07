import { RouteRecordRaw } from "vue-router"

export default <RouteRecordRaw[]>[
    {
        name: 'Index',
        path: '/',
        component: () => import('@/views/Index.vue')
    },
    {
        name: 'NotFound',
        path: '/:catchAll(.*)',
        component: () => import('@/views/NotFound.vue'),
        meta: {
            title: "Hedge"
        }
    }
]
