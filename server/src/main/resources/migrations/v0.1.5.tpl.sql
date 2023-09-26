
-- 字段修复。使用Date类型写入的分区时间仍然是时区相关的，这并不符合业务逻辑，业务逻辑中期望的分区时间是个与时区无关的固定值。
-- 为此需要替换dao层的类型实现，并且需要修正数据库的存储值。
-- 数据库的当前存储值是Date with local zone的时间点在UTC的时间戳。成本最低的修改方案便是将其加上OFFSET，修正为正确的时间戳，然后读取时默认作为UTC时间读取。
UPDATE illust SET partition_time = partition_time + ${OFFSET_EPOCHMILLS};
UPDATE partition SET `date` = `date` + ${OFFSET_EPOCHMILLS};
UPDATE import_image SET partition_time = partition_time + ${OFFSET_EPOCHMILLS};
UPDATE trashed_image SET partition_time = partition_time + ${OFFSET_EPOCHMILLS};
UPDATE system_db.homepage_record SET `date` = `date` + ${OFFSET_EPOCHMILLS};


-- 迁移表位置。将文件缓存访问记录迁移到system分库，以隔离存储数据和使用数据。
CREATE TABLE system_db.file_cache_record(
    file_id             INTEGER NOT NULL,
    archive_type        TINYINT NOT NULL,
    block               VARCHAR(16) NOT NULL,
    filename            VARCHAR(24) NOT NULL,
    last_access_time    TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX system_db.file_cache_record__index ON file_cache_record(file_id, archive_type);

INSERT INTO system_db.file_cache_record (file_id, archive_type, block, filename, last_access_time)
SELECT file_id, archive_type, block, filename, last_access_time
FROM file_db.file_cache_record;

DROP TABLE file_db.file_cache_record;