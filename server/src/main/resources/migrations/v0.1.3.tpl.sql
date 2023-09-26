
-- 调整了dao层所有timestamp的实现，修正了问题，因此现有数据库的所有时间都需要手动调整。
-- 具体调整为追加用户当前时区的ZoneOffset。因为之前的用法错误，导致数据库中记录的时间比UTC时间多了一倍的ZoneOffset。
update illust set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update book set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update folder set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update import_image set create_time = create_time + ${OFFSET_EPOCHMILLS}, file_create_time = file_create_time + ${OFFSET_EPOCHMILLS}, file_update_time = file_update_time + ${OFFSET_EPOCHMILLS}, file_import_time = file_import_time + ${OFFSET_EPOCHMILLS};
update trashed_image set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS}, trashed_time = trashed_time + ${OFFSET_EPOCHMILLS};
update meta_db.tag set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update meta_db.author set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update meta_db.topic set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update meta_db.annotation set create_time = create_time + ${OFFSET_EPOCHMILLS};
update source_db.source_data set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update source_db.source_mark set record_time = record_time + ${OFFSET_EPOCHMILLS};
update file_db.file set create_time = create_time + ${OFFSET_EPOCHMILLS}, update_time = update_time + ${OFFSET_EPOCHMILLS};
update file_db.file_fingerprint set create_time = create_time + ${OFFSET_EPOCHMILLS};
update file_db.file_cache_record set last_access_time = last_access_time + ${OFFSET_EPOCHMILLS};
update system_db.exporter_record set create_time = create_time + ${OFFSET_EPOCHMILLS};
update system_db.find_similar_task set record_time = record_time + ${OFFSET_EPOCHMILLS};
update system_db.find_similar_result set record_time = record_time + ${OFFSET_EPOCHMILLS};
update system_db.find_similar_ignored set record_time = record_time + ${OFFSET_EPOCHMILLS};