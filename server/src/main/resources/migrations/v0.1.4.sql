
-- 业务逻辑变更，现在SourceTag更改为由(site, type, code)唯一定位一条记录了。
-- 同时，type字段变更为NOT NULL，因此重制了表。
CREATE TABLE source_db.new_source_tag(
    id              INTEGER PRIMARY KEY,
    site            VARCHAR(16) NOT NULL,           -- 来源网站的代号
    type            TEXT COLLATE NOCASE NOT NULL,   -- 标签在来源网站的分类名称(如果有)
    code            TEXT COLLATE NOCASE NOT NULL,   -- 标签编码
    name            TEXT COLLATE NOCASE NOT NULL,   -- 标签名称
    other_name      TEXT COLLATE NOCASE             -- 标签的别名(如果有)
);
CREATE UNIQUE INDEX source_db.source_tag__site_type_code_index ON new_source_tag(site, type, code);

INSERT INTO source_db.new_source_tag(id, site, type, code, name, other_name)
SELECT id, site, ifnull(type, ''), code, name, other_name FROM source_tag;

ALTER TABLE source_db.source_tag RENAME TO old_source_tag;
ALTER TABLE source_db.new_source_tag RENAME TO source_tag;
DROP TABLE source_db.old_source_tag;