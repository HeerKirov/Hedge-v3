-- 创建Keyword表
CREATE TABLE IF NOT EXISTS meta_db.keyword (
    id				INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_type        TINYINT NOT NULL,                   -- 关联何种标签
    keyword			TEXT COLLATE NOCASE NOT NULL,       -- 关键字本体
    tag_count       INTEGER NOT NULL,                   -- 关键字关联的标签数量
    last_used_time  TIMESTAMP NOT NULL                  -- 关键字上次被使用的时间
);
CREATE UNIQUE INDEX meta_db.keyword__index ON keyword(tag_type, keyword);

-- 从picker history移除annotation相关的记录
DELETE FROM system_db.history_record WHERE channel IN ('ANNOTATION', 'ANNOTATION:TAG', 'ANNOTATION:TOPIC', 'ANNOTATION:AUTHOR');