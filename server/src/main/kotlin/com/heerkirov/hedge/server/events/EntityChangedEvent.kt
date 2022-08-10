package com.heerkirov.hedge.server.events

/**
 * 实体发生变更的事件。
 * 实体变更是指server中的entity发生新增、删除、属性变化、从属关系变化。当这些事情发生时，有通知前端以及部分响应组件的必要。
 */
class EntityChangedEvent(override val timestamp: Long) : BaseBusEvent {

}