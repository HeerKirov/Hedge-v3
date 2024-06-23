module com.heerkirov.hedge.server {
    requires java.base;
    requires java.sql;
    requires java.desktop;
    requires java.management;
    requires kotlin.stdlib;
    requires kotlin.reflect;

    requires io.javalin;
    requires ktorm.core;
    requires ktorm.support.sqlite;
    requires org.xerial.sqlitejdbc;
    requires com.fasterxml.jackson.databind;
    requires com.fasterxml.jackson.kotlin;
    requires com.fasterxml.jackson.datatype.jsr310;
    requires net.coobird.thumbnailator;
    requires com.twelvemonkeys.imageio.jpeg;
    requires jave.core;
    requires ch.qos.logback.core;
    requires ch.qos.logback.classic;
    requires org.eclipse.jetty.server;
    requires org.eclipse.jetty.util;

    opens com.heerkirov.hedge.server.components.health;
    opens com.heerkirov.hedge.server.components.appdata;
    opens com.heerkirov.hedge.server.components.database;
    opens com.heerkirov.hedge.server.components.server;
    opens com.heerkirov.hedge.server.components.server.modules;
    opens com.heerkirov.hedge.server.components.server.routes;
    opens com.heerkirov.hedge.server.components.backend;
    opens com.heerkirov.hedge.server.components.backend.exporter;
    opens com.heerkirov.hedge.server.model;
    opens com.heerkirov.hedge.server.dto.res;
    opens com.heerkirov.hedge.server.dto.form;
    opens com.heerkirov.hedge.server.dto.filter;
    opens com.heerkirov.hedge.server.exceptions;
    opens com.heerkirov.hedge.server.events;
    opens com.heerkirov.hedge.server.enums;
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