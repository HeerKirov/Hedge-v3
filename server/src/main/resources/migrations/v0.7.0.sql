
-- 历史记录模块优化，重新设计历史记录表。旧表数据不继承，直接删除。
DROP TABLE system_db.history_record;

CREATE TABLE system_db.history_record(
    type                TINYINT NOT NULL,           -- 目标类型
    channel             TEXT NOT NULL,              -- 频道隔离
    key                 TEXT NOT NULL,              -- 记录值
    record_time         BIGINT NOT NULL             -- 记录时间
);
CREATE UNIQUE INDEX system_db.history_record__index ON history_record(`type`, `channel`, `key`);