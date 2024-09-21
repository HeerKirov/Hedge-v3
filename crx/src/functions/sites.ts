
export const EHENTAI_CONSTANTS = {
    HOSTS: ["e-hentai.org", "exhentai.org"],
    PATTERNS: {
        ANY_IMAGE_URL: ["https://e-hentai.org/s/*/*", "https://exhentai.org/s/*/*"],
        GALLERY_URL: (sourceId: string) => [`https://e-hentai.org/g/${sourceId}/*`, `https://exhentai.org/g/${sourceId}/*`],
        MPV_URL: (sourceId: string) => [`https://e-hentai.org/mpv/${sourceId}/*`, `https://exhentai.org/mpv/${sourceId}/*`]
    },
    REGEXES: {
        GALLERY_PATHNAME: /^\/g\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)\/?$/,
        MPV_PATHNAME: /^\/mpv\/(?<GID>\d+)\/(?<TOKEN>[a-zA-Z0-9]+)\/?$/,
        IMAGE_PATHNAME: /^\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)\/?$/,
        TAG_PATHNAME: /^\/tag\/(?<TYPE>.*):(?<NAME>.+)\/?$/,
        HOMEPAGE_URL: /https:\/\/e[-x]hentai\.org\/$/,
        FULLIMG_URL: /https:\/\/e[-x]hentai\.org\/fullimg\.php\?gid=(?<GID>\d+)&page=(?<PAGE>\d+)/,
        IMAGE_URL: /https:\/\/e[-x]hentai\.org\/s\/(?<PHASH>[a-zA-Z0-9]+)\/(?<GID>\d+)-(?<PAGE>\d+)/
    }
}

export const PIXIV_CONSTANTS = {
    HOSTS: ["www.pixiv.net"],
    PATTERNS: {
        ARTWORK_URL: (sourceId: string) => `https://www.pixiv.net/artworks/${sourceId}`
    },
    REGEXES: {
        ARTWORK_PATHNAME: /^\/artworks\/(?<PID>\d+)\/?$/,
        USER_PATHNAME: /^\/users\/(?<UID>\d+)\/?/,
        USER_ABOUT_PATHNAME: /^\/users\/(?<UID>\d+)(\/(artworks|illustrations|manga))?\/?$/,
        HOMEPAGE_URL: /https:\/\/www\.pixiv\.net\/$/
    }
}

export const SANKAKUCOMPLEX_CONSTANTS = {
    HOSTS: ["chan.sankakucomplex.com"],
    PATTERNS: {
        ANY_URL: "https://chan.sankakucomplex.com/*",
        POST_URL: (pid: string) => [
            `https://chan.sankakucomplex.com/*/posts/${pid}`,
            `https://chan.sankakucomplex.com/*/posts/show/${pid}`,
            `https://chan.sankakucomplex.com/*/post/show/${pid}`,
            `https://chan.sankakucomplex.com/posts/${pid}`,
            `https://chan.sankakucomplex.com/posts/show/${pid}`,
            `https://chan.sankakucomplex.com/post/show/${pid}`
        ],
        BOOK_URL: (bookId: number | string) => `https://chan.sankakucomplex.com/pool/show/${bookId}`
    },
    REGEXES: {
        POST_PATHNAME: /^\/(\S+\/)?(post\/show|posts|posts\/show)\/(?<PID>[A-Za-z0-9]+)\/?$/,
        SEARCH_PATHNAME: /^(\/|\/post|\/\S+\/post|\/posts|\/\S+\/posts)\/?$/
    }
}

export const FANBOX_CONSTANTS = {
    HOSTS: ["www.fanbox.cc"],
    PATTERNS: {
        POST_URL: (sourceId: string) => `https://www.fanbox.cc/*/posts/${sourceId}`
    },
    REGEXES: {
        POST_PATHNAME: /^\/@(?<ARTIST>[^/]+)\/posts\/(?<PID>\d+)\/?$/
    }
}

export const KEMONO_CONSTANTS = {
    HOSTS: ["kemono.su"],
    REGEXES: {
        POST_URL: /https:\/\/kemono.su\/(?<SITE>\S+)\/user\/(?<UID>\d+)\/post\/(?<PID>\d+)(\/revision\/\d+)?\/?(#part=(?<PAGE>\d+))?/
    }
}

/**
 * 在Collect SourceData功能中受支持的网站。此处只包含了网站的总定义(即默认设置)，一些细节都在source-data模块。
 */
export const SOURCE_DATA_COLLECT_SITES: {[siteName: string]: SourceDataCollectRule} = {
    "sankakucomplex": {
        sourceSite: "sankakucomplex",
        host: SANKAKUCOMPLEX_CONSTANTS.HOSTS,
        activeTabPages: [
            SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME
        ]
    },
    "ehentai": {
        sourceSite: "ehentai",
        host: EHENTAI_CONSTANTS.HOSTS,
        activeTabPages: [
            EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME,
            EHENTAI_CONSTANTS.REGEXES.MPV_PATHNAME,
            EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME
        ]
    },
    "pixiv": {
        sourceSite: "pixiv",
        host: PIXIV_CONSTANTS.HOSTS,
        activeTabPages: [
            PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME
        ]
    },
    "fanbox": {
        sourceSite: "fanbox",
        host: FANBOX_CONSTANTS.HOSTS,
        activeTabPages: [
            FANBOX_CONSTANTS.REGEXES.POST_PATHNAME
        ]
    }
}

/**
 * 可进行来源数据采集与交互的站点的定义。
 */
interface SourceDataCollectRule {
    /**
     * 此站点的sourceSite名称，与服务端和来源数据中的名称保持一致。
     */
    sourceSite: string
    /**
     * 此站点包括哪些可用host。
     */
    host: string | string[]
    /**
     * 此站点中，在哪些页面中，可以激活active-tab的信息播报。
     */
    activeTabPages: RegExp[]
}
