import { Tagme } from "@/functions/http-client/api/illust"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"

export type SetValue = (form: SetDataForm) => Promise<boolean>

export interface SetDataForm {
    topics?: number[]
    authors?: number[]
    tags?: number[]
    tagme?: Tagme[]
}

export interface UpdateDataForm {
    topics?: RelatedSimpleTopic[]
    authors?: RelatedSimpleAuthor[]
    tags?: RelatedSimpleTag[]
    tagme?: Tagme[]
}
