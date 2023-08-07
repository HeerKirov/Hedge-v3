package com.heerkirov.hedge.server.utils.tuples

interface Tuple {
    override fun toString(): String
    fun toArray(): Array<Any?>
    val length: Int
}

data class Tuple2<T1, T2>(val f1: T1, val f2: T2) : Tuple {
    override fun toString() = "($f1, $f2)"
    override fun toArray() = arrayOf(f1, f2)
    override val length get() = 2
}

data class Tuple3<T1, T2, T3>(val f1: T1, val f2: T2, val f3: T3) : Tuple {
    override fun toString() = "($f1, $f2, $f3)"
    override fun toArray() = arrayOf(f1, f2, f3)
    override val length get() = 3
}

data class Tuple4<T1, T2, T3, T4>(val f1: T1, val f2: T2, val f3: T3, val f4: T4) : Tuple {
    override fun toString() = "($f1, $f2, $f3, $f4)"
    override fun toArray() = arrayOf(f1, f2, f3, f4)
    override val length get() = 4
}

data class Tuple5<T1, T2, T3, T4, T5>(val f1: T1, val f2: T2, val f3: T3, val f4: T4, val f5: T5) : Tuple {
    override fun toString() = "($f1, $f2, $f3, $f4, $f5)"
    override fun toArray() = arrayOf(f1, f2, f3, f4, f5)
    override val length get() = 5
}

data class Tuple6<T1, T2, T3, T4, T5, T6>(val f1: T1, val f2: T2, val f3: T3, val f4: T4, val f5: T5, val f6: T6) : Tuple {
    override fun toString() = "($f1, $f2, $f3, $f4, $f5, $f6)"
    override fun toArray() = arrayOf(f1, f2, f3, f4, f5, f6)
    override val length get() = 6
}

@Suppress("NOTHING_TO_INLINE")
inline fun <T1, T2> t2(f1: T1, f2: T2) = Tuple2(f1, f2)

@Suppress("NOTHING_TO_INLINE")
inline fun <T1, T2, T3> t3(f1: T1, f2: T2, f3: T3) = Tuple3(f1, f2, f3)

@Suppress("NOTHING_TO_INLINE")
inline fun <T1, T2, T3, T4> t4(f1: T1, f2: T2, f3: T3, f4: T4) = Tuple4(f1, f2, f3, f4)

@Suppress("NOTHING_TO_INLINE")
inline fun <T1, T2, T3, T4, T5> t5(f1: T1, f2: T2, f3: T3, f4: T4, f5: T5) = Tuple5(f1, f2, f3, f4, f5)

@Suppress("NOTHING_TO_INLINE")
inline fun <T1, T2, T3, T4, T5, T6> t6(f1: T1, f2: T2, f3: T3, f4: T4, f5: T5, f6: T6) = Tuple6(f1, f2, f3, f4, f5, f6)