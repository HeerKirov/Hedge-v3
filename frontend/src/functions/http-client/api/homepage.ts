import { UsefulColors } from "@/constants/ui"
import { LocalDate, date } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { SimpleIllust } from "./illust"
import { TopicType } from "./topic"
import { AuthorType } from "./author"
import { FilePath } from "./all"

export function createHomepageEndpoint(http: HttpInstance): HomepageEndpoint {
    return {
        homepage: http.createRequest("/api/homepage", "GET", {
            parseResponse: mapToHomepageInfo
        }),
        state: http.createRequest("/api/homepage/state")
    }
}

function mapToHomepageInfo(data: any): HomepageInfo {
    return {
        date: date.of(<string>data["date"]),
        todayImages: (<any[]>data["todayImages"]).map(data => ({
            id: <number>data["id"],
            filePath: <FilePath>data["filePath"],
            partitionTime: date.of(<string>data["partitionTime"])
        })),
        todayBooks: <Book[]>data["todayBooks"],
        todayAuthorAndTopics: <AuthorAndTopic[]>data["todayAuthorAndTopics"],
        recentImages: (<any[]>data["recentImages"]).map(data => ({
            id: <number>data["id"],
            filePath: <FilePath>data["filePath"],
            partitionTime: date.of(<string>data["partitionTime"])
        })),
        historyImages: (<any[]>data["historyImages"]).map(data => ({
            images: <SimpleIllust[]>data["images"],
            date: date.of(<string>data["date"])
        }))
    }
}

export interface HomepageEndpoint {
    /**
     * 获得主页信息。
     */
    homepage(): Promise<Response<HomepageInfo>>
    /**
     * 查看主要状态类信息。
     */
    state(): Promise<Response<HomepageState>>
}

interface HomepageState {
    importImageCount: number
    findSimilarCount: number
    stagingPostCount: number
}

interface HomepageInfo {
    date: LocalDate
    todayImages: Illust[]
    todayBooks: Book[]
    todayAuthorAndTopics: AuthorAndTopic[]
    recentImages: Illust[]
    historyImages: HistoryImage[]
}

type AuthorAndTopic = {
    metaType: "TOPIC"
    type: TopicType
    id: number
    name: string
    color: UsefulColors | null
    images: SimpleIllust[]
} | {
    metaType: "AUTHOR"
    type: AuthorType
    id: number
    name: string
    color: UsefulColors | null
    images: SimpleIllust[]
}

interface Book {
    id: number
    title: string
    filePath: FilePath | null
    imageCount: number
}

interface Illust extends SimpleIllust {
    partitionTime: LocalDate
}

interface HistoryImage {
    date: LocalDate
    images: SimpleIllust[]
}
