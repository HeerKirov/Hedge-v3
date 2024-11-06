use std::{error::Error, collections::HashMap};
use reqwest::Method;
use serde::{Deserialize, Serialize};
use crate::module::server::ServerManager;


pub struct SettingModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> SettingModule<'t> {
    pub fn new(server_manager: &'t ServerManager) -> SettingModule {
        SettingModule { server_manager }        
    }
    pub async fn _get_server_option(&mut self) -> Result<ServerOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/server").await
    }
    pub async fn _get_storage_option(&mut self) -> Result<StorageOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/file").await
    }
    pub async fn _get_find_similar_option(&mut self) -> Result<FindSimilarOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/find-similar").await
    }
    pub async fn _get_query_option(&mut self) -> Result<QueryOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/query").await
    }
    pub async fn _get_meta_option(&mut self) -> Result<MetaOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/meta").await
    }
    pub async fn _get_import_option(&mut self) -> Result<ImportOption, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/import").await
    }
    pub async fn _get_source_sites(&mut self) -> Result<Vec<SourceSite>, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/setting/source/sites").await
    }
    pub async fn set_server_option(&mut self, bulks: &ServerOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/server", body).await
    }
    pub async fn set_storage_option(&mut self, bulks: &StorageOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/file", body).await
    }
    pub async fn set_find_similar_option(&mut self, bulks: &FindSimilarOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/find-similar", body).await
    }
    pub async fn set_query_option(&mut self, bulks: &QueryOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/query", body).await
    }
    pub async fn set_meta_option(&mut self, bulks: &MetaOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/meta", body).await
    }
    pub async fn set_import_option(&mut self, bulks: &ImportOptionUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PATCH, "/api/setting/import", body).await
    }
    pub async fn set_source_sites(&mut self, bulks: &Vec<SourceSiteUpdateForm>) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_without_res(Method::PUT, "/api/setting/source/sites", body).await
    }
}

#[derive(Deserialize)]
pub struct ServerOption {
    #[serde(rename = "port")]
    pub port: Option<String>,
    #[serde(rename = "token")]
    pub token: Option<String>,
    #[serde(rename = "timeOffsetHour")]
    pub time_offset_hour: Option<i32>
}

#[derive(Deserialize)]
pub struct StorageOption {
    #[serde(rename = "storagePath")]
    pub storage_path: Option<String>,
    #[serde(rename = "autoCleanTrashes")]
    pub auto_clean_trashes: bool,
    #[serde(rename = "autoCleanTrashesIntervalDay")]
    pub auto_clean_trashes_interval_day: i32,
    #[serde(rename = "blockMaxSizeMB")]
    pub block_max_size: i64,
    #[serde(rename = "blockMaxCount")]
    pub block_max_count: i32
}

#[derive(Deserialize)]
pub struct FindSimilarOption {
    #[serde(rename = "autoFindSimilar")]
    pub auto_find_similar: bool,
    #[serde(rename = "autoTaskConf")]
    pub auto_task_conf: Option<FindSimilarTaskConfig>,
    #[serde(rename = "defaultTaskConf")]
    pub default_task_conf: FindSimilarTaskConfig,
}

#[derive(Deserialize)]
pub struct QueryOption {
    #[serde(rename = "chineseSymbolReflect")]
    pub chinese_symbol_reflect: bool,
    #[serde(rename = "translateUnderscoreToSpace")]
    pub translate_underscore_to_space: bool,
    #[serde(rename = "queryLimitOfQueryItems")]
    pub query_limit_of_query_items: i32,
    #[serde(rename = "warningLimitOfUnionItems")]
    pub warning_limit_of_union_items: i32,
    #[serde(rename = "warningLimitOfIntersectItems")]
    pub warning_limit_of_intersect_items: i32
}

