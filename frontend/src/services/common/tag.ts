import { ref, Ref, shallowRef, watch } from "vue"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { TagTree } from "@/components-module/data"

export function useTagTreeSearch(data: Ref<TagTreeNode[] | undefined>) {
    const searchText = ref("")

    const searchInfo = ref<{total: number, current: number} | null>(null)

    const searchResult = shallowRef<TagTreeNode[] | null>(null)

    const tagTreeRef = ref<InstanceType<typeof TagTree>>()

    const jumpTo = (id: number) => {
        if(tagTreeRef.value) tagTreeRef.value.jumpTo(id)
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
            const result: TagTreeNode[] = []

            function condition(node: TagTreeNode, text: string) {
                return node.name.toLowerCase().includes(text) || node.otherNames.some(n => n.toLowerCase().includes(text))
            }

            function searchInNodeList(nodes: TagTreeNode[]) {
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

    return {searchText, searchInfo, tagTreeRef, next, prev}
}
