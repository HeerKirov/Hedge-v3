plugins {
    application
    kotlin("jvm").version("1.9.0")
    id("com.github.johnrengelman.shadow").version("4.0.3")
    id("org.beryx.jlink").version("2.26.0")
}

group = "com.heerkirov.hedge"
version = "0.1.3"

dependencies {
    val kotlinVersion = "1.9.0"
    val javalinVersion = "5.6.2"
    val ktormVersion = "3.6.0"
    val sqliteVersion = "3.42.0.0"
    val jacksonVersion = "2.15.2"
    val javeVersion = "3.3.1"
    val slf4jVersion = "2.0.7"
    val junitVersion = "4.13.2"
    val javePlatform = when(System.getProperty("os.name").toLowerCase()) {
        "mac" -> "nativebin-osx64"
        "linux" -> "nativebin-linux64"
        "win" -> "nativebin-win64"
        else -> "all-deps"
    }

    implementation(group = "org.jetbrains.kotlin", name = "kotlin-stdlib-jdk8", version = kotlinVersion)
    implementation(group = "org.jetbrains.kotlin", name = "kotlin-reflect", version = kotlinVersion)
    implementation(group = "com.fasterxml.jackson.core", name = "jackson-core", version = jacksonVersion)
    implementation(group = "com.fasterxml.jackson.core", name = "jackson-databind", version = jacksonVersion)
    implementation(group = "com.fasterxml.jackson.module", name = "jackson-module-kotlin", version = jacksonVersion)
    implementation(group = "com.fasterxml.jackson.datatype", name = "jackson-datatype-jsr310", version = jacksonVersion)
    implementation(group = "org.xerial", name = "sqlite-jdbc", version = sqliteVersion)
    implementation(group = "org.ktorm", name = "ktorm-core", version = ktormVersion)
    implementation(group = "org.ktorm", name = "ktorm-support-sqlite", version = ktormVersion)
    implementation(group = "io.javalin", name = "javalin", version = javalinVersion)
    implementation(group = "ws.schild", name = "jave-core", version = javeVersion)
    implementation(group = "ws.schild", name = "jave-$javePlatform", version = javeVersion)
    implementation(group = "org.slf4j", name = "slf4j-simple", version = slf4jVersion)
    implementation(group = "org.slf4j", name = "slf4j-api", version = slf4jVersion)
    testImplementation(group = "org.jetbrains.kotlin", name = "kotlin-test-junit", version = kotlinVersion)
    testImplementation(group = "junit", name = "junit", version = junitVersion)
}

val javaVersion = "17"
val projectMainModule = "com.heerkirov.hedge.server"
val projectMainClass = "com.heerkirov.hedge.server.ApplicationKt"
val projectBinaryName = "hedge-v3-server"

application {
    @Suppress("DEPRECATION")
    mainClassName = "${projectMainModule}/${projectMainClass}"
    mainClass.set(projectMainClass)
    mainModule.set(projectMainModule)
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
    mavenLocal()
}

sourceSets {
    //使开发模式下的gradle能正确处理资源文件的位置，防止读取不到
    main.configure {
        output.setResourcesDir(java.classesDirectory)
    }
}

tasks {
    compileJava {
        doFirst {
            options.compilerArgs = listOf("--module-path", classpath.asPath)
        }
    }
    compileKotlin {
        kotlinOptions.jvmTarget = javaVersion
        destinationDirectory.set(compileJava.get().destinationDirectory)
    }
    compileTestKotlin {
        kotlinOptions.jvmTarget = javaVersion
    }

    shadowJar {
        manifestContentCharset = "utf-8"
        setMetadataCharset("utf-8")
        manifest {
            attributes(mapOf("Main-Class" to projectMainClass))
        }
    }
}

jlink {
    options.set(listOf("--strip-debug", "--compress", "1", "--no-header-files", "--no-man-pages"))
    launcher {
        name = projectBinaryName
    }
    mergedModule {
        additive = true
        /* 存在一个jlink插件auto merge non-module代码时的问题。
         * 新的java版本采用uses在module中声明服务发现的implement。对于non-module的代码，jlink插件会自动把它们打包成一个merged-module。
         * 但是，kotlin-reflect内有一些ServiceLoader的uses没有被自动分析进merged module里，因此造成了一个module * does not declare `uses`的异常。
         * tips: 在additive=true时，不必携带全部DSL，jlink命令的:createMergedModule阶段仍会报warn，但不会影响构建。
         */
        uses("kotlin.reflect.jvm.internal.impl.resolve.ExternalOverridabilityCondition")
        uses("kotlin.reflect.jvm.internal.impl.util.ModuleVisibilityHelper")
        uses("kotlin.reflect.jvm.internal.impl.builtins.BuiltInsLoader")
        /* 如果去掉这一条，则会在调用jave模块时报告一个错误：
         * java.lang.ExceptionInInitializerError: Exception java.lang.IllegalAccessError:
         * class ws.schild.jave.MultimediaObject (in module com.heerkirov.hedge.merged.module)
         * cannot access class org.slf4j.LoggerFactory (in module org.slf4j)
         * because module com.heerkirov.hedge.merged.module does not read module org.slf4j
         * 错误原因是jave模块包含在merged模块内无法访问slf4j模块。
         * 解决方案来自 https://github.com/beryx/badass-jlink-plugin/issues/127
         */
        requires("org.slf4j")
    }
    /* 如果去掉这一条，则会在启动时报告错误：
     * java.lang.LayerInstantiationException: Package kotlin in both module kotlin.stdlib and module com.heerkirov.hedge.merged.module
     * 解决方案来自 https://stackoverflow.com/questions/74453018/jlink-package-kotlin-in-both-merged-module-and-kotlin-stdlib
     */
    forceMerge("kotlin")
}

task("printVersion") {
    doLast {
        println(project.version)
    }
}