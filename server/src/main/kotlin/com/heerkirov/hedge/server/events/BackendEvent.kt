package com.heerkirov.hedge.server.events

import com.heerkirov.hedge.server.components.backend.watcher.PathWatcherError

/**
 * 后台服务事件，指后台服务执行过程中的通知。
 * 后台服务优势也会有执行过程中的状态变更，这类变更也可能影响到对前台的状态显示。
 */
interface BackendEvent : BaseBusEvent

data class PathWatcherStatusChanged(val isOpen: Boolean, val statisticCount: Int, val errors: List<PathWatcherError>) : BaseBusEventImpl("backend/path-watcher/status-changed"), BackendEvent

data class SimilarFinderResultAdded(val count: Int) : BaseBusEventImpl("backend/similar-finder/result-added"), BackendEvent