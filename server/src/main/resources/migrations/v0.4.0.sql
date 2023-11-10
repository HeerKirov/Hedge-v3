
-- 新的导入记录表
CREATE TABLE import_record(
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id                 INTEGER NOT NULL,               -- 链接的文件id
    image_id                INTEGER,                        -- 链接的图像id

    status                  TINYINT NOT NULL,               -- 导入记录的状态
    status_info             TEXT,                           -- 导入记录状态的附加信息
    deleted                 BOOLEAN NOT NULL,               -- 是否已删除

    file_name               TEXT,                           -- 原文件名，包括扩展名，不包括文件路径。从web导入时可能没有，此时填null
    file_path               TEXT,                           -- 原文件路径，不包括文件名。从web导入时可能没有，此时填null
    file_create_time        TIMESTAMP,                      -- 原文件创建时间。从web导入时可能没有，此时填null
    file_update_time        TIMESTAMP,                      -- 原文件修改时间。从web导入时可能没有，此时填null
    import_time             TIMESTAMP NOT NULL,             -- 导入此文件的时间
    deleted_time            TIMESTAMP                       -- 将此文件标记为删除的时间
);

CREATE UNIQUE INDEX import_image__image__index ON import_record(image_id);
CREATE UNIQUE INDEX import_image__file__index ON import_record(file_id);
CREATE INDEX import_image__index ON import_record(deleted, import_time);
CREATE INDEX import_image__deleted__index ON import_record(deleted_time) WHERE deleted = TRUE;

INSERT INTO import_record
SELECT id, file_id, NULL, 0, NULL, FALSE, file_name, file_path, file_create_time, file_update_time, file_import_time, NULL
FROM import_image;

DROP TABLE import_image;

-- 新的相似项查找结果表。旧的结果抛弃不继承
CREATE TABLE system_db.new_find_similar_result(
    id              INTEGER PRIMARY KEY,
    category        TINYINT NOT NULL,
    summary_type    TINYINT NOT NULL,
    resolved        BOOLEAN NOT NULL,
    image_ids       TEXT NOT NULL,
    edges           TEXT NOT NULL,
    coverages       TEXT NOT NULL,
    record_time     TIMESTAMP NOT NULL
);

DROP TABLE system_db.find_similar_result;
ALTER TABLE system_db.new_find_similar_result RENAME TO find_similar_result;

-- 新的相似项查找忽略关系表
CREATE TABLE system_db.new_find_similar_ignored(
    id              INTEGER PRIMARY KEY,
    type            TINYINT NOT NULL,
    first_target    INTEGER NOT NULL,
    second_target   INTEGER,
    record_time     TIMESTAMP NOT NULL
);

INSERT INTO system_db.new_find_similar_ignored
SELECT id, 1, CAST(substring(first_target, 1) AS INTEGER), CAST(substring(second_target, 1) AS INTEGER), record_time
FROM system_db.find_similar_ignored;

DROP TABLE system_db.find_similar_ignored;
ALTER TABLE system_db.new_find_similar_ignored RENAME TO find_similar_ignored;

CREATE INDEX system_db.find_similar_ignored__index ON find_similar_ignored(type, first_target, second_target);
CREATE INDEX system_db.find_similar_ignored_re__index ON find_similar_ignored(type, second_target, first_target);

-- 移除source mark
DROP TABLE source_db.source_mark;