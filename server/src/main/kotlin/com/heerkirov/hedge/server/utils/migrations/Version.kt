package com.heerkirov.hedge.server.utils.migrations

import java.util.*

class Version(private val x: Int, private val y: Int, private val z: Int, private val attach: Int = 0) : Comparable<Version> {
    override fun compareTo(other: Version): Int {
        return when {
            x != other.x -> x.compareTo(other.x)
            y != other.y -> y.compareTo(other.y)
            z != other.z -> z.compareTo(other.z)
            else -> attach.compareTo(other.attach)
        }
    }

    override fun toString() = "$x.$y.$z" + if(attach > 0) ".$attach" else ""

    override fun equals(other: Any?) = other === this || other is Version && other.x == x && other.y == y && other.z == z && other.attach == attach

    override fun hashCode() = Objects.hash(x, y, z, attach)
}

fun versionOf(v: String): Version {
    val split = v.split(".").map { it.toInt() }
    return Version(
        if(split.isNotEmpty()) split[0] else 0,
        if(split.size > 1) split[1] else 0,
        if(split.size > 2) split[2] else 0,
        if(split.size > 3) split[3] else 0
    )
}