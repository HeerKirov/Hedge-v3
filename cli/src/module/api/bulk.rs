use std::error::Error;
use reqwest::Method;
use serde::{Serialize, Deserialize};
use super::super::server::{ServerManager, ErrorResult};


pub struct BulkModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> BulkModule<'t> {
    pub fn new(server_manager: &'t ServerManager) -> BulkModule<'t> {
        BulkModule { server_manager }        
    }
    pub async fn source_data_bulk_update(&mut self, bulks: &Vec<SourceDataBulkForm>) -> Result<BulkResult<SourceDataIdentity>, Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_with_body(Method::POST, "/api/source-data/bulk", body).await
    }
    pub async fn tag_bulk_update(&mut self, bulks: &Vec<TagBulkForm>) -> Result<BulkResult<String>, Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_with_body(Method::POST, "/api/tags/bulk", body).await
    }
    pub async fn topic_bulk_update(&mut self, bulks: &Vec<TopicBulkForm>) -> Result<BulkResult<String>, Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_with_body(Method::POST, "/api/topics/bulk", body).await
    }
    pub async fn author_bulk_update(&mut self, bulks: &Vec<AuthorBulkForm>) -> Result<BulkResult<String>, Box<dyn Error>> {
        let body = serde_json::to_value(bulks)?;
        self.server_manager.req_with_body(Method::POST, "/api/authors/bulk", body).await
    }
}

#[derive(Deserialize)]
pub struct BulkResult<I> {
    pub success: i32,
    pub failed: i32,
    pub errors: Vec<BulkResultError<I>>
}

#[derive(Deserialize)]
pub struct BulkResultError<I> {
    pub target: I,
    pub error: ErrorResult
}

#[derive(Deserialize)]
pub struct SourceDataIdentity {
    #[serde(rename = "sourceSite")]
    pub source_site: String,
    #[serde(rename = "sourceId")]
    pub source_id: i64
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TagBulkForm {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rename: Option<String>,
    #[serde(rename = "otherNames", alias = "other_names", skip_serializing_if = "Option::is_none")]
    pub other_names: Option<Vec<String>>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>,
    #[serde(rename = "isSequenceGroup", alias = "is_sequence_group", skip_serializing_if = "Option::is_none")]
    pub is_sequence_group: Option<bool>,
    #[serde(rename = "isOverrideGroup", alias = "is_override_group", skip_serializing_if = "Option::is_none")]
    pub is_override_group: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(rename = "mappingSourceTags", alias = "mapping_source_tags", alias = "mapping", skip_serializing_if = "Option::is_none")]
    pub mapping_source_tags: Option<Vec<MappingSourceTagForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<Box<TagBulkForm>>>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct TopicBulkForm {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rename: Option<String>,
    #[serde(rename = "otherNames", alias = "other_names", skip_serializing_if = "Option::is_none")]
    pub other_names: Option<Vec<String>>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favorite: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<i32>,
    #[serde(rename = "mappingSourceTags", alias = "mapping_source_tags", alias = "mapping", skip_serializing_if = "Option::is_none")]
    pub mapping_source_tags: Option<Vec<MappingSourceTagForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<Box<TopicBulkForm>>>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AuthorBulkForm {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rename: Option<String>,
    #[serde(rename = "otherNames", alias = "other_names", skip_serializing_if = "Option::is_none")]
    pub other_names: Option<Vec<String>>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub keywords: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favorite: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<i32>,
    #[serde(rename = "mappingSourceTags", alias = "mapping_source_tags", alias = "mapping", skip_serializing_if = "Option::is_none")]
    pub mapping_source_tags: Option<Vec<MappingSourceTagForm>>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceDataBulkForm {
    #[serde(rename = "sourceSite", alias = "source_site", alias = "site")]
    pub source_site: String,
    #[serde(rename = "sourceId", alias = "source_id", alias = "id")]
    pub source_id: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<SourceTagForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub books: Option<Vec<SourceBookForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relations: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<String>>,
    #[serde(rename = "additionalInfo", alias = "additional_info", skip_serializing_if = "Option::is_none")] 
    pub additional_info: Option<Vec<AdditionalInfoForm>>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceTagForm {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "otherName", alias = "other_name", skip_serializing_if = "Option::is_none")]
    pub other_name: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SourceBookForm {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "otherTitle", alias = "other_title", skip_serializing_if = "Option::is_none")]
    pub other_title: Option<String>
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct AdditionalInfoForm {
    pub field: String,
    pub value: String
}

#[derive(Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct MappingSourceTagForm {
    pub site: String,
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "otherName", alias = "other_name", skip_serializing_if = "Option::is_none")]
    pub other_name: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>
}
