import { SourceDataPath } from "@/functions/server/api-all"
import { sessions } from "@/functions/storage"

export const EHENTAI_CONSTANTS = {
    SITE_NAME: "ehentai",
    HOSTS: ["e-hentai.org", "exhentai.org"],
    PATTERNS: {
        GALLERY_PATHNAME: (sourceId: string) => [`https://e-hentai.org/g/${sourceId}/*`, `https://exhentai.org/g/${sourceId}/*`],
    },
    REGEXES: {
        GALLERY_PATHNAME: /^\/g\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)\/?$/,
        MPV_PATHNAME: /^\/mpv\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)\/?$/,
        IMAGE_PATHNAME: /^\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)\/?$/
    }
}

export const PIXIV_CONSTANTS = {
    SITE_NAME: "pixiv",
    HOSTS: ["www.pixiv.net"],
    PATTERNS: {
        ARTWORK_PATHNAME: (sourceId: string) => [`https://www.pixiv.net/artworks/${sourceId}`]
    },
    REGEXES: {
        ARTWORK_PATHNAME: /^\/artworks\/(?<PID>\d+)\/?$/,
        USER_PATHNAME: /^\/users\/(?<UID>\d+)\/?/
    }
}

export const SANKAKUCOMPLEX_CONSTANTS = {
    SITE_NAME: "sankakucomplex",
    HOSTS: ["chan.sankakucomplex.com"],
    PATTERNS: {
        POST_PATHNAME: (pid: string) => [
            `https://chan.sankakucomplex.com/*/posts/${pid}`,
            `https://chan.sankakucomplex.com/*/posts/show/${pid}`,
            `https://chan.sankakucomplex.com/*/post/show/${pid}`,
            `https://chan.sankakucomplex.com/posts/${pid}`,
            `https://chan.sankakucomplex.com/posts/show/${pid}`,
            `https://chan.sankakucomplex.com/post/show/${pid}`
        ],
        BOOK_PATHNAME: (bookId: number | string) => `/pool/show/${bookId}`
    },
    REGEXES: {
        POST_PATHNAME: /^\/(\S+\/)?(post\/show|posts|posts\/show)\/(?<PID>[A-Za-z0-9]+)\/?$/
    }
}

export const FANBOX_CONSTANTS = {
    SITE_NAME: "fanbox",
    HOSTS: ["www.fanbox.cc"],
    PATTERNS: {
        POST_PATHNAME: (sourceId: string) => [
            `https://www.fanbox.cc/*/posts/${sourceId}`,
            `https://*.fanbox.cc/posts/${sourceId}`
        ]
    },
    REGEXES: {
        HOST: /^(?<CREATOR>[^.]+)\.fanbox\.cc$/,
        POST_PATHNAME: /^(\/@(?<ARTIST>[^/]+))?\/posts\/(?<PID>\d+)\/?$/,
        ANY_CREATOR_PATHNAME: /^\/@(?<CREATOR>[^/]+)/
    }
}

export const FANTIA_CONSTANTS = {
    SITE_NAME: "fantia",
    HOSTS: ["fantia.jp"],
    PATTERNS: {
        POST_PATHNAME: (sourceId: string) => [
            `https://fantia.jp/posts/${sourceId}`,
        ]
    },
    REGEXES: {
        POST_PATHNAME: /^\/posts\/(?<PID>\d+)\/?$/,
        PHOTO_PATHNAME: /^\/posts\/(?<PID>\d+)\/post_content_photo\/(?<PNAME>\d+)\/?$/,
        USER_PATHNAME: /^\/fanclubs\/(?<UID>\d+)\/?/
    }
}

