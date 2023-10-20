package com.heerkirov.hedge.server

import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.utils.ktorm.HedgeDialect
import com.heerkirov.hedge.server.utils.ktorm.first
import org.ktorm.database.Database
import org.ktorm.dsl.*
import org.ktorm.entity.count
import org.ktorm.entity.sequenceOf
import org.ktorm.schema.BaseTable
import org.ktorm.schema.int
import java.io.File
import java.nio.file.Files
import java.nio.file.attribute.BasicFileAttributes
import java.sql.Connection
import java.sql.DriverManager
import java.util.concurrent.Executors
import kotlin.concurrent.thread

fun test(channelPath: String) {
    val connection = DriverManager.getConnection("jdbc:sqlite:${channelPath}/${Filename.SERVER_DIR}/${Filename.DATA_SQLITE}")
    connection.prepareStatement("attach database ? as ?").use { stat ->
        stat.setString(1, "${channelPath}/${Filename.SERVER_DIR}/${Filename.SYSTEM_SQLITE}")
        stat.setString(2, "system_db")
        stat.execute()
    }
    val db = Database.connect(dialect = HedgeDialect()) {
        object : Connection by connection {
            override fun close() { /* do nothing */ }
        }
    }

    db.transaction {
        db.deleteAll(ModelA)
        db.deleteAll(ModelB)
    }

    val pool = Executors.newCachedThreadPool()

    val t1 = thread {
        for(i in 1..10000) {
            pool.submit {
                db.transaction {
                    val f = File("/home/heer/Archives/手册/XPS 15 9510 服务手册.pdf")
                    if(!f.exists()) throw RuntimeException()
                    Files.readAttributes(f.toPath(), BasicFileAttributes::class.java)

                    synchronized(ModelA) {
                        if(i % 100 == 0) {
                            println("A $i")
                        }
                    }
                    val id = db.insertAndGenerateKey(ModelA) {
                        set(it.seq, i)
                    } as Int


                    val verifyId = db.from(ModelA).select(max(ModelA.id).aliased("id")).first().getInt("id")
                    if(id != verifyId) {
                        println("A $i: verify failed. verifyId is $verifyId, id is $id.")
                    }

                    Thread.sleep(50)
                }
            }.get()
        }
    }

    val t2 = thread {
        for(i in 1..50) {
            Thread.sleep(1000)
            pool.submit {
                db.transaction {
                    println("B $i")

                    db.batchInsert(ModelB) {
                        for(j in i until (i * 10)) {
                            item {
                                set(it.seq, j)
                            }
                        }
                    }
                    db.sequenceOf(ModelA).count()
                }
            }.get()
        }
    }

    t1.join()
    t2.join()
    pool.shutdown()
}

private data class Model(val id: Int, val seq: Int)

private object ModelA : BaseTable<Model>("model_a") {
    val id = int("id").primaryKey()
    val seq = int("seq")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Model(
        id = row[id]!!,
        seq = row[seq]!!
    )
}

private object ModelB : BaseTable<Model>("model_b", schema = "system_db") {
    val id = int("id").primaryKey()
    val seq = int("seq")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = Model(
        id = row[id]!!,
        seq = row[seq]!!
    )
}