import { ComponentOptions, Ref, computed, ref, shallowRef, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { arrays } from "@/utils/primitives"

/**
 * Markdown文档组织服务，兼侧边导航菜单栏功能。提供一组markdown文档的导入和地址，它自动生成菜单项和组件。
 */
export interface MarkdownDocument {
    menuItems: DocumentScopeItem[]
    menuSelected: Ref<string | undefined>
    component: Ref<ComponentOptions | null>
    title: Ref<string | null>
}

export interface MarkdownDocumentOptions {
    routeName: string
    documentDir: string
    default: string
    documents: DocumentScopeItem[]
}

interface DocumentScopeItem {
    scopeName: string
    label: string
    documents: DocumentPrimaryItem[]
}

interface DocumentPrimaryItem {
    id: string
    title: string
    icon: string
    component(): Promise<ComponentOptions>
}

export function useMarkdownDocument(options: MarkdownDocumentOptions): MarkdownDocument {
    const route = useRoute()
    const router = useRouter()

    const innerMenuSelected = ref<string>()

    const menuSelected = computed({
        get: () => innerMenuSelected.value,
        set(selected) {
            if(selected !== undefined) {
                router.push({name: options.routeName, query: {md: selected}}).finally()
            }
        }
    })

    const title = ref<string | null>(null)

    const component = shallowRef<ComponentOptions | null>(null)

    const docMappingCache = arrays.toTupleMap(options.documents.flatMap(it => it.documents), doc => [doc.id, doc])

    watch(() => route.query["md"], async query => {
        if(query === null || query === undefined) {
            router.replace({name: options.routeName, query: {md: options.default}}).finally()
            return
        }

        const location = typeof query === "string" ? query : query[0]!
        const doc = docMappingCache[location]
        component.value = (await doc.component()).default
        title.value = doc.title
        innerMenuSelected.value = location
    }, {immediate: true})

    return {menuSelected, component, title, menuItems: options.documents}
}