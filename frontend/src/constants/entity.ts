import { TopicType } from "@/functions/http-client/api/topic"
import { AuthorType } from "@/functions/http-client/api/author"
import { AnnotationTarget } from "@/functions/http-client/api/annotations"
import { MetaType } from "@/functions/http-client/api/all"
import { Tagme } from "@/functions/http-client/api/illust"

export const META_TYPES: MetaType[] = ["AUTHOR", "TOPIC", "TAG"]

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

export const TOPIC_TYPES_WITHOUT_UNKNOWN: TopicType[] = ["COPYRIGHT", "IP", "CHARACTER"]

export const TOPIC_TYPES: TopicType[] = ["UNKNOWN", ...TOPIC_TYPES_WITHOUT_UNKNOWN]

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

export const AUTHOR_TYPES_WITHOUT_UNKNOWN: AuthorType[] = ["ARTIST", "GROUP", "SERIES"]

export const AUTHOR_TYPES: AuthorType[] = ["UNKNOWN", ...AUTHOR_TYPES_WITHOUT_UNKNOWN]

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

export const ANNOTATION_TARGET_TYPES: AnnotationTarget[] = ["TAG", "COPYRIGHT", "IP", "CHARACTER", "ARTIST", "GROUP", "SERIES"]

export const ANNOTATION_TARGET_TYPE_ICONS: {[key in AnnotationTarget]: string} = {
    "TAG": META_TYPE_ICONS.TAG,
    "ARTIST": AUTHOR_TYPE_ICONS.ARTIST,
    "GROUP": AUTHOR_TYPE_ICONS.GROUP,
    "SERIES": AUTHOR_TYPE_ICONS.SERIES,
    "COPYRIGHT": TOPIC_TYPE_ICONS.COPYRIGHT,
    "IP": TOPIC_TYPE_ICONS.IP,
    "CHARACTER": TOPIC_TYPE_ICONS.CHARACTER
}

export const ANNOTATION_TARGET_TYPE_NAMES: {[key in AnnotationTarget]: string} = {
    "TAG": META_TYPE_NAMES.TAG,
    "ARTIST": AUTHOR_TYPE_NAMES.ARTIST,
    "GROUP": AUTHOR_TYPE_NAMES.GROUP,
    "SERIES": AUTHOR_TYPE_NAMES.SERIES,
    "COPYRIGHT": TOPIC_TYPE_NAMES.COPYRIGHT,
    "IP": TOPIC_TYPE_NAMES.IP,
    "CHARACTER": TOPIC_TYPE_NAMES.CHARACTER
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
