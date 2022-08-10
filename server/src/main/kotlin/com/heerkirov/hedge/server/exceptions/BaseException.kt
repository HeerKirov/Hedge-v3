package com.heerkirov.hedge.server.exceptions

/**
 * 所有业务型异常，都要抛出此类，并组合一个具体业务错误的实现类。
 * 业务型异常是指，在业务代码中明确抛出的、在抛出过程中不被处理，直到最后会被HTTP Server捕获的异常。
 * 因此那些不属于HTTP请求回调的异常不在此限制之列。
 */
class BusinessException(val exception: BaseException<*>): RuntimeException(exception.message)

/**
 * 业务型异常的顶层父类。
 *
 * 继承此类的首先是一批通用抽象类，分别实现不同的错误大类。
 * 随后，更多详尽的错误细分类在业务模块内独自声明，并继承错误大类。
 * 禁止在业务代码中随处编写新的错误种类。这不利于错误管理。
 *
 * @param status HTTP code状态码。
 * @param code 错误码，一般会详细到业务，方便前端快速判断错误类型。
 * @param message 供开发者阅读的、可视化的错误信息。前端一般不用，而是结合错误码和关键错误信息确定错误内容。
 * @param info 当抛出的错误有很详细的关键错误信息时，通过此字段输出结构化的错误描述。
 */
abstract class BaseException<INFO>(val status: Int, val code: String, val message: String, val info: INFO)

/**
 * 一个检查标记。异常被此接口标记，表示它是一个非必需异常。
 * 非必需异常的含义是，前端有能力通过自身已有的条件，完成对这种错误的检查。后端只不过是二重保障。(ex: 表单字段的格式、缺失情况)
 * 相对的是必需异常，它意味着这种错误前端是无法凭自己的条件完成检查，或者要检查就要付出显著更多的开销。(ex: 请求的资源是否存在，选择的资源是否存在)
 *
 * 非必需异常一般不会提供很多info信息，甚至不提供，因为前端不应该依赖这些信息完成错误提示;
 * 前端应该在自己的代码中完成对非必需检查的所有检查，并且不在HTTP请求中处理非必需异常;
 * 前端应该根据业务需要，可选或必须在HTTP请求中处理必需异常，它们一般意味着某种必须处理的业务逻辑分支。
 *
 * 所有意外抛出的异常都会作为内部服务器错误抛出。
 */
interface Unchecked

/**
 * 抛出一个业务异常。
 */
@Suppress("NOTHING_TO_INLINE")
inline fun be(e: BaseException<*>): BusinessException {
    return BusinessException(e)
}
