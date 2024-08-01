import { UsefulColors } from "@/constants/ui"

/*
 * 异常机制阐述：
 * 每个API都存在返回异常状态的可能性。因此在response中，首先根据返回状态，将response区分为ok, BusinessError, ConnectionError三类。
 * ConnectionError通常在http client中直接抛出。接下来分类BusinessError。它分为以下几类：
 * - UncheckedException: 虽然会抛出，但不应该处理，应该在表单检查中提前发现错误。这类错误忽略不提。
 * - CheckedException: 需要前端处理的异常。这些异常需要加上类型实现写明在API声明的response中。
 * - CommonException: 包括daemon exception和internal error。虽然绝大多数API都有可能抛，但应该在最开始拦截统一处理。
 */

export type AllException =
    DaemonException |
    UncheckedException |
    CheckedException |
    InternalError |
    UnknownError

export type BasicException = BaseException<number, string, unknown>

export interface BaseException<S extends number, C extends string, I> {
    status: S
    code: C
    message: string
    info: I
}

type BadRequestException<C extends string, I> = BaseException<400, C, I>

type UnauthorizedException<C extends string, I> = BaseException<401, C, I>

type ForbiddenException<C extends string, I> = BaseException<403, C, I>

type NotFoundException<C extends string, I> = BaseException<404, C, I>

type InternalError = BaseException<500, "INTERNAL_ERROR", null>

type UnknownError = BaseException<number, "UNKNOWN_ERROR", null>

type DaemonException =
    NotInit |
    NoToken |
    TokenWrong |
    OnlyForLocal

type UncheckedException =
    ParamTypeError |
    ParamError |
    ParamRequired |
    ParamNotRequired

type CheckedException =
    NotFound |
    Reject |
    PasswordWrong |
    ResourceNotExist<string, unknown> |
    ResourceNotSuitable<string, unknown> |
    ResourceNotUnique<string, unknown, unknown> |
    AlreadyExists<string, string, unknown> |
    CascadeResourceExists<string, string, unknown> |
    FileNotFoundError |
    FileNotReadyError |
    LocationNotAccessibleError |
    IllegalFileExtensionError |
    StorageNotAccessibleError |
    ContentParseError |
    RecursiveParentError |
    CannotGiveColorError |
    IllegalConstraintError<string, string, unknown> |
    ConflictingGroupMembersError |
    InvalidRegexError |
    InvalidRuleIndexError

//== 背景异常：不属于详细业务异常，应该统一处理 ==

type NotInit = BadRequestException<"NOT_INIT", null>
type NoToken = UnauthorizedException<"NO_TOKEN", null>
type TokenWrong = UnauthorizedException<"TOKEN_WRONG", null>
type OnlyForLocal = ForbiddenException<"ONLY_FOR_LOCAL", null>

//== 普通非必须异常：因为业务原因抛出的通用异常。这些异常是能通过先前检查避免的 ==

export type ParamTypeError = BadRequestException<"PARAM_TYPE_ERROR", string>
export type ParamError = BadRequestException<"PARAM_ERROR", string>
export type ParamRequired = BadRequestException<"PARAM_REQUIRED", string>
export type ParamNotRequired = BadRequestException<"PARAM_NOT_REQUIRED", string>

//== 普通异常：因为业务原因抛出的通用异常 ==

export type PasswordWrong = UnauthorizedException<"PASSWORD_WRONG", null>
export type NotFound = NotFoundException<"NOT_FOUND", null>
export type Reject = BadRequestException<"REJECT", null>
export type ResourceNotExist<P extends string, V> = BadRequestException<"NOT_EXIST", [P, V]>
export type ResourceNotSuitable<P extends string, V> = BadRequestException<"NOT_SUITABLE", [P, V]>
export type ResourceNotUnique<P extends string, V, S> = BadRequestException<"NOT_UNIQUE", [P, V, S[]]>
export type AlreadyExists<R extends string, P extends string, V> = BadRequestException<"ALREADY_EXISTS", [R, P, V]>
export type CascadeResourceExists<R extends string, P extends string, V> = BadRequestException<"CASCADE_RESOURCE_EXISTS", [R, P, V]>

//== 扩展异常：因为业务原因抛出的非通用异常，这些异常用在特定的API中描述具体的事项 ==

export type FileNotFoundError = BadRequestException<"FILE_NOT_FOUND", null>
export type FileNotReadyError = BadRequestException<"FILE_NOT_READY", null>
export type LocationNotAccessibleError = BadRequestException<"LOCATION_NOT_ACCESSIBLE", null>
export type IllegalFileExtensionError = BadRequestException<"ILLEGAL_FILE_EXTENSION", string>
export type StorageNotAccessibleError = BadRequestException<"STORAGE_NOT_ACCESSIBLE", null>
export type ContentParseError = BadRequestException<"CONTENT_PARSE_ERROR", string>
export type RecursiveParentError = BadRequestException<"RECURSIVE_PARENT", null>
export type CannotGiveColorError = BadRequestException<"CANNOT_GIVE_COLOR", null>
export type IllegalConstraintError<P extends string, R extends string, V> = BadRequestException<"ILLEGAL_CONSTRAINT", [P, R, V[]]>
export type ConflictingGroupMembersError = BadRequestException<"CONFLICTING_GROUP_MEMBERS", ConflictingMembers[]>
export type InvalidRegexError = BadRequestException<"INVALID_REGEX", string>
export type InvalidRuleIndexError = BadRequestException<"INVALID_RULE_INDEX", [string, string, string]>

interface ConflictingMembers { group: Member, force: boolean, members: Member[] }
interface Member { id: number, name: string, color: UsefulColors | null, isExported: boolean }

