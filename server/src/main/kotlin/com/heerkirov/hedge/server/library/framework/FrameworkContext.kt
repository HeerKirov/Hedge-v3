package com.heerkirov.hedge.server.library.framework

import kotlin.reflect.KClass

interface FrameworkContext {
    fun <T : Component> getComponent(target: KClass<T>): T

    fun getComponents(): List<Component>

    fun getExceptions(): List<Exception>
}