export const KEMONO_CONSTANTS = {
    SITE_NAME: "kemono",
    HOSTS: ["kemono.su", "kemono.cr"],
    PATTERNS: {
        POST_PATHNAME: (site: string, sourceId: string) => [
            `https://kemono.cr/${site}/user/*/posts/${sourceId}`,
            `https://kemono.cr/${site}/user/*/posts/${sourceId}/revision/*`,
        ]
    },
    REGEXES: {
        POST_PATHNAME: /^\/(?<SITE>\S+)\/user\/(?<UID>\d+)\/post\/(?<PID>[^/]+)(\/revision\/\d+)?\/?$/
    },
    AVAILABLE_SERVICES: ["fanbox", "fantia", "patreon", "gumroad"] as const
}

export const DANBOORU_CONSTANTS = {
    SITE_NAME: "danbooru",
    HOSTS: ["danbooru.donmai.us"],
    REGEXES: {}
}

export const GELBOORU_CONSTANTS = {
    SITE_NAME: "gelbooru",
    HOSTS: ["gelbooru.com"],
    REGEXES: {}
}

/**
 * 在此处集中声明各个站点的功能。
 */
export const WEBSITES: Readonly<{[siteName: string]: WebsiteConstant}> = {
    [SANKAKUCOMPLEX_CONSTANTS.SITE_NAME]: {
        host: SANKAKUCOMPLEX_CONSTANTS.HOSTS,
        activeTabPages: [
            SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME
        ],
        sourceDataPages: SANKAKUCOMPLEX_CONSTANTS.PATTERNS.POST_PATHNAME
    },
    [EHENTAI_CONSTANTS.SITE_NAME]: {
        host: EHENTAI_CONSTANTS.HOSTS,
        activeTabPages: [
            EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME,
            EHENTAI_CONSTANTS.REGEXES.MPV_PATHNAME,
            EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME
        ],
        sourceDataPages: EHENTAI_CONSTANTS.PATTERNS.GALLERY_PATHNAME
    },
    [PIXIV_CONSTANTS.SITE_NAME]: {
        host: PIXIV_CONSTANTS.HOSTS,
        activeTabPages: [
            PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME
        ],
        sourceDataPages: PIXIV_CONSTANTS.PATTERNS.ARTWORK_PATHNAME
    },
    [FANBOX_CONSTANTS.SITE_NAME]: {
        host: [...FANBOX_CONSTANTS.HOSTS, FANBOX_CONSTANTS.REGEXES.HOST],
        activeTabPages: [
            FANBOX_CONSTANTS.REGEXES.POST_PATHNAME
        ],
        sourceDataPages: s => [
            ...FANBOX_CONSTANTS.PATTERNS.POST_PATHNAME(s),
            ...KEMONO_CONSTANTS.PATTERNS.POST_PATHNAME("fanbox", s)
        ]
    },
    [FANTIA_CONSTANTS.SITE_NAME]: {
        host: FANTIA_CONSTANTS.HOSTS,
        activeTabPages: [
            FANTIA_CONSTANTS.REGEXES.POST_PATHNAME,
            FANTIA_CONSTANTS.REGEXES.PHOTO_PATHNAME
        ],
        sourceDataPages: s => [
            ...FANTIA_CONSTANTS.PATTERNS.POST_PATHNAME(s),
            ...KEMONO_CONSTANTS.PATTERNS.POST_PATHNAME("fantia", s)
        ]
    },
    [KEMONO_CONSTANTS.SITE_NAME]: {
        host: KEMONO_CONSTANTS.HOSTS,
        activeTabPages: [
            KEMONO_CONSTANTS.REGEXES.POST_PATHNAME
        ]
    }
}

/**
 * 在此处集中声明重命名建议机制的默认规则集。
 */
