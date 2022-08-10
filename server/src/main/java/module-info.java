module com.heerkirov.hedge.server {
    requires java.base;
    requires java.sql;
    requires java.desktop;
    requires kotlin.stdlib;
    requires kotlin.reflect;
    requires kotlin.stdlib.jdk7;

    requires io.javalin;
    requires ktorm.core;
    requires ktorm.support.sqlite;
    requires org.xerial.sqlitejdbc;
    requires com.fasterxml.jackson.databind;
    requires jackson.module.kotlin;
    requires jave.core;
    requires org.slf4j;
    requires dd.plist;

    opens com.heerkirov.hedge.server.components.health;
    opens com.heerkirov.hedge.server.components.appdata;
    opens com.heerkirov.hedge.server.components.database;
    opens com.heerkirov.hedge.server.components.http;
    opens com.heerkirov.hedge.server.components.http.modules;
    opens com.heerkirov.hedge.server.components.http.routes;
    opens com.heerkirov.hedge.server.model;
    opens com.heerkirov.hedge.server.dto.res;
    opens com.heerkirov.hedge.server.dto.form;
    opens com.heerkirov.hedge.server.dto.filter;
    opens com.heerkirov.hedge.server.exceptions;
    opens com.heerkirov.hedge.server.utils.types;
    exports com.heerkirov.hedge.server.library.compiler.translator.visual to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.lexical to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.grammar to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.semantic to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.translator to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.utils to com.fasterxml.jackson.databind;
    exports com.heerkirov.hedge.server.library.compiler.grammar.semantic to kotlin.reflect;
    exports com.heerkirov.hedge.server.library.compiler.semantic.dialect to kotlin.reflect;
}