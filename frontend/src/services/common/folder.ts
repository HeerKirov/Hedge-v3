import { ref, Ref, shallowRef, watch } from "vue"
import { FolderTreeNode } from "@/functions/http-client/api/folder"
import { FolderTable } from "@/components-module/data"

/**
 * 提供一个可复用的、面向FolderTable的搜索服务。
 * 它依据{searchText}的内容，在{data}中展开搜索。搜索结果的展示方式是在FolderTable中高亮显示，类似任意IDE的文本搜索那样。
 * {searchInfo}可告知搜索结果(数量和当前位置)，{next}和{prev}则可调整导航位置。
 */
export function useFolderTableSearch(data: Ref<FolderTreeNode[] | undefined>) {
    const searchText = ref("")

    const searchInfo = ref<{total: number, current: number} | null>(null)

    const searchResult = shallowRef<FolderTreeNode[] | null>(null)

    const folderTableRef = ref<InstanceType<typeof FolderTable>>()

    const jumpTo = (id: number) => {
        if(folderTableRef.value) folderTableRef.value.jumpTo(id)
    }

    const next = () => {
        if(searchResult.value?.length && searchInfo.value) {
            if(searchInfo.value.current < searchInfo.value.total - 1) {
                searchInfo.value.current += 1
            }else{
                searchInfo.value.current = 0
            }
            jumpTo(searchResult.value[searchInfo.value.current].id)
        }
    }

    const prev = () => {
        if(searchResult.value?.length && searchInfo.value) {
            if(searchInfo.value.current > 0) {
                searchInfo.value.current -= 1
            }else{
                searchInfo.value.current = searchInfo.value.total - 1
            }
            jumpTo(searchResult.value[searchInfo.value.current].id)
        }
    }

    watch(searchText, searchText => {
        const searchValue = searchText.trim().toLowerCase()
        if(searchValue) {
            const result: FolderTreeNode[] = []

            function condition(node: FolderTreeNode, text: string) {
                return node.title.toLowerCase().includes(text)
            }

            function searchInNodeList(nodes: FolderTreeNode[]) {
                for(const node of nodes) {
                    if(condition(node, searchValue)) result.push(node)
                    if(node.children?.length) searchInNodeList(node.children)
                }
            }

            if(data.value?.length) searchInNodeList(data.value)

            searchResult.value = result
            searchInfo.value = {total: result.length, current: 0}

            if(result.length) jumpTo(result[0].id)
        }else{
            searchInfo.value = null
            searchResult.value = null
        }
    })

    return {searchText, searchInfo, folderTableRef, next, prev}
}
