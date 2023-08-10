import { ComponentOptions, Ref, computed, ref, shallowRef, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { MenuDefinition } from "@/components/interaction"

/**
 * Markdown文档组织服务，兼侧边导航菜单栏功能。提供一组markdown文档的导入和地址，它自动生成菜单项和组件。
 */
export interface MarkdownDocument {
    menuItems: MenuDefinition[]
    menuSelected: Ref<{id: string, subId: string | null} | undefined>
    component: Ref<ComponentOptions | null>
    title: Ref<string | null>
}

export interface MarkdownDocumentOptions {
    documents: DocumentItem[]
}

type DocumentItem = DocumentScopeItem | DocumentPrimaryItem

interface DocumentScopeItem {
    type: "scope"
    scopeName: string
    label: string
}

interface DocumentPrimaryItem {
    type: "document"
    location: string
    title: string
    icon: string
    component(): Promise<ComponentOptions>
}


export function useMarkdownDocument(options: MarkdownDocumentOptions): MarkdownDocument {
    const route = useRoute()
    const router = useRouter()

    const menuItems: MenuDefinition[] = options.documents.map(doc => {
        if(doc.type === "scope") {
            return {type: "scope", id: doc.scopeName, label: doc.label}
        }else{
            return {type: "menu", id: doc.location, label: doc.title, icon: doc.icon}
        }
    })

    const innerMenuSelected = shallowRef<{id: string, subId: string | null}>()

    const menuSelected = computed({
        get: () => innerMenuSelected.value,
        set(selected) {
            if(selected !== undefined) {
                router.push({name: "Guide", query: {md: selected.id}})
            }
        }
    })

    const title = ref<string | null>(null)

    const component = shallowRef<ComponentOptions | null>(null)

    watch(() => route.query["md"], async query => {
        if(query === null || query === undefined) {
            for(const doc of options.documents) {
                if(doc.type === "document") {
                    router.replace({name: "Guide", query: {md: doc.location}})
                    break
                }
            }
            return
        }

        const location = typeof query === "string" ? query : query[0]!
        for(const doc of options.documents) {
            if(doc.type === "document" && doc.location === location) {
                component.value = (await doc.component()).default
                title.value = doc.title
                innerMenuSelected.value = {id: doc.location, subId: null}
                break
            }
        }
    }, {immediate: true})

    return {menuItems, menuSelected, component, title}
}