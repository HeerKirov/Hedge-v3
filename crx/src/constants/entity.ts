import { IconProp } from "@fortawesome/fontawesome-svg-core"

export const META_TYPE_ICONS: Record<"TOPIC" | "AUTHOR" | "TAG", IconProp> = {
    "TOPIC": "hashtag",
    "AUTHOR": "user-tag",
    "TAG": "tag"
}

export const TOPIC_TYPE_ICONS: Record<string, IconProp> = {
    "UNKNOWN": "question",
    "COPYRIGHT": "copyright",
    "IP": "bookmark",
    "CHARACTER": "user-ninja",
    "NODE": "tree"
}

export const AUTHOR_TYPE_ICONS: Record<string, IconProp> = {
    "UNKNOWN": "question",
    "ARTIST": "paint-brush",
    "GROUP": "swatchbook",
    "SERIES": "stamp"
}