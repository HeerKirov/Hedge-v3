-- 第一版本的sqlite数据模型

-- 图片/集合 的混合表
CREATE TABLE illust(
    id							INTEGER PRIMARY KEY AUTOINCREMENT,
    type						TINYINT NOT NULL,                   -- 对象类型{0=无父集合的图像, 1=有父集合的图像, 2=集合}
    parent_id				    INTEGER,                            -- [only image]有父集合时，记录父集合的ID
    file_id				        INTEGER NOT NULL,				    -- 链接的文件ID。对集合来说链接的是封面图像的ID冗余
    cached_children_count       INTEGER NOT NULL,                   -- [冗余]对collection来说是子项数量; 对image是无用字段
    cached_book_count           INTEGER NOT NULL,                   -- [冗余]book关联数量

    source_data_id              INTEGER,                            -- 链接的source data ID
    source_site                 VARCHAR(16),                        -- [冗余]来源网站的代号
    source_id                   BIGINT,                             -- [冗余]来源网站中的图像代号
    source_part                 INTEGER,                            -- 来源网站中的二级图像代号

    description			        TEXT COLLATE NOCASE NOT NULL DEFAULT '',    -- 简述信息，不存在时记空串
    score						INTEGER DEFAULT NULL,                       -- 图像的评分。具体含义由setting定义
    favorite				    BOOLEAN NOT NULL DEFAULT FALSE,             -- [only image]喜爱标记
    tagme                       INTEGER NOT NULL,                           -- 标记为tagme{0b1=标签, 0b10=作者, 0b100=主题, 0b1000=有关系项, 0b10000=其他信息}

    exported_description        TEXT COLLATE NOCASE NOT NULL DEFAULT '',    -- [导出]导出的简述信息。聚合时采用
    exported_score			    INTEGER DEFAULT NULL,                       -- [导出]导出的评分。聚合时取平均值

    partition_time	            DATE NOT NULL,                      -- 用于日历分组的时间。集合的值是导出值，取最早项
    order_time			        BIGINT NOT NULL,                    -- 用于排序的时间。集合的值是导出值，取最早时间
    create_time			        TIMESTAMP NOT NULL,                 -- 初次创建的真实时间
    update_time			        TIMESTAMP NOT NULL                  -- 对image的图像或集合的项进行更新的时间
);
CREATE INDEX illust_filter__index ON illust(type, partition_time);   -- 基于image/collection类型，分区信息的索引
CREATE INDEX illust_tagme__index ON illust(type, tagme);             -- 基于类型和tagme的索引
CREATE INDEX illust_file__index ON illust(id, file_id);              -- id和file的索引
CREATE INDEX illust_parent__index ON illust(parent_id);              -- parent的索引

-- 关联组关联关系
CREATE TABLE associate_relation(
    illust_id           INTEGER NOT NULL,       -- 此关系所属illust
    related_illust_id   INTEGER NOT NULL        -- 此关系指向的illust
);
CREATE INDEX associate_illust__index ON associate_relation(illust_id, related_illust_id);

-- 画集
CREATE TABLE book(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    title 			TEXT COLLATE NOCASE NOT NULL DEFAULT '',       -- 画集标题，不存在时记空串
    description 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',       -- 画集的简述信息，不存在时记空串
    score 			INTEGER DEFAULT NULL,           -- 画集的评分。评分的具体含义和范围在setting中配置
    favorite		BOOLEAN NOT NULL DEFAULT FALSE, -- 喜爱标记，会用于收藏展示

    file_id         INTEGER,                        -- [冗余]画集封面的图片文件id
    cached_count    INTEGER NOT NULL,               -- [冗余]画集中的图片数量
    create_time 	TIMESTAMP NOT NULL,             -- 此画集初次建立的真实时间
    update_time 	TIMESTAMP NOT NULL              -- 对画集进行更新的真实更新时间(指画集内容变更，比如image source变化、图像替换增删)
);
-- 画集与image的M:N关系
CREATE TABLE book_image_relation(
    book_id 	INTEGER NOT NULL,
    image_id 	INTEGER NOT NULL,   -- 关联的image id
    ordinal 	INTEGER NOT NULL    -- 此image在此画集中的排序顺位，从0开始，由系统统一调配，0号视作封面
);
CREATE INDEX book_image__index ON book_image_relation(book_id, image_id);

