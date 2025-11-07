use std::error::Error;
use reqwest::Method;
use serde::Serialize;
use crate::module::server::{ServerManager, IdRes};


pub struct FolderModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> FolderModule<'t> {
    pub fn new(server_manager: &'t ServerManager) -> FolderModule<'t> {
        FolderModule { server_manager }        
    }
    pub async fn create(&mut self, form: &FolderCreateForm) -> Result<IdRes, Box<dyn Error>> {
        let body = serde_json::to_value(form)?;
        self.server_manager.req_with_body(Method::POST, format!("/api/folders"), body).await
    }
    pub async fn _update(&mut self, folder_id: i32, form: &FolderUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(form)?;
        self.server_manager.req_without_res(Method::PATCH, format!("/api/folders/{folder_id}"), body).await
    }
    pub async fn _partial_update_images(&mut self, folder_id: i32, form: &FolderImagesPartialUpdateForm) -> Result<(), Box<dyn Error>> {
        let body = serde_json::to_value(form)?;
        self.server_manager.req_without_res(Method::PATCH, format!("/api/folders/{folder_id}/images"), body).await
    }
}

// #[derive(Deserialize)]
// pub struct FolderRes {
//     pub id: i32,
//     pub title: String,
//     #[serde(rename = "type")]
//     pub folder_type: String,
//     #[serde(rename = "imageCount")]
//     pub image_count: Option<i32>,
//     pub pinned: bool,
//     pub children: Option<Vec<FolderRes>>,
//     #[serde(rename = "createTime")]
//     pub create_time: String,
//     #[serde(rename = "updateTime")]
//     pub update_time: String
// }


#[derive(Serialize)]
pub struct FolderCreateForm {
    pub title: String,
    #[serde(rename = "type")]
    pub folder_type: String,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordinal: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<i32>>
}

#[derive(Serialize)]
pub struct FolderUpdateForm {
    pub title: String,
    #[serde(rename = "parentId", skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordinal: Option<u32>
}

#[derive(Serialize)]
pub struct FolderImagesPartialUpdateForm {
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<i32>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ordinal: Option<u32>
}
