import { danbooruIcon, ehentaiIcon, fanboxIcon, fantiaIcon, gelbooruIcon, imhentaiIcon, konachanIcon, nijieIcon, patreonIcon, pixivIcon, sankakuIcon, xIcon, gumroadIcon } from "@/assets"

export const SITE_ICONS: Record<string, string> = {
    "danbooru": danbooruIcon,
    "ehentai": ehentaiIcon,
    "fanbox": fanboxIcon,
    "fantia": fantiaIcon,
    "gelbooru": gelbooruIcon,
    "imhentai": imhentaiIcon,
    "konachan": konachanIcon,
    "nijie": nijieIcon,
    "patreon": patreonIcon,
    "pixiv": pixivIcon,
    "sankakucomplex": sankakuIcon,
    "twitter": xIcon,
    "gumroad": gumroadIcon,
}

export const SITE_FEATURES: Record<string, SITE_FEATURE[]> = {
    "danbooru": [],
    "ehentai": ["MIXED_SET_II"],
    "fanbox": [],
    "fantia": [],
    "gelbooru": [],
    "imhentai": ["MIXED_SET_II"],
    "konachan": [],
    "nijie": [],
    "patreon": [],
    "pixiv": ["MIXED_SET_II"],
    "sankakucomplex": ["MIXED_SET_I"],
    "twitter": [],
    "gumroad": []
}

export const SITE_FEATURE_DESCRIPTIONS: Record<SITE_FEATURE, string> = {
    "MIXED_SET_I": "混合图集检测: 该站点存在少许混乱标签，因此对于可能的混乱标签不会自动为其映射。",
    "MIXED_SET_II": "混合图集检测: 该站点存在很多混合图集，因此对于可能的混合图集不会自动为其映射。",
}

export type SITE_FEATURE = "MIXED_SET_I" | "MIXED_SET_II"