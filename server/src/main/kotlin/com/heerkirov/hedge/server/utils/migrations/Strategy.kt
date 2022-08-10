package com.heerkirov.hedge.server.utils.migrations

import java.util.*

/**
 * 实现此类，以实现一类文件的同步升级策略。
 * @param IN 输入此策略时的原始数据类型
 * @param MID 在此策略中参与升级时的中间数据类型
 * @param OUT 策略执行完成后的输出数据类型
 */
interface Strategy<IN, MID, OUT> {
    /**
     * 注册每一个版本的升级策略。
     */
    fun migrations(register: MigrationRegister<MID>)

    /**
     * 当不需要升级时，将原始数据转换为最终数据。
     */
    fun translateSourceToOutputType(source: IN): OUT

    /**
     * 当需要升级时，将原始数据转换为中间类型，方便操作。
     */
    fun translateSourceToTempType(source: IN): MID

    /**
     * 升级结束后，将中间类型转换为最终数据。
     */
    fun translateTempToOutputType(temp: MID): OUT
}

/**
 * 一项扩展策略。传入source进行判断，如果满足条件，则直接创建最终数据，不经过中间同步。通常用于初始化。
 */
interface CreateFinalDataStrategy<IN, MID, OUT> : Strategy<IN, MID, OUT> {
    fun createFinalData(source: IN): Optional<OUT>
}

/**
 * 升级策略注册器。
 */
class MigrationRegister<MID> {
    private val migrations: TreeMap<Version, (data: MID) -> MID> = TreeMap()

    fun map(version: String, action: (data: MID) -> MID): MigrationRegister<MID> {
        migrations[versionOf(version)] = action
        return this
    }

    fun flat(version: String, action: (data: MID) -> Unit): MigrationRegister<MID> {
        return map(version) {
            action(it)
            it
        }
    }

    fun empty(version: String): MigrationRegister<MID> {
        return map(version) { it }
    }

    fun build(): List<Pair<Version, (data: MID) -> MID>> {
        return migrations.asSequence().map { Pair(it.key, it.value) }.toList()
    }
}