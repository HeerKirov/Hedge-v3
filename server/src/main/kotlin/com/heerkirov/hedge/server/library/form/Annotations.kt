package com.heerkirov.hedge.server.library.form

private const val DEFAULT_LIMIT = 500
private const val DEFAULT_OFFSET = 0

/**
 * Filter Form构造参数注解：在此参数注入limit。
 * limit参数必定为Int类型，不填时总是取默认值，且几乎忽略所有报错。
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Limit(val default: Int = DEFAULT_LIMIT)

/**
 * Filter Form构造参数注解：在此参数注入offset。
 * offset参数必定为Int类型，不填时总是取默认值，且几乎忽略所有报错。
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Offset(val default: Int = DEFAULT_OFFSET)

/**
 * Filter Form构造参数注解：在此参数注入search。
 * search参数必定为String?，且不填时总是取默认值为null。
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Search

/**
 * Filter Form构造参数注解：在此参数注入order。
 * order参数必定为List<OrderItem>。
 * 可以指定选项列表以限制可选值。
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Order(val value: String = "order",
                       val options: Array<String> = [],
                       val delimiter: Char = ',')

/**
 * Valid注解：此String字段必须非空
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class NotBlank

/**
 * Valid注解：此String字段不可超出最大长度
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Length(val value: Int)

/**
 * Valid注解：此Number字段值必须位于指定范围内
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Range(val min: Int, val max: Int)

/**
 * Valid注解：此Number字段值必须不小于指定值
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.VALUE_PARAMETER)
annotation class Min(val value: Int)
