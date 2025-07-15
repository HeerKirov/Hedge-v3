

-- 由于新增implicit_names字段，tag/author/topic表都需要重新创建

CREATE TABLE meta_db.new_tag(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    global_ordinal  INTEGER NOT NULL,               -- 全局排序下标，从0开始
    ordinal 		INTEGER NOT NULL,               -- 排序下标，由系统维护，同一父标签一组从0开始
    parent_id 		INTEGER DEFAULT NULL,           -- 父标签的ID
    name 			VARCHAR(32) COLLATE NOCASE NOT NULL,       -- 标签的名称
    other_names 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',   -- 标签的别名::string("nameA|nameB|nameC")
    implicit_names 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',   -- 隐式名称::string("nameA|nameB|nameC")
    type 			TINYINT NOT NULL,               -- 标签的类型{0=标签, 1=地址段, 2=虚拟地址段}
    is_group 		TINYINT NOT NULL,               -- 开启组的标记{0=非组, 1=组, 2=强制组, 3=序列化组, 4=强制&序列化组}

    description		TEXT COLLATE NOCASE NOT NULL,   -- 标签的内容描述
    color           TEXT DEFAULT NULL,              -- 标签的颜色名称
    links           TEXT DEFAULT NULL,              -- 链接到其他标签::json<number[]>，填写tagId列表，在应用此标签的同时导出链接的标签
    examples		TEXT DEFAULT NULL,              -- 标签的样例image列表::json<number[]>，填写id列表，NULL表示无
    exported_score  INTEGER DEFAULT NULL,           -- [导出]根据其关联的image导出的统计分数
    cached_count 	INTEGER NOT NULL DEFAULT 0,     -- [冗余]此标签关联的图片数量

    create_time 	TIMESTAMP NOT NULL,             -- 此标签初次建立的时间
    update_time 	TIMESTAMP NOT NULL              -- 对标签的关联image项进行更新的时间
);

INSERT INTO meta_db.new_tag(id, global_ordinal, ordinal, name, other_names, implicit_names, type, is_group, description, color, links, examples, exported_score, cached_count, create_time, update_time)
SELECT id, global_ordinal, ordinal, name, other_names, '', type, is_group, description, color, links, examples, exported_score, cached_count, create_time, update_time FROM meta_db.tag;

ALTER TABLE meta_db.tag RENAME TO old_tag;
ALTER TABLE meta_db.new_tag RENAME TO tag;
DROP TABLE meta_db.old_tag;

CREATE INDEX meta_db.tag_ordinal_index ON tag(parent_id, ordinal);
CREATE INDEX meta_db.tag_global_ordinal_index ON tag(global_ordinal);


CREATE TABLE meta_db.new_author(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    name 			TEXT COLLATE NOCASE NOT NULL,                   -- 标签的名称
    other_names     TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 标签的别名::string("nameA|nameB|nameC")
    implicit_names 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 隐式名称::string("nameA|nameB|nameC")
    keywords        TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 关键字::string("k1|k2")
    type 			TINYINT NOT NULL,                               -- 此标签的类型{0=未知, 1=画师, 2=工作室, 3=出版物}
    score			INTEGER DEFAULT NULL,                           -- 评分
    favorite		BOOLEAN NOT NULL DEFAULT FALSE,                 -- 喜爱标记，会用于收藏展示
    description     TEXT COLLATE NOCASE NOT NULL,                   -- 标签的内容描述

    cached_count 	    INTEGER NOT NULL DEFAULT 0,     -- [冗余]此标签关联的图片数量

    create_time 	TIMESTAMP NOT NULL,             -- 此标签初次建立的时间
    update_time 	TIMESTAMP NOT NULL              -- 对标签的关联image项进行更新的时间
);

INSERT INTO meta_db.new_author(id, name, other_names, implicit_names, keywords, type, score, favorite, description, cached_count, create_time, update_time)
SELECT id, name, other_names, '', keywords, type, score, favorite, description, cached_count, create_time, update_time FROM meta_db.author;

ALTER TABLE meta_db.author RENAME TO old_author;
ALTER TABLE meta_db.new_author RENAME TO author;
DROP TABLE meta_db.old_author;

CREATE INDEX meta_db.author_filter_index ON author(type, favorite);


CREATE TABLE meta_db.new_topic(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    name 			TEXT COLLATE NOCASE NOT NULL,                   -- 标签的名称
    other_names     TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 标签的别名::string("nameA|nameB|nameC")
    implicit_names 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 隐式名称::string("nameA|nameB|nameC")
    keywords        TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 关键字::string("k1|k2")
    parent_id 	    INTEGER DEFAULT NULL,                           -- 父标签的ID
    parent_root_id  INTEGER DEFAULT NULL,                           -- 根父标签的ID
    type 			TINYINT NOT NULL,                               -- 此标签的类型{0=未知, 1=IP版权方, 2=IP, 3=角色}
    score			INTEGER DEFAULT NULL,                           -- 评分
    favorite		BOOLEAN NOT NULL DEFAULT FALSE,                 -- 喜爱标记，会用于收藏展示
    description		TEXT COLLATE NOCASE NOT NULL,                   -- 标签的内容描述

    cached_count 	    INTEGER NOT NULL DEFAULT 0,     -- [冗余]此标签关联的图片数量

    create_time 	TIMESTAMP NOT NULL,             -- 此标签初次建立的时间
    update_time 	TIMESTAMP NOT NULL              -- 对标签的关联image项进行更新的时间
);

INSERT INTO meta_db.new_topic(id, name, other_names, implicit_names, keywords, parent_id, parent_root_id, type, score, favorite, description, cached_count, create_time, update_time)
SELECT id, name, other_names, '', keywords, parent_id, parent_root_id, type, score, favorite, description, cached_count, create_time, update_time FROM meta_db.topic;

ALTER TABLE meta_db.topic RENAME TO old_topic;
ALTER TABLE meta_db.new_topic RENAME TO topic;
DROP TABLE meta_db.old_topic;

CREATE INDEX meta_db.topic_filter_index ON topic(type, favorite);

-- 移除已废弃的annotation
DROP TABLE meta_db.annotation;
DROP TABLE meta_db.tag_annotation_relation;
DROP TABLE meta_db.author_annotation_relation;
DROP TABLE meta_db.topic_annotation_relation;
DROP TABLE illust_annotation_relation;
DROP TABLE book_annotation_relation;
