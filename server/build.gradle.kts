plugins {
    application
    kotlin("jvm").version("2.2.20")
    id("org.beryx.jlink").version("3.0.1")
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

group = "com.heerkirov.hedge"
version = "0.16.0"

var targetPlatform: String? = project.findProperty("targetPlatform")?.toString()

dependencies {
    val kotlinVersion = "2.2.20"
    val javalinVersion = "6.7.0"
    val ktormVersion = "4.1.1"
    val sqliteVersion = "3.50.3.0"
    val dbcpVersion = "2.13.0"
    val jacksonVersion = "2.20.0"
    val thumbnailatorVersion = "0.4.20"
    val twelvemonkeysVersion = "3.12.0"
    val javeVersion = "3.5.0"
    val pinyin4jVersion = "2.5.1"
    val logbackVersion = "1.5.19"
    val junitVersion = "5.14.0"
    val javePlatform = if(targetPlatform != null) {
        when(targetPlatform) {
            "mac" -> "nativebin-osx64"
            "mac-arm64" -> "nativebin-osxm1"
            "linux", "linux64" -> "nativebin-linux64"
            "linux-arm64" -> "nativebin-linux-arm64"
            "win", "win64" -> "nativebin-win64"
            "all" -> "all-deps"
            else -> throw GradleException("Unsupported targetPlatform '$targetPlatform'")
        }
    } else {
        when(System.getProperty("os.name").lowercase()) {
            "mac os x" -> if(System.getProperty("os.arch").lowercase() == "aarch64") {
                "nativebin-osxm1"
            }else{
                "nativebin-osx64"
            }
            "linux" -> if(System.getProperty("os.arch").lowercase() == "aarch64") {
                "nativebin-linux-arm64"
            }else{
                "nativebin-linux64"
            }
            "win" -> "nativebin-win64"
            else -> "all-deps"
        }
    }

    implementation(group = "org.jetbrains.kotlin", name = "kotlin-stdlib-jdk8", version = kotlinVersion)        //kotlin标准库
    implementation(group = "org.jetbrains.kotlin", name = "kotlin-reflect", version = kotlinVersion)            //kotlin反射支持
    implementation(group = "com.fasterxml.jackson.core", name = "jackson-core", version = jacksonVersion)                   //json序列化
    implementation(group = "com.fasterxml.jackson.core", name = "jackson-databind", version = jacksonVersion)               //json序列化
    implementation(group = "com.fasterxml.jackson.module", name = "jackson-module-kotlin", version = jacksonVersion)        //jackson的kotlin支持
    implementation(group = "com.fasterxml.jackson.datatype", name = "jackson-datatype-jsr310", version = jacksonVersion)    //支持Java8时间类型的序列化与反序列化
    implementation(group = "org.xerial", name = "sqlite-jdbc", version = sqliteVersion)                         //sqlite数据库驱动
    implementation(group = "org.ktorm", name = "ktorm-core", version = ktormVersion)                            //dao层
    implementation(group = "org.ktorm", name = "ktorm-support-sqlite", version = ktormVersion)                  //dao层sqlite方言支持
    implementation(group = "org.apache.commons", name = "commons-dbcp2", version = dbcpVersion)                 //数据库连接池
    implementation(group = "io.javalin", name = "javalin", version = javalinVersion)                            //http服务器
    implementation(group = "net.coobird", name = "thumbnailator", version = thumbnailatorVersion)               //图像处理库，用于缩略图生成
    implementation(group = "com.twelvemonkeys.imageio", name = "imageio-jpeg", version = twelvemonkeysVersion)  //ImageIO扩展，增强jpeg格式处理，兼容各种错误情况
    implementation(group = "ws.schild", name = "jave-core", version = javeVersion)                              //视频处理库，用于缩略图生成
    implementation(group = "ws.schild", name = "jave-$javePlatform", version = javeVersion)                     //视频处理库的平台相关驱动包
    implementation(group = "com.belerweb", name = "pinyin4j", version = pinyin4jVersion)                        //拼音转换库
    implementation(group = "ch.qos.logback", name = "logback-core", version = logbackVersion)                   //日志
    implementation(group = "ch.qos.logback", name = "logback-classic", version = logbackVersion)                //日志
    testImplementation(group = "org.jetbrains.kotlin", name = "kotlin-test-junit", version = kotlinVersion)     //测试
    testImplementation(group = "org.junit.jupiter", name = "junit-jupiter-api", version = junitVersion)         //测试
}

val javaVersion = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21
val projectMainModule = "com.heerkirov.hedge.server"
val projectMainClass = "com.heerkirov.hedge.server.ApplicationKt"
val projectBinaryName = "hedge-v3-server"

application {
    mainClass.set(projectMainClass)
    mainModule.set(projectMainModule)
}

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
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
        dependsOn(processResources)
    }
    compileKotlin {
        compilerOptions.jvmTarget = javaVersion
        destinationDirectory.set(compileJava.get().destinationDirectory)
    }
    compileTestKotlin {
        compilerOptions.jvmTarget = javaVersion
    }
}

if (project.hasProperty("skipTests")) {
    tasks.withType<Test> {
        enabled = false
    }
}

tasks.withType<Jar> {
    manifest {
        attributes["Main-Class"] = projectMainClass
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
         *
         * UPDATE:
         * 已更新jlink插件版本、Java版本。更新之后需要移除此参数了。
         */
        //requires("org.slf4j")
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

tasks.register<Zip>("zip") {
    /* 在gradle更新后，jlinkZip产生了一个bug，从zip解压得到的程序在运行时无法使用Process相关API(不确定是否还有其他的)。
     * 发现手动压缩后的压缩包能够正常使用，因此编写此task，手动添加一个额外的zip步骤。
     */
    archiveFileName.set("image.zip")
    destinationDirectory.set(project.file("${project.rootDir}/build"))
    from(project.file("${project.rootDir}/build/image")) {
        into("image")
    }
}

tasks.getByName("zip").dependsOn("jlink")