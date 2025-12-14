import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
    manifest_version: 3,
    name: "Hedge v3 Helper",
    version: pkg.version,
    description: "在各个图源网站上提供Hedge直连功能，并提供易用性优化的扩展工具。",
    icons: {
        "128": "public/favicon.png"
    },
    permissions: ["bookmarks", "downloads", "downloads.open", "contextMenus", "notifications", "tabs", "activeTab", "storage", "sidePanel"],
    host_permissions: [
        "*://localhost/"
    ],
    web_accessible_resources: [
        {
            "resources": [
                "favicon.png",
                "assets/*"
            ],
            "matches": ["<all_urls>"]
        }
    ],
    action: {
        "default_popup": "popup.html"
    },
    side_panel: {
        "default_path": "side-panel.html"
    },
    background: {
        "service_worker": "src/background.tsx",
        "type": "module"
    },
    content_scripts: [
        {
            "matches": ["https://chan.sankakucomplex.com/*"],
            "js": ["src/scripts/sankakucomplex/global.ts"],
            "run_at": "document_start"
        },
        {
            "matches": [
                "https://chan.sankakucomplex.com/*/post/show/*",
                "https://chan.sankakucomplex.com/*/posts/*",
                "https://chan.sankakucomplex.com/*/posts/show/*",
                "https://chan.sankakucomplex.com/post/show/*",
                "https://chan.sankakucomplex.com/posts/*",
                "https://chan.sankakucomplex.com/posts/show/*"
            ],
            "js": ["src/scripts/sankakucomplex/post.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://e-hentai.org/", "https://e-hentai.org/?*", "https://e-hentai.org/tag/*", "https://exhentai.org/", "https://exhentai.org/?*", "https://exhentai.org/tag/*"],
            "js": ["src/scripts/ehentai/global.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://e-hentai.org/g/*", "https://exhentai.org/g/*"],
            "js": ["src/scripts/ehentai/gallery.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://e-hentai.org/mpv/*", "https://exhentai.org/mpv/*"],
            "js": ["src/scripts/ehentai/mpv.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://e-hentai.org/s/*", "https://exhentai.org/s/*"],
            "js": ["src/scripts/ehentai/image.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://www.pixiv.net/users/*"],
            js: ["src/scripts/pixiv/illustrations.ts"],
            run_at: "document_start"
        },
        {
            "matches": ["https://www.pixiv.net/artworks/*"],
            "js": ["src/scripts/pixiv/artworks.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://*.fanbox.cc/*"],
            "js": ["src/scripts/fanbox/global.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://www.fanbox.cc/*/posts/*", "https://*.fanbox.cc/posts/*"],
            "js": ["src/scripts/fanbox/post.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://fantia.jp/posts/*"],
            "js": ["src/scripts/fantia/post.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://fantia.jp/posts/*/post_content_photo/*"],
            "js": ["src/scripts/fantia/post_content_photo.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://kemono.su/*/user/*/post/*", "https://kemono.cr/*/user/*/post/*"],
            "js": ["src/scripts/kemono/post.ts"],
            "run_at": "document_start"
        },
        {
            "matches": ["https://kemono.su/*/user/*", "https://kemono.cr/*/user/*"],
            "js": ["src/scripts/kemono/posts.ts"],
            "run_at": "document_start"
        },
        {
            "matches": [
                "https://www.pixiv.net/artworks/*",
                "https://danbooru.donmai.us/posts/*",
                "https://gelbooru.com/*",
                "https://kemono.su/*", "https://kemono.cr/*",
                "https://www.fanbox.cc/*/posts/*", "https://*.fanbox.cc/posts/*",
                "https://cc.fantia.jp/*", "https://fantia.jp/*"
            ],
            "js": ["src/scripts/utils/referrer-policy.ts"],
            "run_at": "document_start"
        }
    ],
    options_page: "options.html"
})

