
-- source_data表: 移除links字段
CREATE TABLE source_db.new_source_data(
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    source_site		VARCHAR(16) NOT NULL,
    source_id 		TEXT NOT NULL,
    sortable_source_id BIGINT,

    title 			TEXT COLLATE NOCASE DEFAULT NULL,
    description     TEXT COLLATE NOCASE DEFAULT NULL,
    relations 		TEXT DEFAULT NULL,
    additional_info TEXT DEFAULT NULL,
    publish_time    TIMESTAMP DEFAULT NULL,
    cached_count    TEXT NOT NULL,
    empty           BOOLEAN NOT NULL,
    status          TINYINT NOT NULL,

    create_time 	TIMESTAMP NOT NULL,
    update_time 	TIMESTAMP NOT NULL
);

INSERT INTO source_db.new_source_data SELECT id, source_site, source_id, sortable_source_id, title, description, relations, additional_info, NULL, cached_count, empty, status, create_time, update_time FROM source_db.source_data;

DROP TABLE source_db.source_data;

ALTER TABLE source_db.new_source_data RENAME TO source_data;

CREATE UNIQUE INDEX source_db.source_data__source__index ON source_data(source_site, source_id);
