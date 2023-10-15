
-- 便签
CREATE TABLE system_db.note_record(
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    status          TINYINT NOT NULL,
    deleted         BOOLEAN NOT NULL,
    create_time     TIMESTAMP NOT NULL,
    update_time		TIMESTAMP NOT NULL
);