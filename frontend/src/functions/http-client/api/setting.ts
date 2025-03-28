import { UsefulColors } from "@/constants/ui"
import { HttpInstance, Response } from "../instance"
import { AlreadyExists, CascadeResourceExists, NotFound, InvalidRuleIndexError, ResourceNotExist, BuiltinNotWritableError } from "../exceptions"
import { AuthorType } from "./author"
import { TopicType } from "./topic"
import { TaskConfig } from "./find-similar"
import { MetaType } from "./all"

export function createSettingEndpoint(http: HttpInstance): SettingEndpoint {
    return {
        server: {
            get: http.createRequest("/api/setting/server"),
            update: http.createDataRequest("/api/setting/server", "PATCH")
        },
        storage: {
            get: http.createRequest("/api/setting/storage"),
            update: http.createDataRequest("/api/setting/storage", "PATCH")
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
                listBuiltins: http.createRequest("/api/setting/source/sites/builtins"),
                create: http.createDataRequest("/api/setting/source/sites", "POST"),
                get: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`),
                update: http.createPathDataRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "PUT"),
                delete: http.createPathRequest(name => `/api/setting/source/sites/${encodeURIComponent(name)}`, "DELETE"),
            }
        },
        findSimilar: {
            get: http.createRequest("/api/setting/find-similar"),
            update: http.createDataRequest("/api/setting/find-similar", "PATCH")
        }
    }
}

export interface SettingEndpoint {
    /**
     * 设置：后台服务本身相关的选项。
     */
    server: {
        /**
         * 查看。
         */
        get(): Promise<Response<ServerOption>>
        /**
         * 更改。
         */
        update(form: ServerOptionUpdateForm): Promise<Response<unknown>>
    }
    /**
     * 设置：存储相关选项。
     */
    storage: {
        /**
         * 查看。
         */
        get(): Promise<Response<StorageOption>>
        /**
         * 更改。
         */
        update(form: StorageOptionUpdateForm): Promise<Response<unknown>>
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
         * @exception INVALID_RULE_INDEX rules[]中part/partName/extras的group配置与site定义不匹配时报告此错误。
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
             * 查看内建列表。
             */
            listBuiltins(): Promise<Response<Site[]>>
            /**
             * 新增一个来源网站。
             * @exception ALREADY_EXISTS
             */
            create(form: SiteCreateForm): Promise<Response<null, AlreadyExists<"site", "name", string>>>
            /**
             * 查看单个项。
             * @exception NOT_FOUND 此项不存在。
             */
            get(name: string): Promise<Response<Site, NotFound>>
            /**
             * 更改项。
             * @exception NOT_FOUND 此项不存在。
             */
            update(name: string, form: SiteUpdateForm): Promise<Response<null, NotFound | BuiltinNotWritableError>>
            /**
             * 删除项。
             * @exception NOT_FOUND 此项不存在。
             * @exception CASCADE_RESOURCE_EXISTS("Illust"|"ImportImage"|"TrashedImage"|"SourceAnalyseRule", "site", string) 存在级联资源，无法删除。
             */
            delete(name: string): Promise<Response<null, NotFound | CascadeResourceExists<"Illust" | "ImportImage" | "TrashedImage" | "SourceAnalyseRule", "site", string>>>
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
         */
        update(form: FindSimilarOptionUpdateForm): Promise<Response<unknown>>
    }
    
}

export interface ServerOption {
    /**
     * 后台服务建议使用的端口。
     * null表示没有建议，由它自己选择端口。
     * 使用整数+逗号(,)+横线(-)表示建议的范围。
     * 这个参数没有强制检查，如果写错，则在检测时不生效。
     */
    port: string | null
    /**
     * 后台服务额外的固定Token。
     * 此Token与生成Token并行可用。使用此Token可在其他位置访问后台服务。
     */
    token: string | null
    /**
     * 在各处有关日期的判定中，每天的日期范围的推迟时间量。
     */
    timeOffsetHour: number | null
}

export type ServerOptionUpdateForm = Partial<ServerOption>

export interface StorageOption {
    /**
     * 文件存储使用的存储路径。
     * null表示使用基于userData的默认存储路径，并自行管理；其他值表示使用自定义路径，并需要自行确保路径可用。
     */
    storagePath: string | null
    /**
     * 自动清理已删除的项。
     */
    autoCleanTrashes: boolean
    /**
     * 自动清理已删除项的间隔天数。
     */
    autoCleanTrashesIntervalDay: number
    /**
     * 区块最大可储存的容量。
     */
    blockMaxSizeMB: number
    /**
     * 区块最大可储存的数量。
     */
    blockMaxCount: number
}

export type StorageOptionUpdateForm = Partial<StorageOption>

export interface MetaOption {
    /**
     * 对相关元数据做更改后自动清除对应的tagme标记。
     */
    autoCleanTagme: boolean
    /**
     * 以角色标签为主题核心。
     */
    onlyCharacterTopic: boolean
    /**
     * 根据推导得到的父标签解决子标签冲突。用于解决character多义映射的情况。这个选项会在“导入自动映射”和“根据来源标签批量设置标签”功能中生效。
     */
    resolveTagConflictByParent: boolean
    /**
     * 当创建新集合或向集合添加新项时，允许指定分区，将不在此分区的项聚集到此分区中。
     */
    centralizeCollection: boolean
    /**
     * 自动微调排序时间。
     */
    tuningOrderTime: boolean
    /**
     * 对orderTime的变更将会自动同步至partitionTime。
     */
    bindingPartitionWithOrderTime: boolean
    /**
     * topic根据type区分的颜色。
     */
    topicColors: {[key in TopicType]: UsefulColors}
    /**
     * author根据type区分的颜色。
     */
    authorColors: {[key in AuthorType]: UsefulColors}
}

export type MetaOptionUpdateForm = Partial<MetaOption>

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

export type QueryOptionUpdateForm = Partial<QueryOption>

export interface ImportOption {
    /**
     * 导入时，自动从文件分析source信息。
     */
    autoAnalyseSourceData: boolean
    /**
     * 阻止没有来源信息的项被导入。这有利于保证所有导入项都有来源。
     */
    preventNoneSourceData: boolean
    /**
     * 在文件导入时，根据已设置的来源和映射规则，自动映射并添加元数据标签。
     */
    autoReflectMetaTag: boolean
    /**
     * 启用哪些元数据标签类型的映射。
     */
    reflectMetaTagType: MetaType[]
    /**
     * 在文件导入时，自动对那些特定格式的、容量较大的图像进行格式转换，以在不损失质量的前提下减少其大小。
     */
    autoConvertFormat: boolean
    /**
     * PNG类型的自动转换阈值大小
     */
    autoConvertPNGThresholdSizeMB: number
    /**
     * 导入时，自动设定meta tag的tagme。
     */
    setTagmeOfTag: boolean
    /**
     * 导入时，使用哪种属性设置create time。
     */
    setOrderTimeBy: OrderTimeType
    /**
     * source分析的规则列表。
     */
    sourceAnalyseRules: SourceAnalyseRule[]
}

export type ImportOptionUpdateForm = Partial<ImportOption>

export interface FindSimilarOption {
    autoFindSimilar: boolean
    autoTaskConf: TaskConfig | null
    defaultTaskConf: TaskConfig
}

export type FindSimilarOptionUpdateForm = Partial<FindSimilarOption>

/**
 * 一条source解析规则。
 */
export interface SourceAnalyseRule {
    site: string
    regex: string
    idGroup: string
    partGroup: string | null
    partNameGroup: string | null
    extras: SourceAnalyseRuleExtra[] | null
}

export interface SourceAnalyseRuleExtra {
    group: string
    target: SourceAnalyseRuleExtraTarget
    optional: boolean
    tagType: string | null
    additionalInfoField: string | null
    translateUnderscoreToSpace: boolean
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
     * 是否是内建网站。
     */
    isBuiltin: boolean
    /**
     * 此网站的ID模式。
     */
    idMode: SiteIdMode
    /**
     * 此网站是否拥有分页。
     * @default NO
     */
    partMode: SitePartMode
    /**
     * 此网站可接受的元数据条目。
     */
    additionalInfo: {field: string, label: string}[]
    /**
     * 根据元数据id与附加信息，自动生成links的规则列表。
     */
    sourceLinkRules: string[]
    /**
     * 此站点可用的标签类型。
     */
    tagTypes: string[]
    /**
     * 此站点的标签类型向元数据类型的映射。
     */
    tagTypeMappings: Record<string, Exclude<TopicType, "UNKNOWN"> | Exclude<AuthorType, "UNKNOWN"> | "TAG">
}

export interface SiteCreateForm extends SiteUpdateForm {
    name: string
    idMode?: SiteIdMode
    partMode?: SitePartMode
}

export interface SiteUpdateForm {
    /**
     * 在列表中的排序顺序，从0开始。
     * @default 追加到末尾
     */
    ordinal?: number
    title?: string | null
    additionalInfo?: {field: string, label: string}[]
    sourceLinkRules?: string[]
    tagTypes?: string[]
    tagTypeMappings?: Site["tagTypeMappings"]
}

export type OrderTimeType = "IMPORT_TIME" | "CREATE_TIME" | "UPDATE_TIME"

export type SourceAnalyseRuleExtraTarget = "TITLE" | "DESCRIPTION" | "ADDITIONAL_INFO" | "TAG" | "BOOK" | "RELATION"

export type SiteIdMode = "NUMBER" | "STRING"

export type SitePartMode = "NO" | "PAGE" | "PAGE_WITH_NAME"