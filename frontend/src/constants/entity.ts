import { TopicType } from "@/functions/http-client/api/topic"
import { AuthorType } from "@/functions/http-client/api/author"
import { MetaType } from "@/functions/http-client/api/all"
import { Tagme } from "@/functions/http-client/api/illust"

export const META_TYPE_ICONS: {[key in MetaType]: string} = {
    "TOPIC": "hashtag",
    "AUTHOR": "user-tag",
    "TAG": "tag"
}

export const META_TYPE_NAMES: {[key in MetaType]: string} = {
    "TOPIC": "主题",
    "AUTHOR": "作者",
    "TAG": "标签"
}

export const TOPIC_TYPES_WITHOUT_UNKNOWN = ["COPYRIGHT", "IP", "CHARACTER"] as const

export const TOPIC_TYPES = ["UNKNOWN", ...TOPIC_TYPES_WITHOUT_UNKNOWN] as const

export const TOPIC_TYPE_ICONS: {[key in TopicType]: string} = {
    "UNKNOWN": "question",
    "COPYRIGHT": "copyright",
    "IP": "bookmark",
    "CHARACTER": "user-ninja"
}

export const TOPIC_TYPE_NAMES: {[key in TopicType]: string} = {
    "UNKNOWN": "未知类型",
    "COPYRIGHT": "版权方",
    "IP": "作品",
    "CHARACTER": "角色"
}

export const AUTHOR_TYPES_WITHOUT_UNKNOWN = ["ARTIST", "GROUP", "SERIES"] as const

export const AUTHOR_TYPES = ["UNKNOWN", ...AUTHOR_TYPES_WITHOUT_UNKNOWN] as const

export const AUTHOR_TYPE_ICONS: {[key in AuthorType]: string} = {
    "UNKNOWN": "question",
    "ARTIST": "paint-brush",
    "GROUP": "swatchbook",
    "SERIES": "stamp"
}

export const AUTHOR_TYPE_NAMES: {[key in AuthorType]: string} = {
    "UNKNOWN": "未知类型",
    "ARTIST": "画师",
    "GROUP": "社团",
    "SERIES": "系列作品"
}

export const TAGME_TYPES: Tagme[] = ["TAG", "AUTHOR", "TOPIC", "SOURCE"]

export const TAGME_TYPE_ICONS: {[key in Tagme]: string} = {
    "TAG": META_TYPE_ICONS.TAG,
    "AUTHOR": META_TYPE_ICONS.AUTHOR,
    "TOPIC": META_TYPE_ICONS.TOPIC,
    "SOURCE": "pager"
}

export const TAGME_TYPE_NAMES: {[key in Tagme]: string} = {
    "TAG": META_TYPE_NAMES.TAG,
    "AUTHOR": META_TYPE_NAMES.AUTHOR,
    "TOPIC": META_TYPE_NAMES.TOPIC,
    "SOURCE": "来源信息"
}
