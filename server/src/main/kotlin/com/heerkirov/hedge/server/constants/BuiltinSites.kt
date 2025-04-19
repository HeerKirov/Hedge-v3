package com.heerkirov.hedge.server.constants

import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.dto.res.SourceSiteRes
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType

val BUILTIN_SITES = listOf(
    SourceSiteRes(
        name = "pixiv", title = "Pixiv", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = listOf("https://www.pixiv.net/artworks/{{id}}"),
        tagTypes = listOf("artist", "tag", "meta"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "ehentai", title = "E-Hentai", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE_WITH_NAME,
        sourceLinkRules = listOf("https://e-hentai.org/g/{{id}}/{{token}}/"),
        tagTypes = listOf("artist", "group", "parody", "category", "character", "language", "reclass", "male", "female", "mixed", "other", "temp"),
        tagTypeMappings = mapOf(
            "artist" to TagAuthorType.ARTIST.name,
            "group" to TagAuthorType.GROUP.name,
            "parody" to TagTopicType.IP.name,
            "character" to TagTopicType.CHARACTER.name,
            "category" to MetaType.TAG.name,
            "language" to MetaType.TAG.name,
            "reclass" to MetaType.TAG.name,
            "male" to MetaType.TAG.name,
            "female" to MetaType.TAG.name,
            "mixed" to MetaType.TAG.name,
            "other" to MetaType.TAG.name,
            "temp" to MetaType.TAG.name
        ),
        additionalInfo = listOf(SourceOption.AvailableAdditionalInfo("token", "Token"))
    ),
    SourceSiteRes(
        name = "sankakucomplex", title = "Sankaku", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.STRING, partMode = SourceOption.SitePartMode.NO,
        sourceLinkRules = listOf("https://chan.sankakucomplex.com/post/show/{{id}}"),
        tagTypes = listOf("artist", "studio", "copyright", "character", "medium", "meta", "group", "general", "genre", "pose", "role", "anatomy", "fashion", "activity", "substance", "language", "flora", "setting", "automatic", "entity", "object", "fauna"),
        tagTypeMappings = mapOf(
            "artist" to TagAuthorType.ARTIST.name,
            "studio" to TagAuthorType.GROUP.name,
            "copyright" to TagTopicType.IP.name,
            "character" to TagTopicType.CHARACTER.name,
            "medium" to MetaType.TAG.name,
            "meta" to MetaType.TAG.name,
            "group" to MetaType.TAG.name,
            "general" to MetaType.TAG.name,
            "genre" to MetaType.TAG.name,
            "pose" to MetaType.TAG.name,
            "role" to MetaType.TAG.name,
            "anatomy" to MetaType.TAG.name,
            "fashion" to MetaType.TAG.name,
            "activity" to MetaType.TAG.name,
            "substance" to MetaType.TAG.name,
            "language" to MetaType.TAG.name,
            "flora" to MetaType.TAG.name,
            "setting" to MetaType.TAG.name,
            "automatic" to MetaType.TAG.name,
            "entity" to MetaType.TAG.name,
            "object" to MetaType.TAG.name,
            "fauna" to MetaType.TAG.name
        ),
        additionalInfo = listOf(
            SourceOption.AvailableAdditionalInfo("md5", "MD5"),
            SourceOption.AvailableAdditionalInfo("source", "来源")
        )
    ),
    SourceSiteRes(
        name = "fanbox", title = "FANBOX", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = listOf("https://www.fanbox.cc/@{{artist.name}}/posts/{{id}}"),
        tagTypes = listOf("artist", "tag"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "fantia", title = "Fantia", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE_WITH_NAME,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist", "tag"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "patreon", title = "Patreon", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist", "tag"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "konachan", title = "Konachan", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.NO,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "danbooru", title = "Danbooru", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.NO,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "gelbooru", title = "Gelbooru", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.NO,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "nijie", title = "Nijie", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "imhentai", title = "ImHentai", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.NUMBER, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "twitter", title = "X", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.STRING, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("user"),
        tagTypeMappings = mapOf("user" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
    SourceSiteRes(
        name = "gumroad", title = "Gumroad", isBuiltin = true,
        idMode = SourceOption.SiteIdMode.STRING, partMode = SourceOption.SitePartMode.PAGE,
        sourceLinkRules = emptyList(),
        tagTypes = listOf("artist", "tag"),
        tagTypeMappings = mapOf("artist" to TagAuthorType.ARTIST.name),
        additionalInfo = emptyList()
    ),
)