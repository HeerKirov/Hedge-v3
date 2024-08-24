use std::{path::PathBuf, error::Error};
use chrono::NaiveDate;
use clap::ValueEnum;
use reqwest::{multipart::{Form, Part}, Body, Method};
use serde::{Deserialize, Serialize};
use serde_json::json;
use super::server::{IdRes, ListResult, ServerManager};
use tokio::fs::File;
use tokio_util::codec::{BytesCodec, FramedRead};

pub struct ImportModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> ImportModule <'t> {
    pub fn new(server_manager: &ServerManager) -> ImportModule {
        ImportModule { server_manager }
    }
    pub async fn list(&mut self) -> Result<ListResult<ImportImageRes>, Box<dyn Error>> {
        self.server_manager.req(Method::GET, "/api/imports").await
    }
    pub async fn add(&mut self, filepath: &PathBuf, remove: bool) -> Result<IdRes, Box<dyn Error>> {
        if self.server_manager.access.remote_mode {
            let file = File::open(filepath).await?;
            let stream = FramedRead::new(file, BytesCodec::new());
            let file_body = Body::wrap_stream(stream);
            let file_part = Part::stream(file_body)
                .file_name(filepath.file_name().unwrap().to_str().unwrap().to_string());

            let metadata = std::fs::metadata(filepath)?;
            let modified: chrono::DateTime<chrono::Utc> = metadata.modified()?.into();
            let created: Option<chrono::DateTime<chrono::Utc>> = metadata.created().ok().map(|t| t.into());

            let form = Form::new()
                .part("file", file_part)
                .text("creationTime", created.map(|f| f.to_rfc3339()).unwrap_or_else(|| modified.to_rfc3339()))
                .text("modificationTime", modified.to_rfc3339());
            self.server_manager.req_with_form(Method::POST, "/api/imports/upload", form).await
        }else{
            let body = json!({
                "filepath": filepath.to_str().unwrap(),
                "mobileImport": remove
            });
            self.server_manager.req_with_body(Method::POST, "/api/imports/import", body).await
        }
    }
    pub async fn batch(&mut self, partition_time: Option<NaiveDate>, create_time: Option<OrderTimeType>, order_time: Option<OrderTimeType>, analyse_source: bool) -> Result<(), Box<dyn Error>> {
        let body = json!({
            "setCreateTimeBy": create_time.map(|f| f.to_json_code()),
            "setOrderTimeBy": order_time.map(|f| f.to_json_code()),
            "analyseSource": analyse_source,
            "partitionTime": partition_time.map(|p| p.format("%Y-%m-%d").to_string())
        });
        self.server_manager.req_without_res(Method::POST, "/api/imports/batch-update", body).await
    }
    pub async fn save(&mut self) -> Result<ImportSaveRes, Box<dyn Error>> {
        let body = json!({
            "target": Option::<Vec<i32>>::None
        });
        self.server_manager.req_with_body(Method::POST, "/api/imports/save", body).await
    }
}

#[derive(Clone, ValueEnum)]
pub enum OrderTimeType {
    CreateTime,
    UpdateTime,
    ImportTime
}

impl OrderTimeType {
    fn to_json_code(&self) -> &'static str {
        match self {
            Self::CreateTime => "CREATE_TIME",
            Self::UpdateTime => "UPDATE_TIME",
            Self::ImportTime => "IMPORT_TIME"
        }
    }
}

#[derive(Deserialize, Serialize)]
pub struct SourceDataPath {
    #[serde(rename = "sourceSite", alias = "source_site", alias = "id")]
    pub source_site: String,
    #[serde(rename = "sourceId", alias = "source_id", alias = "id")]
    pub source_id: i64,
    #[serde(rename = "sourcePart", alias = "source_part", alias = "part")]
    pub source_part: Option<i32>,
    #[serde(rename = "sourcePartName", alias = "source_part_name", alias = "part_name")]
    pub source_part_name: Option<String>
}

#[derive(Deserialize)]
pub struct NullableFilePath {
    pub original: String,
    pub thumbnail: Option<String>,
    pub sample: Option<String>
}

#[derive(Deserialize)]
pub struct ImportImageRes {
    pub id: i32,
    #[serde(rename = "filePath")]
    pub file_path: NullableFilePath,
    pub source: Option<SourceDataPath>,
    pub tagme: Vec<String>,
    #[serde(rename = "originFileName")]
    pub file_name: Option<String>,
    #[serde(rename = "partitionTime")]
    pub partition_time: String,
    #[serde(rename = "orderTime")]
    pub order_time: String
}

#[derive(Deserialize)]
pub struct ImportSaveRes {
    pub total: i32,
    pub errors: Vec<ImportSaveErrorItem>
}

#[derive(Deserialize)]
pub struct ImportSaveErrorItem {
    #[serde(rename = "importId")]
    pub import_id: i32,
    #[serde(rename = "fileNotReady")]
    pub file_not_ready: bool,
    #[serde(rename = "notExistedCollectionId")]
    pub not_existed_collection_id: Option<i32>,
    #[serde(rename = "notExistedCloneImageId")]
    pub not_existed_clone_image_id: Option<i32>,
    #[serde(rename = "notExistedBookIds")]
    pub not_existed_book_ids: Option<Vec<i32>>,
    #[serde(rename = "notExistedFolderIds")]
    pub not_existed_folder_ids: Option<Vec<i32>>
}