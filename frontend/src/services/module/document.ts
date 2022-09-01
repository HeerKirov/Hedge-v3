import { watch } from "vue"
import { useRoute } from "vue-router"

/**
 * 提供一个标题变更watcher。根据route.meta.title变更当前的document标题。
 */
export function installDocumentTitle() {
    const route = useRoute()
    watch(() => route.meta, meta => { document.title = (<string | undefined>meta.title) ?? "Hedge" }, {immediate: true})
}
