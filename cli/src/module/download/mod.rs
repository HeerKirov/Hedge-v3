mod sankakucomplex;

use std::{time::Duration, error::Error, collections::HashMap};
use reqwest::{Method, IntoUrl, RequestBuilder, Proxy, Response};
use serde::Serialize;
use crate::utils::error::ApplicationError;
use super::{config::LocalConfig, api::source_data::{SourceDataUpdateForm, SourceTagForm, SourceBookForm, AdditionalInfoForm}};
use sankakucomplex::download_for_sankakucomplex;


pub struct DownloadModule {
    adapter: Adapter,
    available_sites: HashMap<String, String>
}

impl DownloadModule {
    pub fn new(config: &LocalConfig) -> DownloadModule {
        let mut client_builder = reqwest::Client::builder();
        if let Some(proxy) = &config.download.proxy {
            client_builder = client_builder.proxy(Proxy::all(proxy).unwrap());
        }
        let adapter = Adapter {
            client: client_builder.build().unwrap(),
            timeout: config.download.timeout_interval.unwrap_or(20),
            waiting: config.download.waiting_interval.unwrap_or(8)
        };
        let mut available_sites: HashMap<String, String> = HashMap::new();
        for ele in &config.download.available_sites {
            available_sites.insert(ele.site.clone(), ele.rule.clone());
        }
        
        DownloadModule { 
            adapter,
            available_sites
        }
    }
    pub async fn download(&self, site: &str, source_id: i64, _additional_info: Option<&HashMap<String, String>>) -> Result<(DownloadResult, DownloadAttachInfo), Box<dyn Error>> {
        if let Some(rule) = self.available_sites.get(site) {
            if rule == "sankakucomplex" {
                download_for_sankakucomplex(&self.adapter, source_id).await
            }else{
                Result::Err(Box::new(ApplicationError::new(&format!("Unsupported rule type {}.", rule))))
            }
        }else{
            Result::Err(Box::new(ApplicationError::new(&format!("Site {} not configured in available sites.", site))))
        }
    }
    pub async fn wait(&self, time_cost: i64) {
        let cost = (time_cost / 1000) as u64;
        let waiting = if self.adapter.waiting - cost > self.adapter.waiting / 2 { self.adapter.waiting - cost }else{ self.adapter.waiting / 2 };
        async_std::task::sleep(Duration::from_secs(waiting)).await;
    }
}

pub struct Adapter {
    client: reqwest::Client,
    waiting: u64,
    timeout: u64
}

impl Adapter {
    fn req<U : IntoUrl>(&self, method: Method, url: U) -> RequestBuilder {
        self.client.request(method, url)
            .header("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36")
            .header("Accept-Encoding", "gzip, deflate")
            .header("Accept", "*/*")
            .header("Connection", "keep-alive")
            .timeout(Duration::from_secs(self.timeout))
    }
    async fn try_req<U : IntoUrl + Copy>(&self, method: Method, url: U) -> Result<(Response, i32), Box<dyn Error>> {
        let mut retry_cnt = 0;
        let mut error: Option<reqwest::Error> = Option::None;
        while retry_cnt < 3 {
            let response = self.req(method.clone(), url).send().await;
            match response {
                Ok(ok) => return Result::Ok((ok, retry_cnt)),
                Err(e) => {
                    if e.is_connect() || e.is_timeout() {
                        error = Option::Some(e);
                        retry_cnt += 1;
                    }else{
                        return Result::Err(Box::new(e));
                    }
                }
            }
            async_std::task::sleep(Duration::from_secs(1)).await;
        }
        return Result::Err(Box::new(error.unwrap()));
    }
}

pub struct DownloadAttachInfo {
    pub retry_count: i32,
    pub time_cost: i64
}

#[derive(Serialize, Debug)]
pub struct DownloadResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<DownloadTag>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub books: Option<Vec<DownloadBook>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relations: Option<Vec<i64>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub additional_info: Option<HashMap<String, String>>
}

#[derive(Serialize, Debug)]
pub struct DownloadTag {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tag_type: Option<String>
}

#[derive(Serialize, Debug)]
pub struct DownloadBook {
    pub code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub other_title: Option<String>
}

impl DownloadResult {
    pub fn to_update_form(&self) -> SourceDataUpdateForm {
        SourceDataUpdateForm {
            title: self.title.clone(),
            description: self.description.clone(),
            tags: self.tags.as_ref().map(|tags| tags.iter().map(|tag| SourceTagForm { code: tag.code.clone(), name: tag.name.clone(), other_name: tag.other_name.clone(), tag_type: tag.tag_type.clone() }).collect()),
            books: self.books.as_ref().map(|books| books.iter().map(|book| SourceBookForm { code: book.code.clone(), title: book.title.clone(), other_title: book.other_title.clone() }).collect()),
            relations: self.relations.clone(),
            status: Option::None,
            links: Option::None,
            additional_info: self.additional_info.as_ref().map(|info| info.iter().map(|(k, v)| AdditionalInfoForm { field: k.clone(), value: v.clone() }).collect())
        }
    }
    pub fn info(&self) -> String {
        let title = self.title.as_ref().map(|t| format!("<{}>", t)).unwrap_or("".to_string());
        let info = self.additional_info.as_ref().map(|f| format!("{} {} {}", '{', f.iter().map(|(k, v)| format!("{} = {}", k, v)).collect::<Vec<String>>().join(", "), '}')).unwrap_or("".to_string());
        let tag_count = self.tags.as_ref().map(|f| format!("{} tags", f.len()));
        let book_count = self.books.as_ref().map(|f| format!("{} books", f.len()));
        let relation_count = self.relations.as_ref().map(|f| format!("{} relations", f.len()));
        let counts = vec![tag_count, book_count, relation_count].iter().filter_map(|f| f.as_ref()).map(|f| f.as_str()).collect::<Vec<&str>>().join(", ");
        let r = vec![title, info, counts];
        let ret: Vec<&str> = r.iter().filter_map(|f| if f.is_empty() { Option::Some(f.as_str()) }else{ Option::None }).collect();
        ret.join(" ")
    }
}