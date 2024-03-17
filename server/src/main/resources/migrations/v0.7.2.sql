
-- 建立illust和元数据的反查索引
CREATE INDEX IF NOT EXISTS illust_author_reverse__index ON illust_author_relation(illust_id);
CREATE INDEX IF NOT EXISTS illust_topic_reverse__index ON illust_topic_relation(illust_id);
CREATE INDEX IF NOT EXISTS illust_tag_reverse__index ON illust_tag_relation(illust_id);
CREATE INDEX IF NOT EXISTS illust_annotation_reverse__index ON illust_annotation_relation(illust_id);
-- 建立book和元数据的反查索引
CREATE INDEX IF NOT EXISTS book_author_reverse__index ON book_author_relation(book_id);
CREATE INDEX IF NOT EXISTS book_topic_reverse__index ON book_topic_relation(book_id);
CREATE INDEX IF NOT EXISTS book_tag_reverse__index ON book_tag_relation(book_id);
CREATE INDEX IF NOT EXISTS book_annotation_reverse__index ON book_annotation_relation(book_id);