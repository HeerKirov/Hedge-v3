import { LocalDate, date } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { SimpleIllust } from "./illust"
import { TopicType } from "./topic"
import { AuthorType } from "./author"
import { UsefulColors } from "@/constants/ui"

export function createHomepageEndpoint(http: HttpInstance): HomepageEndpoint {
    return {
        homepage: http.createRequest("/api/homepage", "GET", {
            parseResponse: mapToHomepageInfo
        })
    }
}

function mapToHomepageInfo(data: any): HomepageInfo {
    return {
        date: date.of(<string>data["date"]),
        todayImages: (<any[]>data["todayImages"]).map(data => ({
            id: <number>data["id"],
            thumbnailFile: <string>data["thumbnailFile"],
            partitionTime: date.of(<string>data["partitionTime"])
        })),
        todayBooks: <Book[]>data["todayBooks"],
        todayAuthorAndTopics: <AuthorAndTopic[]>data["todayAuthorAndTopics"],
        recentImages: (<any[]>data["recentImages"]).map(data => ({
            id: <number>data["id"],
            thumbnailFile: <string>data["thumbnailFile"],
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
    thumbnailFile: string | null
    imageCount: number
}

interface Illust extends SimpleIllust {
    partitionTime: LocalDate
}

interface HistoryImage {
    date: LocalDate
    images: SimpleIllust[]
}
