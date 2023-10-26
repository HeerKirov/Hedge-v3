
-- 业务逻辑调整，为collection也增加了"关联的book/folder"功能。
-- 由于BIR表已重度使用，不太适合继续使用该表记录BC关系。并且，由于BC关系仅在CollectionRelated处读取，仅由ImageRelated事件触发，
-- 可以与bookMember一同处理，因此为其增加一个cache字段即可。
ALTER TABLE illust ADD COLUMN cached_book_ids TEXT NULL;
ALTER TABLE illust ADD COLUMN cached_folder_ids TEXT NULL;