-- 文件夹
CREATE TABLE folder(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    title 			TEXT COLLATE NOCASE NOT NULL DEFAULT '',   -- 文件夹标题，不存在时记空串
    type            TINYINT NOT NULL,                          -- 类型{0=节点Node, 1=文件夹Folder}
    parent_id       INTEGER DEFAULT NULL,                      -- 父节点的id
    parent_address  TEXT COLLATE NOCASE DEFAULT NULL,          -- [冗余]父节点的每一节点构成的地址，由|分割

    ordinal         INTEGER NOT NULL,           -- 排序下标，由系统维护，同一父节点一组从0开始
    pin             INTEGER,                    -- pin标记及其排序顺位

    cached_count    INTEGER,                    -- [冗余]Folder类型文件夹中的图片数量

    create_time 	TIMESTAMP NOT NULL,         -- 此文件夹初次建立的真实时间
    update_time 	TIMESTAMP NOT NULL          -- 对内容进行更新的真实更新时间(指画集内容变更，比如image source变化、图像替换增删)
);
-- 文件夹与image的M:N关系
CREATE TABLE folder_image_relation(
    folder_id 	INTEGER NOT NULL,
    image_id 	INTEGER NOT NULL,
    ordinal		INTEGER NOT NULL    -- 此image在此文件夹中的排序顺位，从0开始，由系统统一调配，0号视作封面
);
CREATE INDEX folder_image__index ON folder_image_relation(folder_id, image_id);

-- 时间分区
CREATE TABLE partition(
    `date`        DATE NOT NULL PRIMARY KEY , -- 此时间分区的值
    cached_count  INTEGER NOT NULL DEFAULT 0  -- [冗余]属于此时间分区的图片数量
);
CREATE UNIQUE INDEX partition_date__index ON partition(date);

-- 已删除
CREATE TABLE trashed_image(
    image_id				    INTEGER PRIMARY KEY,
    parent_id				    INTEGER,                            -- 有父集合时，记录父集合的ID
    file_id				        INTEGER NOT NULL,				    -- 链接的文件ID

    source_site                 VARCHAR(16),                        -- 来源网站的代号
    source_id                   BIGINT,                             -- 来源网站中的图像代号
    source_part                 INTEGER,                            -- 来源网站中的二级图像代号
    metadata                    TEXT NOT NULL,                      -- 其他元数据{tags, topics, authors, books, foldera}
    description			        TEXT COLLATE NOCASE NOT NULL,       -- 简述信息
    score						INTEGER,                            -- 图像的评分
    favorite				    BOOLEAN NOT NULL,                   -- 喜爱标记
    tagme                       INTEGER NOT NULL,                   -- 标记为tagme

    partition_time	            DATE NOT NULL,                      -- 用于日历分组的时间
    order_time			        BIGINT NOT NULL,                    -- 用于排序的时间
    create_time			        TIMESTAMP NOT NULL,                 -- 初次创建的真实时间
    update_time			        TIMESTAMP NOT NULL,                 -- 对image的图像或集合的项进行更新的时间
    trashed_time                TIMESTAMP NOT NULL                  -- 此图像被删除的时间
);

