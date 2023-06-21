import { UsefulColors } from "@/constants/ui"
import { HttpInstance, Response } from "../instance"
import { AlreadyExists, CascadeResourceExists, NotFound, InvalidRuleIndexError, ResourceNotExist } from "../exceptions"
import { AuthorType } from "./author"
import { TopicType } from "./topic"
import { TaskConfig } from "./find-similar"

export function createSettingEndpoint(http: HttpInstance): SettingEndpoint {
    return {
        service: {
            get: http.createRequest("/api/setting/service"),
            update: http.createDataRequest("/api/setting/service", "PATCH")
        },
        meta: {
            get: http.createRequest("/api/setting/meta"),
            update: http.createDataRequest("/api/setting/meta", "PATCH")
        },
        query: {
            get: http.createRequest("/api/setting/query"),
            update: http.createDataRequest("/api/setting/query", "PATCH")
        },
        import: {
            get: http.createRequest("/api/setting/import"),
            update: http.createDataRequest("/api/setting/import", "PATCH")
        },
        source: {
            site: {
                list: http.createRequest("/api/setting/source/sites"),
                create: http.createDataRequest("/api/setting/source/sites", "POST"),
                get: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`),
                update: http.createPathDataRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "PUT"),
                delete: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "DELETE"),
            }
        },
        findSimilar: {
            get: http.createRequest("/api/setting/find-similar"),
            update: http.createDataRequest("/api/setting/find-similar", "PATCH")
        },
        file: {
            get: http.createRequest("/api/setting/file"),
            update: http.createDataRequest("/api/setting/file", "PATCH")
        }
    }
}

export interface SettingEndpoint {
    /**
     * 设置：后台服务本身相关的选项。
     */
    service: {
        /**
         * 查看。
         */
        get(): Promise<Response<ServiceOption>>
        /**
         * 更改。
         */
        update(form: ServiceOptionUpdateForm): Promise<Response<unknown>>
    }
    /**
     * 设置：基本元数据相关的选项。
     */
    meta: {
        /**
         * 查看。
         */
        get(): Promise<Response<MetaOption>>
        /**
         * 更改。
         */
        update(form: MetaOptionUpdateForm): Promise<Response<unknown>>
    }
    /**
     * 设置：查询相关的选项。
     */
    query: {
        /**
         * 查看。
         */
        get(): Promise<Response<QueryOption>>
        /**
         * 更改。
         */
        update(form: QueryOptionUpdateForm): Promise<Response<unknown>>
    }
    /**
     * 设置：导入相关选项。
     */
    import: {
        /**
         * 查看。
         */
        get(): Promise<Response<ImportOption>>
        /**
         * 更改。
         * @exception NOT_EXIST("site", siteName) rules[].site不在sites列表中存在时报告此错误。
         * @exception INVALID_RULE_INDEX rules[].secondaryIdIndex与对应的site的hasSecondaryId配置不匹配时报告此错误。
         */
        update(form: ImportOptionUpdateForm): Promise<Response<unknown, ResourceNotExist<"site", string> | InvalidRuleIndexError>>
    }
    /**
     * 设置：来源数据相关的选项。
     */
    source: {
        /**
         * 来源网站列表。
         */
        site: {
            /**
             * 查看列表。
             */
            list(): Promise<Response<Site[]>>
            /**
             * 新增一个来源网站。
             * @exception ALREADY_EXISTS
             */
            create(form: SiteCreateForm): Promise<Response<unknown, AlreadyExists<"site", "name", string>>>
            /**
             * 查看单个项。
             * @exception NOT_FOUND 此项不存在。
             */
            get(name: string): Promise<Response<Site, NotFound>>
            /**
             * 更改项。
             * @exception NOT_FOUND 此项不存在。
             */
            update(name: string, form: SiteUpdateForm): Promise<Response<unknown>>
            /**
             * 删除项。
             * @exception NOT_FOUND 此项不存在。
             * @exception CASCADE_RESOURCE_EXISTS("Illust"|"ImportImage"|"TrashedImage"|"SourceAnalyseRule") 存在级联资源，无法删除。
             */
            delete(name: string): Promise<Response<unknown, CascadeResourceExists<"Illust" | "ImportImage" | "TrashedImage" | "SourceAnalyseRule">>>
        }
    }
    /**
     * 设置：相关项查找相关选项。
     */
    findSimilar: {
        /**
         * 查看。
         */
        get(): Promise<Response<FindSimilarOption>>
        /**
         * 更改。
         * @exception NOT_EXIST("site", siteName) rules[].site不在sites列表中存在时报告此错误。
         * @exception INVALID_RULE_INDEX rules[].secondaryIdIndex与对应的site的hasSecondaryId配置不匹配时报告此错误。
         */
        update(form: FindSimilarOptionUpdateForm): Promise<Response<unknown>>
    }
    /**
     * 设置：档案管理相关选项。
     */
    file: {
        /**
         * 查看。
         */
        get(): Promise<Response<FileOption>>
        /**
         * 更改。
         */
        update(form: FileOptionUpdateForm): Promise<Response<unknown>>
    }
}

export interface ServiceOption {
    /**
     * 后台服务建议使用的端口。
     * null表示没有建议，由它自己选择端口。
     * 使用整数+逗号(,)+横线(-)表示建议的范围。
     * 这个参数没有强制检查，如果写错，则在检测时不生效。
     */
    port: string | null
    /**
     * 文件存储使用的存储路径。
     * null表示使用基于userData的默认存储路径，并自行管理；其他值表示使用自定义路径，并需要自行确保路径可用。
     */
    storagePath: string | null
}

export interface ServiceOptionUpdateForm {
    port?: string | null
    storagePath?: string | null
}

export interface MetaOption {
    /**
     * score的描述。descriptions[i]代表了score = i + 1的描述
     */
    scoreDescriptions: {word: string, content: string}[]
    /**
     * 对相关元数据做更改后自动清除对应的tagme标记。
     */
    autoCleanTagme: boolean
    /**
     * topic根据type区分的颜色。
     */
    topicColors: {[key in TopicType]: UsefulColors}
    /**
     * author根据type区分的颜色。
     */
    authorColors: {[key in AuthorType]: UsefulColors}
}

export interface MetaOptionUpdateForm {
    scoreDescriptions?: {word: string, content: string}[]
    autoCleanTagme?: boolean
}

export interface QueryOption {
    /**
     * 识别中文字符。
     */
    chineseSymbolReflect: boolean
    /**
     * 将有限字符串中的下划线转义为空格。
     */
    translateUnderscoreToSpace: boolean
    /**
     * 查询元数据库中的标签项时，每一次查询的数量上限。
     * @min 1
     */
    queryLimitOfQueryItems: number
    /**
     * 每一个项中的元素总数的警告阈值。
     * @min 2
     */
    warningLimitOfUnionItems: number
    /**
     * 总项数的警告阈值。
     * @min 2
     */
    warningLimitOfIntersectItems: number
}

export interface QueryOptionUpdateForm {
    chineseSymbolReflect?: boolean
    translateUnderscoreToSpace?: boolean
    queryLimitOfQueryItems?: number
    warningLimitOfUnionItems?: number
    warningLimitOfIntersectItems?: number
}

export interface ImportOption {
    /**
     * 导入时，自动从文件分析source信息。
     */
    autoAnalyseSourceData: boolean
    /**
     * 导入时，自动设定meta tag的tagme。
     */
    setTagmeOfTag: boolean
    /**
     * 导入时，根据情况自动设定source的tagme。
     */
    setTagmeOfSource: boolean
    /**
     * 导入时，使用哪种属性设置create time。
     */
    setOrderTimeBy: OrderTimeType
    /**
     * 分区的延后时间，单位毫秒。null等同0。
     * @range [-86400000, 86400000]
     */
    setPartitionTimeDelay: number | null
    /**
     * source分析的规则列表。
     */
    sourceAnalyseRules: SourceAnalyseRule[]
    /**
     * 监听目录导入功能所存储的默认目录列表。
     */
    watchPaths: string[]
    /**
     * 程序启动时，自动开启监听目录功能。
     */
    autoWatchPath: boolean
    /**
     * 监听目录功能将移动所监听到的文件。
     */
    watchPathMoveFile: boolean
    /**
     * 监听目录功能会在开启时首先扫描一遍目录内已有的文件。
     * 一般来说建议开启此功能时也开启移动文件功能。
     */
    watchPathInitialize: boolean
}

export interface ImportOptionUpdateForm {
    autoAnalyseMeta?: boolean
    setTagmeOfTag?: boolean
    setTagmeOfSource?: boolean
    setTimeBy?: OrderTimeType
    setPartitionTimeDelay?: number | null
    sourceAnalyseRules?: SourceAnalyseRule[]
    watchPaths?: string[]
    autoWatchPath?: boolean
    watchPathMoveFile?: boolean
    watchPathInitialize?: boolean
}

/**
 * 用来设定order time的时间属性。
 */
export type OrderTimeType = "IMPORT_TIME" | "CREATE_TIME" | "UPDATE_TIME"

/**
 * 一条source解析规则。
 */
export interface SourceAnalyseRule {
    site: string
    regex: string
    idIndex: number
    secondaryIdIndex: number | null
}

export interface Site {
    /**
     * 网站的识别名称。
     */
    name: string
    /**
     * 网站的显示名称。
     */
    title: string
    /**
     * 此网站是否拥有secondary id。
     * @default false
     */
    hasSecondaryId: boolean
}

export interface SiteCreateForm {
    name: string
    title: string
    hasSecondaryId?: boolean
    /**
     * 在列表中的排序顺序，从0开始。
     * @default 追加到末尾
     */
    ordinal?: number
}

export interface SiteUpdateForm {
    title?: string
    ordinal?: number
}

export interface FindSimilarOption {
    autoFindSimilar: boolean
    autoTaskConf: TaskConfig | null
    defaultTaskConf: TaskConfig
}

export type FindSimilarOptionUpdateForm = Partial<FindSimilarOption>

export interface FileOption {
    autoCleanTrashes: boolean
    autoCleanTrashesIntervalDay: number
}

export type FileOptionUpdateForm = Partial<FileOption>