package com.heerkirov.hedge.server.events

/**
 * 服务器内部事件事件。
 * 这类事件通常用于服务器内部事务通知，不会被WS发送到外部。
 */
interface InternalServerEvent : BaseBusEvent

/**
 * 文件block已进入归档模式，等待被归档。
 */
data class FileBlockArchived(val block: String) : BaseBusEventImpl("internal/file/block-archived"), InternalServerEvent

/**
 * 文件已确实创建，等待后台处理，生成其缩略图和指纹。
 */
data class FileCreated(val fileId: Int) : BaseBusEventImpl("internal/file/created"), InternalServerEvent

/**
 * 文件已处理完成，其缩略图与指纹已生成完毕，等待下一步的操作。
 */
data class FileReady(val fileId: Int) : BaseBusEventImpl("internal/file/ready"), InternalServerEvent

/**
 * 文件处理过程产生错误。附带了错误信息。
 * @param type 可选值为"THUMBNAIL", "FINGERPRINT"
 */
data class FileProcessError(val fileId: Int, val type: String, val message: String) : BaseBusEventImpl("internal/file/process-error"), InternalServerEvent