use std::error::Error;
use reqwest::Method;
use serde::{Serialize, Deserialize};
use serde_json::json;
// use crate::module::import::SourceDataPath;
use crate::module::server::{ServerManager, ListResult};


pub struct SourceDataModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> SourceDataModule<'t> {
    pub fn new(server_manager: &'t ServerManager) -> SourceDataModule<'t> {
        SourceDataModule { server_manager }        
    }
    pub async fn query(&mut self, hql: Option<&str>, status: Option<Vec<&str>>, site: Option<Vec<&str>>, offset: Option<u32>, limit: Option<u32>) -> Result<ListResult<SourceDataRes>, Box<dyn Error>> {
        let mut query = Vec::new();
        if let Some(hql) = hql { query.push(("query", hql.to_string())) }
        if let Some(status) = status { query.push(("status", status.join(","))) }
        if let Some(site) = site { query.push(("site", site.join(","))) }
        if let Some(limit) = limit { query.push(("limit", limit.to_string())) }
        if let Some(offset) = offset { query.push(("offset", offset.to_string())) }
        self.server_manager.req_with_query(Method::GET, "/api/source-data", &query).await
    }
    pub async fn get(&mut self, source_site: &str, source_id: &str) -> Result<SourceDataDetailRes, Box<dyn Error>> {
        self.server_manager.req(Method::GET, format!("/api/source-data/{source_site}/{source_id}")).await
    }
    pub async fn create(&mut self, source_site: &str, source_id: &str, form: &SourceDataUpdateForm) -> Result<(), Box<dyn Error>> {
        let mut body = serde_json::to_value(form)?;
        body["sourceSite"] = json!(source_site);
        body["sourceId"] = json!(source_id);
        self.server_manager.req_without_res(Method::POST, format!("/api/source-data"), body).await
    }
    pub async fn update(&mut self, source_site: &str, source_id: &str, form: &SourceDataUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(form)?;
        self.server_manager.req_without_res(Method::PATCH, format!("/api/source-data/{source_site}/{source_id}"), body).await
    }
    pub async fn analyse_source_name(&mut self, filenames: &Vec<&str>) -> Result<Vec<SourceDataAnalyseResult>, Box<dyn Error>> {
        let body = serde_json::to_value(filenames)?;
        self.server_manager.req_with_body(Method::POST, format!("/api/source-data/analyse-name"), body).await
    }
}

#[derive(Deserialize)]
pub struct SourceDataRes {
    #[serde(rename = "sourceSite")]
    pub site: String,
    #[serde(rename = "sourceSiteName")]
    pub site_name: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    #[serde(rename = "tagCount")]
    pub tag_count: i32,
    #[serde(rename = "bookCount")]
    pub book_count: i32,
    #[serde(rename = "relationCount")]
    pub relation_count: i32,
    pub status: String,
    // pub empty: bool,
    // #[serde(rename = "createTime")]
    // pub create_time: String,
    // #[serde(rename = "updateTime")]
    // pub update_time: String
}

#[derive(Deserialize)]
pub struct SourceDataDetailRes {
    // #[serde(rename = "sourceSite")]
    // pub site: String,
    // #[serde(rename = "sourceSiteName")]
    // pub site_name: String,
    // #[serde(rename = "sourceId")]
    // pub source_id: i64,
    // pub title: String,
    // pub description: String,
    // pub tags: Vec<SourceTagDto>,
    // pub books: Vec<SourceBookDto>,
    // pub relations: Vec<i64>,
    // pub links: Vec<String>,
    // #[serde(rename = "additionalInfo")] 
    // pub additional_info: Vec<AdditionalInfoDto>,
    // pub empty: bool,
    pub status: String,
    // #[serde(rename = "createTime")]
    // pub create_time: String,
    // #[serde(rename = "updateTime")]
    // pub update_time: String
}

#[derive(Deserialize)]
pub struct SourceDataAnalyseResult {
    // pub filename: String,
    // pub source: Option<SourceDataPath>,
    #[serde(rename = "imageId")] 
    pub image_id: Option<i32>,
    pub error: Option<String>
}

// #[derive(Deserialize)]
// pub struct SourceTagDto {
//     pub code: String,
//     pub name: String,
//     #[serde(rename = "otherName")]
//     pub other_name: Option<String>,
//     #[serde(rename = "type")]
//     pub tag_type: Option<String>
// }

// #[derive(Deserialize)]
// pub struct SourceBookDto {
//     pub code: String,
//     pub title: String,
//     #[serde(rename = "otherTitle")]
//     pub other_title: Option<String>
// }

// #[derive(Deserialize)]
// pub struct AdditionalInfoDto {
//     pub field: String,
//     pub label: String,
//     pub value: String
// }

#[derive(Serialize)]
pub struct SourceDataUpdateForm {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<SourceTagForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub books: Option<Vec<SourceBookForm>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relations: Option<Vec<i64>>,
    #[serde(rename = "additionalInfo", skip_serializing_if = "Option::is_none")] 
    pub additional_info: Option<Vec<AdditionalInfoForm>>
}

#[derive(Serialize)]
pub struct SourceTagForm {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "otherName", skip_serializing_if = "Option::is_none")]
    pub other_name: Option<String>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>
}

#[derive(Serialize)]
pub struct SourceBookForm {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(rename = "otherTitle", skip_serializing_if = "Option::is_none")]
    pub other_title: Option<String>
}

#[derive(Serialize)]
pub struct AdditionalInfoForm {
    pub field: String,
    pub value: String
}
