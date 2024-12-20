-- 重建homepage_record表
DROP TABLE system_db.homepage_record;
CREATE TABLE system_db.homepage_record(
    `date` DATE NOT NULL PRIMARY KEY,   -- 所属日期
    page INTEGER NOT NULL,              -- 页码
    content TEXT NOT NULL               -- 所有需要记录的内容
);