export const DETERMINING_RULES: Readonly<DeterminingRule[]> = [
    {
        siteName: PIXIV_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/www\.pixiv\.net\//,
        filename: /(?<ID>\d+)_p(?<PART>\d+)/,
        collectSourceData: true
    },
    {
        siteName: FANTIA_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/fantia\.jp\/posts\/(?<ID>\d+)\/post_content_photo\/(?<PNAME>\d+)\/?/,
        collectSourceData: true,
        sourcePath: async args => {
            const page = await sessions.cache.fantiaPageNum.get({pid: args["ID"], pname: args["PNAME"]})
            // console.log("get fantiaPageNum", {pid: args["ID"], pname: args["PNAME"]}, page)
            if(page) {
                return {sourceSite: FANTIA_CONSTANTS.SITE_NAME, sourceId: args["ID"], sourcePart: page.page, sourcePartName: args["PNAME"]}
            }else{
                return {sourceSite: FANTIA_CONSTANTS.SITE_NAME, sourceId: args["ID"], sourcePart: null, sourcePartName: args["PNAME"]}
            }
        }
    },
    {
        siteName: DANBOORU_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/danbooru\.donmai\.us\/posts\/(?<ID>\d+)/
    },
    {
        siteName: GELBOORU_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/gelbooru\.com\/index\.php\?.*id=(?<ID>\d+)/
    }
]

/**
 * 在此处集中声明附件重命名建议机制的默认规则集。
 */
export const ATTACHMENT_RULES: Readonly<AttachmentRule[]> = [
    {
        siteName: FANBOX_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/([^.]+)\.fanbox\.cc\/([^/]+\/)?posts\/(?<ID>\d+)\/?$/
    },
    {
        siteName: KEMONO_CONSTANTS.SITE_NAME,
        referrer: /^https:\/\/kemono\.(su|cr)\/(?<SITE>\S+)\/user\/(?<UID>\d+)\/post\/(?<ID>[^/]+)(\/revision\/\d+)?\/?$/,
        sourcePath: args => ({sourceSite: args["SITE"], sourceId: args["SITE"] === "gumroad" ? `${args["UID"]}.${args["ID"]}` : args["ID"], sourcePart: null, sourcePartName: null})
    }
]

/**
 * 集中声明站点的定义。
 */
interface WebsiteConstant {
    /**
     * host：此站点包括哪些可用host。在active-tab识别中会用到。
     */
    host: (string | RegExp)[]
    /**
     * active-tab支持：此站点中，可以激活active-tab的信息播报的页面。这些页面会发送SUBMIT_PAGE_INFO信息，并响应REPORT_PAGE_INFO事件。
     * 由于其使用方式是对当前页面的pathname部分进行测试，因此提供的值应当是一组正则表达式，仅匹配pathname部分。
     */
    activeTabPages?: RegExp[]
    /**
     * source-data支持：此站点中，可以支持来源数据收集的页面。这些页面会发送SUBMIT_SOURCE_DATA信息，并响应REPORT_SOURCE_DATA事件。
     * 由于其使用方式是调用tab API进行通配，因此提供的值应当是一组通配符字符串，匹配完整的url。
     */
    sourceDataPages?: (sourceId: string) => string[]
}

/**
 * 重命名建议规则。
 */
interface DeterminingRule {
    /**
     * 使用的source site名称。
     */
    siteName: string
    /**
     * 对referrer匹配。
     */
    referrer?: RegExp
    /**
     * 对url匹配。
     */
    url?: RegExp
    /**
     * 对不包括扩展名部分的文件名匹配。
     */
    filename?: RegExp
    /**
     * 对于此规则，是否应该收集其来源数据。
     */
    collectSourceData?: boolean
    /**
     * 生成sourcePath的规则。
     */
    sourcePath?: (args: Record<string, string>) => Promise<SourceDataPath>
}

/**
 * 附件重命名建议规则。
 */
interface AttachmentRule {
    /**
     * 使用的source site名称。
     */
    siteName: string
    /**
     * 对referrer匹配。
     */
    referrer?: RegExp
    /**
     * 对url匹配。
     */
    url?: RegExp
    /**
     * 对不包括扩展名部分的文件名匹配。
     */
    filename?: RegExp
    /**
     * 生成sourcePath的规则。
     */
    sourcePath?: (args: Record<string, string>) => SourceDataPath
    /**
     * 生成前缀的规则。
     */
    prefix?: (args: Record<string, string>) => string
}