#[derive(Deserialize)]
pub struct MetaOption {
    #[serde(rename = "autoCleanTagme")]
    pub auto_clean_tagme: bool,
    #[serde(rename = "onlyCharacterTopic")]
    pub only_character_topic: bool,
    #[serde(rename = "resolveTagConflictByParent")]
    pub resolve_tag_conflict_by_parent: bool,
    #[serde(rename = "bindingPartitionWithOrderTime")]
    pub binding_partition_with_order_time: bool,
    #[serde(rename = "tuningOrderTime")]
    pub tuning_order_time: bool,
    #[serde(rename = "centralizeCollection")]
    pub centralize_collection: bool,
    #[serde(rename = "topicColors")]
    pub topic_colors: HashMap<String, String>,
    #[serde(rename = "authorColors")]
    pub author_colors: HashMap<String, String>
}

#[derive(Deserialize)]
pub struct ImportOption {
    #[serde(rename = "autoAnalyseSourceData")]
    pub auto_analyse_source_data: bool,
    #[serde(rename = "preventNoneSourceData")]
    pub prevent_none_source_data: bool,
    #[serde(rename = "autoReflectMetaTag")]
    pub auto_reflect_meta_tag: bool,
    #[serde(rename = "reflectMetaTagType")]
    pub reflect_meta_tag_type: Vec<String>,
    #[serde(rename = "autoConvertFormat")]
    pub auto_convert_format: bool,
    #[serde(rename = "autoConvertPNGThresholdSizeMB")]
    pub auto_convert_png_threshold_size_mb: i64,
    #[serde(rename = "setTagmeOfTag")]
    pub set_tagme_of_tag: bool,
    #[serde(rename = "setTagmeOfSource")]
    pub set_tagme_of_source: bool,
    #[serde(rename = "setOrderTimeBy")]
    pub set_order_time_by: String,
    #[serde(rename = "sourceAnalyseRules")]
    pub source_analyse_rules: Vec<SourceAnalyseRule>
}

