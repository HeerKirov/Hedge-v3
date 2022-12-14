plugins {
    application
    kotlin("jvm").version("1.7.10")
    id("com.github.johnrengelman.shadow").version("4.0.3")
    id("org.beryx.jlink").version("2.25.0")
}

group = "com.heerkirov.hedge"
version = "0.1.0"

dependencies {
    val kotlinVersion = "1.7.10"
    val javalinVersion = "4.6.4"
    val ktormVersion = "3.5.0"
    val sqliteVersion = "3.36.0.3"
    val jacksonVersion = "2.11.4" //fk, how to upgrade it?
    val javeVersion = "3.3.1"
    val slf4jVersion = "1.7.36"
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
val projectMainModule = "com.heerkirov.hedge"
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
}

sourceSets {
    //?????????????????????gradle?????????????????????????????????????????????????????????
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
        /* ????????????jlink??????auto merge non-module?????????????????????
         * ??????java????????????uses???module????????????????????????implement?????????non-module????????????jlink???????????????????????????????????????merged-module???
         * ?????????kotlin-reflect????????????ServiceLoader???uses????????????????????????merged module???????????????????????????module * does not declare `uses`????????????
         * tips: ???additive=true????????????????????????DSL???jlink?????????:createMergedModule???????????????warn???????????????????????????
         */
        uses("kotlin.reflect.jvm.internal.impl.resolve.ExternalOverridabilityCondition")
        uses("kotlin.reflect.jvm.internal.impl.util.ModuleVisibilityHelper")
        uses("kotlin.reflect.jvm.internal.impl.builtins.BuiltInsLoader")
    }
}