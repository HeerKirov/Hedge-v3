
-- source_tag_relation 反向查询索引
CREATE INDEX IF NOT EXISTS source_db.source_tag__reverse_index ON source_tag_relation(source_tag_id, source_data_id);