#[derive(Deserialize)]
pub struct SourceSite {
    pub name: String,
    pub title: String,
    #[serde(rename = "idMode")]
    pub id_mode: String,
    #[serde(rename = "partMode")]
    pub part_mode: String,
    #[serde(rename = "additionalInfo")]
    pub additional_info: Vec<AdditionalInfo>,
    #[serde(rename = "sourceLinkRules")]
    pub source_link_rules: Vec<String>,
    #[serde(rename = "tagTypes")]
    pub tag_types: Vec<String>,
    #[serde(rename = "tagTypeMappings")]
    pub tag_type_mappings: Vec<HashMap<String, String>>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ServerOptionUpdateForm {
    #[serde(rename = "port", skip_serializing_if = "Option::is_none")]
    pub port: Option<String>,
    #[serde(rename = "token", skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(rename = "timeOffsetHour", alias = "time_offset_hour", skip_serializing_if = "Option::is_none")]
    pub time_offset_hour: Option<i32>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct StorageOptionUpdateForm {
    #[serde(rename = "storagePath", skip_serializing_if = "Option::is_none")]
    pub storage_path: Option<String>,
    #[serde(rename = "autoCleanTrashes", alias = "auto_clean_trashes", skip_serializing_if = "Option::is_none")]
    pub auto_clean_trashes: Option<bool>,
    #[serde(rename = "autoCleanTrashesIntervalDay", alias = "auto_clean_trashes_interval_day", skip_serializing_if = "Option::is_none")]
    pub auto_clean_trashes_interval_day: Option<i32>,
    #[serde(rename = "blockMaxSizeMB", alias = "block_max_size", skip_serializing_if = "Option::is_none")]
    pub block_max_size: Option<i64>,
    #[serde(rename = "blockMaxCount", alias = "block_max_count", skip_serializing_if = "Option::is_none")]
    pub block_max_count: Option<i32>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct FindSimilarOptionUpdateForm {
    #[serde(rename = "autoFindSimilar", alias = "auto_find_similar", skip_serializing_if = "Option::is_none")]
    pub auto_find_similar: Option<bool>,
    #[serde(rename = "autoTaskConf", alias = "auto_task_conf", skip_serializing_if = "Option::is_none")]
    pub auto_task_conf: Option<FindSimilarTaskConfig>,
    #[serde(rename = "defaultTaskConf", alias = "default_task_conf", skip_serializing_if = "Option::is_none")]
    pub default_task_conf: Option<FindSimilarTaskConfig>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct QueryOptionUpdateForm {
    #[serde(rename = "chineseSymbolReflect", alias = "chinese_symbol_reflect", skip_serializing_if = "Option::is_none")]
    pub chinese_symbol_reflect: Option<bool>,
    #[serde(rename = "translateUnderscoreToSpace", alias = "translate_underscore_to_space", skip_serializing_if = "Option::is_none")]
    pub translate_underscore_to_space: Option<bool>,
    #[serde(rename = "queryLimitOfQueryItems", alias = "query_limit_of_query_items", skip_serializing_if = "Option::is_none")]
    pub query_limit_of_query_items: Option<i32>,
    #[serde(rename = "warningLimitOfUnionItems", alias = "warning_limit_of_union_items", skip_serializing_if = "Option::is_none")]
    pub warning_limit_of_union_items: Option<i32>,
    #[serde(rename = "warningLimitOfIntersectItems", alias = "warning_limit_of_intersect_items", skip_serializing_if = "Option::is_none")]
    pub warning_limit_of_intersect_items: Option<i32>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct MetaOptionUpdateForm {
    #[serde(rename = "autoCleanTagme", alias = "auto_clean_tagme", skip_serializing_if = "Option::is_none")]
    pub auto_clean_tagme: Option<bool>,
    #[serde(rename = "onlyCharacterTopic", alias = "only_character_topic", skip_serializing_if = "Option::is_none")]
    pub only_character_topic: Option<bool>,
    #[serde(rename = "resolveTagConflictByParent", alias = "resolve_tag_conflict_by_parent", skip_serializing_if = "Option::is_none")]
    pub resolve_tag_conflict_by_parent: Option<bool>,
    #[serde(rename = "bindingPartitionWithOrderTime", alias = "binding_partition_with_order_time", skip_serializing_if = "Option::is_none")]
    pub binding_partition_with_order_time: Option<bool>,
    #[serde(rename = "tuningOrderTime", alias = "tuning_order_time", skip_serializing_if = "Option::is_none")]
    pub tuning_order_time: Option<bool>,
    #[serde(rename = "centralizeCollection", alias = "centralize_collection", skip_serializing_if = "Option::is_none")]
    pub centralize_collection: Option<bool>,
    #[serde(rename = "topicColors", alias = "topic_colors", skip_serializing_if = "Option::is_none")]
    pub topic_colors: Option<HashMap<String, String>>,
    #[serde(rename = "authorColors", alias = "author_colors", skip_serializing_if = "Option::is_none")]
    pub author_colors: Option<HashMap<String, String>>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct ImportOptionUpdateForm {
    #[serde(rename = "autoAnalyseSourceData", alias = "auto_analyse_source_data", skip_serializing_if = "Option::is_none")]
    pub auto_analyse_source_data: Option<bool>,
    #[serde(rename = "preventNoneSourceData", alias = "prevent_none_source_data", skip_serializing_if = "Option::is_none")]
    pub prevent_none_source_data: Option<bool>,
    #[serde(rename = "autoReflectMetaTag", alias = "auto_reflect_meta_tag", skip_serializing_if = "Option::is_none")]
    pub auto_reflect_meta_tag: Option<bool>,
    #[serde(rename = "reflectMetaTagType", alias = "reflect_meta_tag_type", skip_serializing_if = "Option::is_none")]
    pub reflect_meta_tag_type: Option<Vec<String>>,
    #[serde(rename = "autoConvertFormat", alias = "auto_convert_format", skip_serializing_if = "Option::is_none")]
    pub auto_convert_format: Option<bool>,
    #[serde(rename = "autoConvertPNGThresholdSizeMB", alias = "auto_convert_png_threshold_size_mb", skip_serializing_if = "Option::is_none")]
    pub auto_convert_png_threshold_size_mb: Option<i64>,
    #[serde(rename = "setTagmeOfTag", alias = "set_tagme_of_tag", skip_serializing_if = "Option::is_none")]
    pub set_tagme_of_tag: Option<bool>,
    #[serde(rename = "setTagmeOfSource", alias = "set_tagme_of_source", skip_serializing_if = "Option::is_none")]
    pub set_tagme_of_source: Option<bool>,
    #[serde(rename = "setOrderTimeBy", alias = "set_order_time_by", skip_serializing_if = "Option::is_none")]
    pub set_order_time_by: Option<String>,
    #[serde(rename = "sourceAnalyseRules", alias = "source_analyse_rules", skip_serializing_if = "Option::is_none")]
    pub source_analyse_rules: Option<Vec<SourceAnalyseRule>>
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct SourceSiteUpdateForm {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "idMode", alias = "id_mode", skip_serializing_if = "Option::is_none")]
    pub id_mode: Option<String>,
    #[serde(rename = "partMode", alias = "part_mode", skip_serializing_if = "Option::is_none")]
    pub part_mode: Option<String>,
    #[serde(rename = "additionalInfo", alias = "additional_info", skip_serializing_if = "Option::is_none")]
    pub additional_info: Option<Vec<AdditionalInfo>>,
    #[serde(rename = "sourceLinkRules", alias = "source_link_rules", skip_serializing_if = "Option::is_none")]
    pub source_link_rules: Option<Vec<String>>,
    #[serde(rename = "tagTypes", alias = "tag_types", skip_serializing_if = "Option::is_none")]
    pub tag_types: Option<Vec<String>>,
    #[serde(rename = "tagTypeMappings", alias = "tag_type_mappings", skip_serializing_if = "Option::is_none")]
    pub tag_type_mappings: Option<HashMap<String, String>>
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct FindSimilarTaskConfig {
    #[serde(rename = "findBySourceIdentity", alias = "find_by_source_identity")]
    pub find_by_source_identity: bool,
    #[serde(rename = "findBySourceRelation", alias = "find_by_source_relation")]
    pub find_by_source_relation: bool,
    #[serde(rename = "findBySourceMark", alias = "find_by_source_mark")]
    pub find_by_source_mark: bool,
    #[serde(rename = "findBySimilarity", alias = "find_by_similarity")]
    pub find_by_similarity: bool,
    #[serde(rename = "filterByOtherImport", alias = "filter_by_other_import")]
    pub filter_by_other_import: bool,
    #[serde(rename = "filterByPartition", alias = "filter_by_partition")]
    pub filter_by_partition: bool,
    #[serde(rename = "filterByTopic", alias = "filter_by_topic")]
    pub filter_by_topic: bool,
    #[serde(rename = "filterByAuthor", alias = "filter_by_author")]
    pub filter_by_author: bool,
    #[serde(rename = "filterBySourceTagType", alias = "filter_by_source_tag_type")]
    pub filter_by_source_tag_type: Vec<FindSimilarTaskConfigSourceTagType>
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct FindSimilarTaskConfigSourceTagType {
    #[serde(rename = "sourceSite", alias = "source_site")]
    pub source_site: String,
    #[serde(rename = "tagType", alias = "tag_type")]
    pub tag_type: String
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct SourceAnalyseRule {
    pub site: String,
    pub regex: String,
    #[serde(rename = "idGroup", alias = "id_group")]
    pub id_group: String,
    #[serde(rename = "partGroup", alias = "part_group")]
    pub part_group: Option<String>,
    #[serde(rename = "partNameGroup", alias = "part_name_group")]
    pub part_name_group: Option<String>,
    pub extras: Option<Vec<SourceAnalyseRuleExtra>>
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct SourceAnalyseRuleExtra {
    pub group: String,
    pub target: String,
    pub optional: bool,
    #[serde(rename = "tagType", alias = "tag_type")]
    pub tag_type: Option<String>,
    #[serde(rename = "additionalInfoField", alias = "additional_info_field")]
    pub additional_info_field: Option<String>,
    #[serde(rename = "translateUnderscoreToSpace", alias = "translate_underscore_to_space")]
    pub translate_underscore_to_space: Option<bool>
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(deny_unknown_fields)]
pub struct AdditionalInfo {
    pub field: String,
    pub label: String
}
