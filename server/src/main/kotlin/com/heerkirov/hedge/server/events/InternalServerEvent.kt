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
 * 文件已被标记为删除，等待被归档。
 */
data class FileMarkDeleted(val fileId: Int, val block: String) : BaseBusEventImpl("internal/file/mark-deleted"), InternalServerEvent

/**
 * 文件已确实创建，等待后台处理。
 */
data class FileMarkCreated(val fileId: Int) : BaseBusEventImpl("internal/file/mark-created"), InternalServerEvent