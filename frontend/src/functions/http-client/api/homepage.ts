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
        ...data,
        date: date.of(<string>data["date"]),
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
    todayImages: SimpleIllust[]
    todayBooks: Book[]
    todayAuthorAndTopics: AuthorAndTopic[]
    recentImages: SimpleIllust[]
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

interface HistoryImage {
    date: LocalDate
    images: SimpleIllust[]
}
