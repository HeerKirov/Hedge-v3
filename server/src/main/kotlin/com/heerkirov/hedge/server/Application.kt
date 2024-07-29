package com.heerkirov.hedge.server

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.application.runApplication
import com.heerkirov.hedge.server.utils.tools.Parameters

fun main(args: Array<String>) {
    val parameters = Parameters(args)

    runApplication(ApplicationOptions(parameters))
}