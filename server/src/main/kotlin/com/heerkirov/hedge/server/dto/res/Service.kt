package com.heerkirov.hedge.server.dto.res

data class StorageStatusRes(val storageDir: String,
                            val storageAccessible: Boolean,
                            val cacheDir: String,
                            val cacheSize: Long)