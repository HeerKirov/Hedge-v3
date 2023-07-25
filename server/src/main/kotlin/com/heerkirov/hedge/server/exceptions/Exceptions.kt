package com.heerkirov.hedge.server.exceptions

import com.heerkirov.hedge.server.utils.tuples.Tuple2
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.tuples.t2
import com.heerkirov.hedge.server.utils.tuples.t3

//== 基础错误类型 ==

/**
 * 输入存在错误。
 */
abstract class BadRequestException<INFO>(code: String, message: String, info: INFO) : BaseException<INFO>(400, code, message, info)

/**
 * 要求附带登录认证。
 */
abstract class UnauthorizedException<INFO>(code: String, message: String, info: INFO) : BaseException<INFO>(401, code, message, info)

/**
 * 当前登录认证的权限不足以访问。
 */
abstract class ForbiddenException<INFO>(code: String, message: String, info: INFO) : BaseException<INFO>(403, code, message, info)

/**
 * 找不到当前的主体资源。
 */
abstract class NotFoundException<INFO>(code: String, message: String, info: INFO) : BaseException<INFO>(404, code, message, info)

//== 在此基础上扩展的通用错误类型 ==

/**
 * 表单参数的类型错误。
 * info: string: 字段名
 */
open class ParamTypeError(paramName: String, reason: String) : BadRequestException<String>("PARAM_TYPE_ERROR", "Param '$paramName' $reason", paramName), Unchecked

/**
 * 表单参数的值错误。
 * info: string: 字段名
 */
open class ParamError(paramName: String) : BadRequestException<String>("PARAM_ERROR", "Param '$paramName' has incorrect value.", paramName), Unchecked

/**
 * 表单参数的值空缺，但是业务需要这个值。
 * info: string: 字段名
 */
open class ParamRequired(paramName: String) : BadRequestException<String>("PARAM_REQUIRED", "Param '$paramName' is required.", paramName), Unchecked

/**
 * 表单参数的值已填写，但业务不需要这个值。
 * info: string: 字段名
 */
open class ParamNotRequired(paramName: String) : BadRequestException<String>("PARAM_NOT_REQUIRED", "Param '$paramName' is not required.", paramName), Unchecked

/**
 * 表单参数选取的某种目标资源并不存在，因此业务无法进行。
 * info: (string, V[]): 字段名, 资源对象列表
 */
open class ResourceNotExist<V>(prop: String, value: V) : BadRequestException<Tuple2<String, V>>("NOT_EXIST", "Resource of $prop '$value' is not exist.", t2(prop, value))

/**
 * 表单参数选取的某种目标资源在当前业务中不适用，因此业务无法进行。
 * info: (string, V[]): 字段名, 资源对象列表
 */
open class ResourceNotSuitable<V>(prop: String, value: V) : BadRequestException<Tuple2<String, V>>("NOT_SUITABLE", "Resource of $prop 'value' is not suitable.", t2(prop, value))

/**
 * 表单参数选取的某种目标资源无法唯一确定，存在混淆的可能，因此业务无法进行。
 * info: (string, V, S): 字段名, 目标资源，实际字段列表
 */
open class ResourceNotUnique<V, S>(prop: String, value: V, results: Collection<S>) : BadRequestException<Tuple3<String, V, Collection<S>>>("NOT_UNIQUE", "Resource of $prop 'value' is not unique.", t3(prop, value, results))

/**
 * 表单的某种目标资源已经存在，因此业务无法进行。
 * info: (string, string, V[]): 资源名称, 资源字段名, 资源对象
 */
open class AlreadyExists<V> (resource: String, prop: String, value: V) : BadRequestException<Tuple3<String, String, V>>("ALREADY_EXISTS", "$resource with $prop '$value' is already exists.", t3(resource, prop, value))

/**
 * 当前资源存在某种级联的资源依赖，因此业务无法进行。
 * 多见于删除业务，且目标资源不允许被静默操作的情况，需要此错误提示，并搭配一个强制删除参数。
 * info: string: 资源名称
 */
open class CascadeResourceExists<V>(resource: String, prop: String, value: V) : BadRequestException<Tuple3<String, String, V>>("CASCADE_RESOURCE_EXISTS", "$resource depending on $prop '$value' exists.", t3(resource, prop, value))

/**
 * API的操作或一部分操作，因为某种原因拒绝执行。
 */
open class Reject(message: String): BadRequestException<Nothing?>("REJECT", message, null)

/**
 * 由于服务尚未初始化，API不能被调用。
 */
open class NotInit: BadRequestException<Nothing?>("NOT_INIT", "Server is not initialized.", null)

/**
 * 在headers中没有发现任何token，然而此API需要验证。或者token无法被正确解析。
 */
class NoToken : UnauthorizedException<Nothing?>("NO_TOKEN", "No available token.", null)

/**
 * 使用的token是错误的，无法将其与任何token认证匹配。
 */
class TokenWrong : UnauthorizedException<Nothing?>("TOKEN_WRONG", "Token is incorrect.", null)

/**
 * 使用的password是错误的。
 */
class PasswordWrong : UnauthorizedException<Nothing?>("PASSWORD_WRONG", "Password is incorrect.", null)

/**
 * 此API只能在客户端调用。
 */
class OnlyForClient : ForbiddenException<Nothing?>("ONLY_FOR_CLIENT", "This API can only be called from client.", null)

/**
 * 此token只能由localhost使用。
 */
class RemoteDisabled : ForbiddenException<Nothing?>("REMOTE_DISABLED", "This Token can only be used in localhost.", null)

/**
 * 当前主体资源未找到。
 */
class NotFound(resourceName: String? = null) : NotFoundException<Nothing?>("NOT_FOUND", "${resourceName ?: "Resource"} not found.", null)
