<script setup lang="ts">
import * as echarts from "echarts"
import { onMounted, onBeforeUnmount, ref, watch } from "vue"
import { FindSimilarResultDetailImage, SimilarityRelationCoverage, SimilarityRelationEdge } from "@/functions/http-client/api/find-similar"
import { useAssets } from "@/functions/app"
import { onElementResize } from "@/utils/sensors"
import { numbers } from "@/utils/primitives"

const props = defineProps<{
    images: FindSimilarResultDetailImage[]
    edges: SimilarityRelationEdge[]
    coverages: SimilarityRelationCoverage[]
}>()

const { assetsUrl } = useAssets()

type GraphNodeItem = Exclude<Exclude<echarts.GraphSeriesOption["data"], undefined>[number], string | number | Date | (string | number | Date)[]>
type GraphLinkItem = Exclude<echarts.GraphSeriesOption["edges"], undefined>[number]
type CategoryItem = Exclude<echarts.GraphSeriesOption["categories"], undefined>[number]

const tooltipFormatter = (params: echarts.TooltipComponentFormatterCallbackParams): string => {
    const p = params as Exclude<echarts.TooltipComponentFormatterCallbackParams, any[]>
    if(p.dataType === "node") {
        const node = p.data as GraphNodeItem
        return graphNodeTooltips[node.id!] ?? "unknown node tooltip"
    }else if(p.dataType === "edge") {
        const link = p.data as GraphLinkItem
        return graphLinkTooltips[link.id!] ?? "unknown edge tooltip"
    }
    return "unknown tooltip"
}

const graphNodes: GraphNodeItem[] = []
const graphLinks: GraphLinkItem[] = []
const categories: CategoryItem[] = [{name: "图像"}, {name: "集合"}, {name: "画集"}, {name: "来源集合"}, {name: "来源ID"}]
const graphNodeTooltips: Record<string, string> = {}
const graphLinkTooltips: Record<string, string> = {}

const option: echarts.EChartsOption = {
    tooltip: {
        type: "item",
        position: "right",
        formatter: tooltipFormatter
    },
    series: [
        {
            name: "相似项关系视图",
            type: "graph",
            layout: "force",
            data: graphNodes,
            links: graphLinks,
            categories,
            roam: true,
            draggable: true,
            legendHoverLink: true,
            cursor: "pointer",
            symbolSize: 20,
            zoom: 6,
            label: {
                position: "top"
            },
            lineStyle: {
                width: 5
            },
            emphasis: {
                focus: "adjacency",
                lineStyle: {
                    width: 10
                }
            },
            force: {
                repulsion: 30
            }
        }
    ]
}

const chartDom = ref<HTMLElement>()

let chartInstance: echarts.EChartsType | null = null

const click = (e: echarts.ECElementEvent) => {
    const shift = e.event?.event.ctrlKey || e.event?.event.shiftKey
    const id = (e.data as GraphNodeItem).id
    graphNodes.forEach(d => {
        if(shift) {
            if(d.id === id) {
                if(d.itemStyle !== undefined) {
                    d.itemStyle = undefined
                }else{
                    d.itemStyle = {
                        shadowColor: '#1468cc',
                        shadowBlur: 10
                    }
                }
            }
        }else{
            if(d.id === id) {
                d.itemStyle = {
                    shadowColor: '#1468cc',
                    shadowBlur: 10
                }
            }else{
                d.itemStyle = undefined
            }
        }
    })
    chartInstance!.setOption(option)
}

