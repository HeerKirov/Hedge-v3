-- 由于调整exportedType，需要重建表

CREATE TABLE new_illust_tag_relation(
    tag_id 		INTEGER NOT NULL,
    illust_id 	INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物。且对于标签来说，还有根据标签规则自动导出的导出产物
);
INSERT INTO new_illust_tag_relation(tag_id, illust_id, is_exported) SELECT tag_id, illust_id, iif(is_exported, 1, 0) FROM illust_tag_relation;
DROP TABLE illust_tag_relation;
ALTER TABLE new_illust_tag_relation RENAME TO illust_tag_relation;

CREATE TABLE new_book_tag_relation(
    tag_id 		INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物。且对于标签来说，还有根据标签规则自动导出的导出产物
);
INSERT INTO new_book_tag_relation(tag_id, book_id, is_exported) SELECT tag_id, book_id, iif(is_exported, 1, 0) FROM book_tag_relation;
DROP TABLE book_tag_relation;
ALTER TABLE new_book_tag_relation RENAME TO book_tag_relation;

CREATE TABLE new_illust_author_relation(
    author_id   INTEGER NOT NULL,
    illust_id   INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物
);
INSERT INTO new_illust_author_relation(author_id, illust_id, is_exported) SELECT author_id, illust_id, iif(is_exported, 1, 0) FROM illust_author_relation;
DROP TABLE illust_author_relation;
ALTER TABLE new_illust_author_relation RENAME TO illust_author_relation;

CREATE TABLE new_book_author_relation(
    author_id 	INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物
);
INSERT INTO new_book_author_relation(author_id, book_id, is_exported) SELECT author_id, book_id, iif(is_exported, 1, 0) FROM book_author_relation;
DROP TABLE book_author_relation;
ALTER TABLE new_book_author_relation RENAME TO book_author_relation;


CREATE TABLE new_illust_topic_relation(
    topic_id    INTEGER NOT NULL,
    illust_id   INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物
);
INSERT INTO new_illust_topic_relation(topic_id, illust_id, is_exported) SELECT topic_id, illust_id, iif(is_exported, 1, 0) FROM illust_topic_relation;
DROP TABLE illust_topic_relation;
ALTER TABLE new_illust_topic_relation RENAME TO illust_topic_relation;


CREATE TABLE new_book_topic_relation(
    topic_id 	INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported TINYINT NOT NULL    -- 此标签是导出产物
);
INSERT INTO new_book_topic_relation(topic_id, book_id, is_exported) SELECT topic_id, book_id, iif(is_exported, 1, 0) FROM book_topic_relation;
DROP TABLE book_topic_relation;
ALTER TABLE new_book_topic_relation RENAME TO book_topic_relation;


CREATE UNIQUE INDEX illust_tag__index ON illust_tag_relation(tag_id, illust_id);
CREATE UNIQUE INDEX illust_author__index ON illust_author_relation(author_id, illust_id);
CREATE UNIQUE INDEX illust_topic__index ON illust_topic_relation(topic_id, illust_id);
CREATE UNIQUE INDEX book_tag__index ON book_tag_relation(tag_id, book_id);
CREATE UNIQUE INDEX book_author__index ON book_author_relation(author_id, book_id);
CREATE UNIQUE INDEX book_topic__index ON book_topic_relation(topic_id, book_id);
CREATE INDEX IF NOT EXISTS illust_tag_reverse__index ON illust_tag_relation(illust_id);
CREATE INDEX IF NOT EXISTS illust_author_reverse__index ON illust_author_relation(illust_id);
CREATE INDEX IF NOT EXISTS illust_topic_reverse__index ON illust_topic_relation(illust_id);
CREATE INDEX IF NOT EXISTS book_tag_reverse__index ON book_tag_relation(book_id);
CREATE INDEX IF NOT EXISTS book_author_reverse__index ON book_author_relation(book_id);
CREATE INDEX IF NOT EXISTS book_topic_reverse__index ON book_topic_relation(book_id);
