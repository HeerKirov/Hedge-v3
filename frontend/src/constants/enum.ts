import { OrganizationSituationForm } from "@/functions/http-client/api/util-illust"

export const ORGANIZE_MODE_TEXT: {mode: OrganizationSituationForm["organizeMode"], title: string, text: string}[] = [
    {mode: "FULL_SORT_ORGANIZE", title: "完全排序整理", text: "进行全局排序后，将邻近相似项合并"},
    {mode: "PARTIAL_SORT_ORGANIZE", title: "局部排序整理", text: "仅将相同来源的项聚拢并、排序，随后合并"},
    {mode: "FULL_ORGANIZE", title: "全局合并", text: "不排序，随后将相似项合并、聚拢"},
    {mode: "PARTIAL_ORGANIZE", title: "局部合并", text: "不排序，随后将邻近相似项合并"},
    {mode: "SAME_SOURCE_ORGANIZE", title: "相同来源整理", text: "仅将相同来源的项聚拢、排序，随后合并"},
]