-- 内容描述 标签
CREATE TABLE meta_db.tag(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    global_ordinal  INTEGER NOT NULL,               -- 全局排序下标，从0开始
    ordinal 		INTEGER NOT NULL,               -- 排序下标，由系统维护，同一父标签一组从0开始
    parent_id 		INTEGER DEFAULT NULL,           -- 父标签的ID
    name 			VARCHAR(32) COLLATE NOCASE NOT NULL,       -- 标签的名称
    other_names 	TEXT COLLATE NOCASE NOT NULL DEFAULT '',   -- 标签的别名::string("nameA|nameB|nameC")
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
CREATE INDEX meta_db.tag_ordinal_index ON tag(parent_id, ordinal);
CREATE INDEX meta_db.tag_global_ordinal_index ON tag(global_ordinal);

-- 作者 标签
CREATE TABLE meta_db.author(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    name 			TEXT COLLATE NOCASE NOT NULL,                   -- 标签的名称
    other_names     TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 标签的别名::string("nameA|nameB|nameC")
    keywords        TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 关键字::string("k1|k2")
    type 			TINYINT NOT NULL,                               -- 此标签的类型{0=未知, 1=画师, 2=工作室, 3=出版物}
    score			INTEGER DEFAULT NULL,                           -- 评分
    favorite		BOOLEAN NOT NULL DEFAULT FALSE,                 -- 喜爱标记，会用于收藏展示
    description     TEXT COLLATE NOCASE NOT NULL,                   -- 标签的内容描述

    cached_count 	    INTEGER NOT NULL DEFAULT 0,     -- [冗余]此标签关联的图片数量
    cached_annotations 	TEXT DEFAULT NULL,              -- [冗余]此标签的注解的缓存，用于显示::json<string[]>

    create_time 	TIMESTAMP NOT NULL,             -- 此标签初次建立的时间
    update_time 	TIMESTAMP NOT NULL              -- 对标签的关联image项进行更新的时间
);
CREATE INDEX meta_db.author_filter_index ON author(type, favorite);

-- 主题 标签
CREATE TABLE meta_db.topic(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT,
    name 			TEXT COLLATE NOCASE NOT NULL,                   -- 标签的名称
    other_names     TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 标签的别名::string("nameA|nameB|nameC")
    keywords        TEXT COLLATE NOCASE NOT NULL DEFAULT '',        -- 关键字::string("k1|k2")
    parent_id 	    INTEGER DEFAULT NULL,                           -- 父标签的ID
    parent_root_id  INTEGER DEFAULT NULL,                           -- 根父标签的ID
    type 			TINYINT NOT NULL,                               -- 此标签的类型{0=未知, 1=IP版权方, 2=IP, 3=角色}
    score			INTEGER DEFAULT NULL,                           -- 评分
    favorite		BOOLEAN NOT NULL DEFAULT FALSE,                 -- 喜爱标记，会用于收藏展示
    description		TEXT COLLATE NOCASE NOT NULL,                   -- 标签的内容描述

    cached_count 	    INTEGER NOT NULL DEFAULT 0,     -- [冗余]此标签关联的图片数量
    cached_annotations 	TEXT DEFAULT NULL,              -- [冗余]此标签的注解的缓存，用于显示::json<string[]>

    create_time 	TIMESTAMP NOT NULL,             -- 此标签初次建立的时间
    update_time 	TIMESTAMP NOT NULL              -- 对标签的关联image项进行更新的时间
);
CREATE INDEX meta_db.topic_filter_index ON topic(type, favorite);

-- tag和illust/book的关联
CREATE TABLE illust_tag_relation(
    tag_id 		INTEGER NOT NULL,
    illust_id 	INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物。且对于标签来说，还有根据标签规则自动导出的导出产物
);
CREATE TABLE book_tag_relation(
    tag_id 		INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物。且对于标签来说，还有根据标签规则自动导出的导出产物
);
CREATE UNIQUE INDEX illust_tag__index ON illust_tag_relation(tag_id, illust_id);
CREATE UNIQUE INDEX book_tag__index ON book_tag_relation(tag_id, book_id);

-- author和illust/book的关联
CREATE TABLE illust_author_relation(
    author_id   INTEGER NOT NULL,
    illust_id   INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物
);
CREATE TABLE book_author_relation(
    author_id 	INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物
);
CREATE UNIQUE INDEX illust_author__index ON illust_author_relation(author_id, illust_id);
CREATE UNIQUE INDEX book_author__index ON book_author_relation(author_id, book_id);

-- topic和illust/book的关联
CREATE TABLE illust_topic_relation(
    topic_id    INTEGER NOT NULL,
    illust_id   INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物
);
CREATE TABLE book_topic_relation(
    topic_id 	INTEGER NOT NULL,
    book_id 	INTEGER NOT NULL,
    is_exported BOOLEAN NOT NULL    -- 此标签是导出产物
);
CREATE UNIQUE INDEX illust_topic__index ON illust_topic_relation(topic_id, illust_id);
CREATE UNIQUE INDEX book_topic__index ON book_topic_relation(topic_id, book_id);

-- 注解
CREATE TABLE meta_db.annotation(
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT COLLATE NOCASE NOT NULL,   -- 注解名称
    can_be_exported     BOOLEAN NOT NULL,               -- 是否为导出注解
    type                TINYINT NOT NULL,               -- 注解的适用种类
    target              INTEGER NOT NULL,               -- 注解的详细适用范围

    create_time 	    TIMESTAMP NOT NULL              -- 此注解初次建立的时间
);
CREATE TABLE meta_db.tag_annotation_relation(
    annotation_id   INTEGER NOT NULL,
    tag_id          INTEGER NOT NULL
);
CREATE TABLE meta_db.author_annotation_relation(
    annotation_id   INTEGER NOT NULL,
    author_id       INTEGER NOT NULL
);
CREATE TABLE meta_db.topic_annotation_relation(
    annotation_id   INTEGER NOT NULL,
    topic_id        INTEGER NOT NULL
);
CREATE TABLE illust_annotation_relation(
    annotation_id   INTEGER NOT NULL,
    illust_id       INTEGER NOT NULL
);
CREATE TABLE book_annotation_relation(
    annotation_id   INTEGER NOT NULL,
    book_id         INTEGER NOT NULL
);
CREATE UNIQUE INDEX meta_db.tag_annotation__index ON tag_annotation_relation(annotation_id, tag_id);
CREATE UNIQUE INDEX meta_db.topic_annotation__index ON topic_annotation_relation(annotation_id, topic_id);
CREATE UNIQUE INDEX meta_db.copyright_annotation__index ON author_annotation_relation(annotation_id, author_id);
CREATE UNIQUE INDEX illust_annotation__index ON illust_annotation_relation(annotation_id, illust_id);
CREATE UNIQUE INDEX book_annotation__index ON book_annotation_relation(annotation_id, book_id);

-- 导入表
CREATE TABLE import_image(
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id             INTEGER NOT NULL,               -- 链接的文件id

    file_name           TEXT,                           -- 原文件名，包括扩展名，不包括文件路径。从web导入时可能没有，此时填null
    file_path           TEXT,                           -- 原文件路径，不包括文件名。从web导入时可能没有，此时填null
    file_create_time    TIMESTAMP,                      -- 原文件创建时间。从web导入时可能没有，此时填null
    file_update_time    TIMESTAMP,                      -- 原文件修改时间。从web导入时可能没有，此时填null
    file_import_time    TIMESTAMP NOT NULL,             -- 一阶导入此文件的时间

    collection_id       INTEGER,                        -- collection
    book_ids            TEXT,                           -- books
    folder_ids          TEXT,                           -- folders
    preference          TEXT,                           -- 预设关系

    source_site         VARCHAR(16) DEFAULT NULL,       -- 来源网站的代号，没有填null
    source_id           BIGINT DEFAULT NULL,            -- 来源网站中的图像代号，没有填null
    source_part         INTEGER DEFAULT NULL,           -- 来源网站中的二级图像代号，没有填null
    tagme               INTEGER NOT NULL,               -- 标记为tagme，详见illust部分。可以通过配置决定要不要给项目加初始tagme，以及该加哪些
    partition_time	    DATE NOT NULL,                  -- 用于日历分组的时间
    order_time			BIGINT NOT NULL,                -- 用于排序的时间
    create_time			TIMESTAMP NOT NULL              -- 初次创建的时间
);

-- 来源信息
CREATE TABLE source_db.source_data(
    id              INTEGER PRIMARY KEY AUTOINCREMENT,  -- id
    source_site		VARCHAR(16) NOT NULL,               -- 来源网站的代号
    source_id 		BIGINT NOT NULL,                    -- 来源网站中的图像代号

    title 			TEXT COLLATE NOCASE DEFAULT NULL,   -- 原数据的标题信息，有些会有，比如pixiv
    description     TEXT COLLATE NOCASE DEFAULT NULL,   -- 原数据的描述信息，有些会有，比如pixiv
    relations 		TEXT DEFAULT NULL,                  -- 原数据的关系信息::json<Int>
    cached_count    TEXT NOT NULL,                      -- 关系信息的数量缓存::json<SourceCount>
    empty           BOOLEAN NOT NULL,                   -- 是否为空
    status          TINYINT NOT NULL,                   -- 编写状态

    create_time 	TIMESTAMP NOT NULL,                 -- 初次建立的真实时间
    update_time 	TIMESTAMP NOT NULL                  -- 上次更新的真实更新时间
);
CREATE UNIQUE INDEX source_db.source_data__source__index ON source_data(source_site, source_id);

-- 来源信息中的books
CREATE TABLE source_db.source_book(
    id              INTEGER PRIMARY KEY,            -- id
    site            VARCHAR(16) NOT NULL,           -- 来源网站的代号
    code            TEXT COLLATE NOCASE NOT NULL,   -- book的区分编码，一般指book id
    title           TEXT COLLATE NOCASE NOT NULL    -- book标题
);
CREATE UNIQUE INDEX source_db.source_book__source__index ON source_book(site, code);

-- 来源信息与book的关联
CREATE TABLE source_db.source_book_relation(
    source_data_id  INTEGER NOT NULL,               -- source data id
    source_book_id  INTEGER NOT NULL                -- source book id
);
CREATE UNIQUE INDEX source_db.source_book__index ON source_book_relation(source_data_id, source_book_id);

-- 来源信息中的标签
CREATE TABLE source_db.source_tag(
    id              INTEGER PRIMARY KEY,
    site            VARCHAR(16) NOT NULL,           -- 来源网站的代号
    code            TEXT COLLATE NOCASE NOT NULL,   -- 标签编码
    name            TEXT COLLATE NOCASE NOT NULL,   -- 标签名称
    other_name      TEXT COLLATE NOCASE,            -- 标签的别名(如果有)
    type            TEXT COLLATE NOCASE             -- 标签在来源网站的分类名称(如果有)
);
CREATE UNIQUE INDEX source_db.source_tag__source_index ON source_tag(site, code);

-- 来源信息与标签的关联
CREATE TABLE source_db.source_tag_relation(
    source_data_id       INTEGER NOT NULL,               -- source data id
    source_tag_id        INTEGER NOT NULL                -- source tag id
);
CREATE UNIQUE INDEX source_db.source_tag__index ON source_tag_relation(source_data_id, source_tag_id);

-- 原始标签映射
CREATE TABLE source_db.source_tag_mapping(
    id                  INTEGER PRIMARY KEY,
    source_site         VARCHAR(16) NOT NULL,           -- 来源网站的代号
    source_tag_id       INTEGER NOT NULL,               -- 来源tag id
    target_meta_type    TINYINT NOT NULL,               -- 转换为什么类型的tag{0=TAG, 1=TOPIC, 2=AUTHOR}
    target_meta_id      INTEGER NOT NULL                -- 目标tag的tag id
);
CREATE INDEX source_db.source_tag_mapping__source__index ON source_tag_mapping(source_site, source_tag_id);
CREATE INDEX source_db.source_tag_mapping__target__index ON source_tag_mapping(target_meta_type, target_meta_id);

-- 来源信息手动标记
CREATE TABLE source_db.source_mark(
    source_data_id           INTEGER NOT NULL,       -- 此关系所属sourceData
    related_source_data_id   INTEGER NOT NULL,       -- 此关系指向的sourceData
    mark_type                TINYINT NOT NULL,       -- 标记类型
    record_time              TIMESTAMP NOT NULL      -- 记录时间
);
CREATE INDEX source_db.source_mark__index ON source_mark(source_data_id, related_source_data_id);


-- 文件
CREATE TABLE file_db.file(
    id 				INTEGER PRIMARY KEY AUTOINCREMENT, -- 自增ID
    folder 			VARCHAR(16) NOT NULL,           -- 所在文件夹名称::format<yyyy-MM-dd>，一般用其添加日期作为文件夹名称
    extension		VARCHAR(8) NOT NULL,            -- 文件扩展名，同时也表示此文件的类型

    size                BIGINT NOT NULL,            -- 此文件占用的磁盘大小，单位Byte
    thumbnail_size      BIGINT NOT NULL,            -- 缩略图占用的磁盘大小，单位Byte。没有缩略图时记0
    resolution_width    INTEGER NOT NULL,           -- 分辨率宽度
    resolution_height   INTEGER NOT NULL,           -- 分辨率高度

    status	        TINYINT NOT NULL,               -- 文件准备状态
    create_time 	TIMESTAMP NOT NULL,             -- 创建时间
    update_time     TIMESTAMP NOT NULL              -- 上次更新的时间
);

-- [系统表]导出任务
CREATE TABLE system_db.exporter_record(
    id                      INTEGER PRIMARY KEY,    -- 自增ID
    type                    TINYINT NOT NULL,       -- 任务类型
    key                     TEXT NOT NULL,          -- 任务唯一ID
    content                 TEXT NOT NULL,          -- 任务内容
    create_time             TIMESTAMP NOT NULL      -- 此任务建立的时间
);
CREATE INDEX system_db.exporter_record__index ON exporter_record(type, key);

-- [系统表]通用历史记录表
CREATE TABLE system_db.history_record(
    sequence_id         BIGINT NOT NULL,            -- 需要手动设置和重置的ID，按类型隔离
    type                TINYINT NOT NULL,           -- 目标类型
    key                 TEXT NOT NULL,              -- 目标标识
    record_time         BIGINT NOT NULL             -- 记录时间
);
CREATE UNIQUE INDEX system_db.history_record__index ON history_record(type, sequence_id);

-- find similar: 任务表
CREATE TABLE system_db.find_similar_task(
    id              INTEGER PRIMARY KEY,
    selector        TEXT NOT NULL,
    config          TEXT NOT NULL,
    record_time     TIMESTAMP NOT NULL
);

-- find similar: 结果表
CREATE TABLE system_db.find_similar_result(
    id              INTEGER PRIMARY KEY,
    summary_types   TINYINT NOT NULL,
    images          TEXT NOT NULL,
    relations       TEXT NOT NULL,
    sort_priority   INTEGER NOT NULL,
    record_time     TIMESTAMP NOT NULL
);

-- find similar: 忽略关系表
CREATE TABLE system_db.find_similar_ignored(
    id              INTEGER PRIMARY KEY,
    first_target    VARCHAR(16) NOT NULL,
    second_target   VARCHAR(16) NOT NULL,
    record_time     TIMESTAMP NOT NULL
);
CREATE INDEX system_db.find_similar_ignored__index ON find_similar_ignored(first_target, second_target);
CREATE INDEX system_db.find_similar_ignored_re__index ON find_similar_ignored(second_target, first_target);