watch(() => [props.images, props.edges, props.coverages] as const, ([images, edges, coverages]) => {
    graphNodes.splice(0, graphNodes.length)
    graphLinks.splice(0, graphLinks.length)

    images.forEach(image => {
        const id = `IMAGE:${image.id}`
        graphNodes.push({
            id,
            name: `图像:${image.id}`,
            category: "图像",
            symbol: `image://${assetsUrl(image.filePath.sample)}`
        })
        graphNodeTooltips[id] = `图像:${image.id}`
    })
    const imageToCoverages: Record<number, SimilarityRelationCoverage> = {}
    coverages.forEach(coverage => {
        if(coverage.info.type === "BOOK") {
            const id = `BOOK:${coverage.info.bookId}`
            const name = `画集:${coverage.info.bookId}`
            graphNodes.push({id, name, category: "画集", symbol: "circle", itemStyle: {color: "grey"}})
            graphNodeTooltips[id] = `画集:${coverage.info.bookId}<br/>有多个图像已通过此节点关联。`
            graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: "grey", type: "dashed"} as const})))
            coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>已关联的${name}`)
        }else if(coverage.info.type === "COLLECTION") {
            const id = `COLLECTION:${coverage.info.collectionId}`
            const name = `集合:${coverage.info.collectionId}`
            graphNodes.push({id, name, category: "集合", symbol: "circle", itemStyle: {color: "grey"}})
            graphNodeTooltips[id] = `集合:${coverage.info.collectionId}<br/>有多个图像已通过此节点关联。`
            graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: "grey", type: "dashed"} as const})))
            coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>已关联的${name}`)
        }else if(coverage.info.type === "SOURCE_BOOK") {
            const id = `SOURCE_BOOK:${coverage.info.site}:${coverage.info.sourceBookCode}`
            const name = `来源集合:${coverage.info.site}-${coverage.info.sourceBookCode}`
            graphNodes.push({id, name, category: "来源集合", symbol: "circle", itemStyle: {color: coverage.ignored ? "grey" : "blue"}})
            graphNodeTooltips[id] = `${coverage.ignored ? "(已标记忽略)" : ""}来源集合:${coverage.info.site}-${coverage.info.sourceBookCode}<br/><span class="is-font-size-small">有多个图像通过此节点产生了相关关系。</span>`
            graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: coverage.ignored ? "grey" : "blue"} as const})))
            coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>${coverage.ignored ? "已标记忽略" : "相关"}的${name}`)
        }else if(coverage.info.type === "SOURCE_IDENTITY_SIMILAR") {
            const id = `SOURCE_IDENTITY_SIMILAR:${coverage.info.site}:${coverage.info.sourceId}`
            const name = `来源ID:${coverage.info.site}-${coverage.info.sourceId}`
            graphNodes.push({id, name, category: "来源ID", symbol: "circle", itemStyle: {color: coverage.ignored ? "grey" : "blue"}})
            graphNodeTooltips[id] = `${coverage.ignored ? "(已标记忽略)" : ""}来源ID:${coverage.info.site}-${coverage.info.sourceId}<br/><span class="is-font-size-small">有多个图像通过此节点产生了相关关系。</span>`
            graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: coverage.ignored ? "grey" : "blue"} as const})))
            coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>${coverage.ignored ? "已标记忽略" : "相关"}的${name}`)
        }
        coverage.imageIds.forEach(imageId => imageToCoverages[imageId] = coverage)
    })
    
    edges.forEach(edge => {
        const id = `IMAGE:${edge.a} to IMAGE:${edge.b}`
        const color = imageToCoverages[edge.a]?.imageIds.some(imageId => imageId === edge.b) || edge.types.some(info => info.type === "ASSOCIATED" || info.type === "IGNORED") ? "grey"
            : edge.types.some(info => info.type === "SOURCE_IDENTITY_EQUAL") ? "orange"
            : edge.types.some(info => info.type === "SOURCE_RELATED") ? "blue"
            : edge.types.some(info => info.type === "HIGH_SIMILARITY") ? "green"
            : "purple"
        graphLinks.push({
            id,
            source: `IMAGE:${edge.a}`,
            target: `IMAGE:${edge.b}`,
            lineStyle: {color}
        })
        graphLinkTooltips[id] = `图像:${edge.a} & 图像:${edge.b}<br/>------<br/>` + edge.types.map(info => {
            if(info.type === "SOURCE_IDENTITY_EQUAL") {
                return info.sourcePartName !== null ? `<b>相同的来源页名</b>: ${info.site}/${info.sourcePartName}` 
                    : info.sourcePart !== null ? `<b>相同的来源ID与页码</b>: ${info.site} ${info.sourceId} p${info.sourcePart}` 
                    : `<b>相同的来源ID</b>: ${info.site} ${info.sourceId}`
            }else if(info.type === "SOURCE_RELATED") {
                return `<b>相关关系</b>: 来源关联项`
            }else if(info.type === "HIGH_SIMILARITY") {
                return `<b>内容相似</b>: ${numbers.round2decimal(info.similarity * 100)}%`
            }else if(info.type === "ASSOCIATED") {
                return `<span style="color:grey"><b>已关联</b>: 关联组引起的关联</span>`
            }else{
                return `<b style="color:grey">已标记忽略</b>`
            }
        }).join("<br/>")
    })

    chartInstance?.setOption(option)
}, {immediate: true})

onMounted(() => {
    chartInstance = echarts.init(chartDom.value)
    chartInstance.setOption(option)
    chartInstance.on("click", click)
})

onBeforeUnmount(() => {
    if(chartInstance !== null) {
        chartInstance.off("click")
        chartInstance.clear()
        chartInstance.dispose()
        chartInstance = null
    }
})

onElementResize(chartDom, () => chartInstance?.resize())

</script>

<template>
    <div ref="chartDom"/>
</template>
