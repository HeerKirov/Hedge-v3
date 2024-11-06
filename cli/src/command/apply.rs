use std::{path::PathBuf, io::stdin, error::Error};
use serde::Deserialize;
use crate::{module::api::{bulk::{AuthorBulkForm, BulkModule, SourceDataBulkForm, TagBulkForm, TopicBulkForm}, setting::{FindSimilarOptionUpdateForm, ImportOptionUpdateForm, MetaOptionUpdateForm, QueryOptionUpdateForm, ServerOptionUpdateForm, SettingModule, SourceSiteUpdateForm, StorageOptionUpdateForm}}, utils::error::ApplicationError};
use super::Context;

pub enum ApplyInputType {
    Directory(PathBuf),
    File(PathBuf),
    Input
}

pub async fn apply(context: &mut Context<'_>, input: &Vec<ApplyInputType>, verbose: bool) {
    if let Err(e) = context.server_manager.maintaining_for_start().await {
        eprintln!("Cannot establish connection to server. {}", e);
        return
    }

    let file = match read_input(input) {
        Ok(f) => f,
        Err(e) => {
            eprintln!("Apply input read error. {}", e);
            return
        }
    };

    let mut bulk_module = BulkModule::new(&context.server_manager);

    if let Some(source_data) = file.source_data {
        match bulk_module.source_data_bulk_update(&source_data).await {
            Err(e) => eprintln!("Bulk source-data failed. {}", e),
            Ok(result) => {
                println!("Bulk source-data: {} succeed, {} failed, {} errors.", result.success, result.failed, result.errors.len());
                if verbose && !result.errors.is_empty() {
                    println!("---");
                    for e in result.errors {
                        println!("Error {}-{}: [{}]{}", e.target.source_site, e.target.source_id, e.error.code, e.error.message);
                    }
                    println!("");
                }
            }
        }
    }
    if let Some(tags) = file.tags {
        match bulk_module.tag_bulk_update(&tags).await  {
            Err(e) => eprintln!("Bulk tags failed. {}", e),
            Ok(result) => {
                println!("Bulk tags: {} succeed, {} failed, {} errors.", result.success, result.failed, result.errors.len());
                if verbose && !result.errors.is_empty() {
                    println!("---");
                    for e in result.errors {
                        println!("Error {}: [{}]{}", e.target, e.error.code, e.error.message);
                    }
                    println!("");
                }
            }
        }
    }
    if let Some(topics) = file.topics {
        match bulk_module.topic_bulk_update(&topics).await  {
            Err(e) => eprintln!("Bulk topics failed. {}", e),
            Ok(result) => {
                println!("Bulk topics: {} succeed, {} failed, {} errors.", result.success, result.failed, result.errors.len());
                if verbose && !result.errors.is_empty() {
                    println!("---");
                    for e in result.errors {
                        println!("Error {}: [{}]{}", e.target, e.error.code, e.error.message);
                    }
                    println!("");
                }
            }
        }
    }
    if let Some(authors) = file.authors {
        match bulk_module.author_bulk_update(&authors).await  {
            Err(e) => eprintln!("Bulk authors failed. {}", e),
            Ok(result) => {
                println!("Bulk authors: {} succeed, {} failed, {} errors.", result.success, result.failed, result.errors.len());
                if verbose && !result.errors.is_empty() {
                    println!("---");
                    for e in result.errors {
                        println!("Error {}: [{}]{}", e.target, e.error.code, e.error.message);
                    }
                    println!("");
                }
            }
        }
    }
    if let Some(setting) = file.setting {
        let mut setting_module = SettingModule::new(&context.server_manager);

        if let Some(b) = setting.meta {
            match setting_module.set_meta_option(&b).await {
                Err(e) => eprintln!("Update setting.meta failed. {}", e),
                Ok(_) => println!("Update setting.meta succeed.")
            }
        }
        if let Some(b) = setting.query {
            match setting_module.set_query_option(&b).await {
                Err(e) => eprintln!("Update setting.query failed. {}", e),
                Ok(_) => println!("Update setting.query succeed.")
            }
        }
        if let Some(b) = setting.find_similar {
            match setting_module.set_find_similar_option(&b).await {
                Err(e) => eprintln!("Update setting.find_similar failed. {}", e),
                Ok(_) => println!("Update setting.find_similar succeed.")
            }
        }
        if let Some(b) = setting.storage {
            match setting_module.set_storage_option(&b).await {
                Err(e) => eprintln!("Update setting.storage failed. {}", e),
                Ok(_) => println!("Update setting.storage succeed.")
            }
        }
        if let Some(b) = setting.source_sites {
            match setting_module.set_source_sites(&b).await {
                Err(e) => eprintln!("Update setting.source_sites failed. {}", e),
                Ok(_) => println!("Update setting.source_sites succeed.")
            }
        }
        if let Some(b) = setting.import {
            match setting_module.set_import_option(&b).await {
                Err(e) => eprintln!("Update setting.import failed. {}", e),
                Ok(_) => println!("Update setting.import succeed.")
            }
        }
        if let Some(b) = setting.server {
            match setting_module.set_server_option(&b).await {
                Err(e) => eprintln!("Update setting.server failed. {}", e),
                Ok(_) => println!("Update setting.server succeed.")
            }
        }
    }
}

fn read_input(input: &Vec<ApplyInputType>) -> Result<ApplyFile, Box<dyn Error>> {
    let mut files: Vec<ApplyFile> = Vec::new();
    for i in input {
        match i {
            ApplyInputType::Directory(d) => files.append(&mut read_from_directory(d)?),
            ApplyInputType::File(f) => files.push(read_from_file(f)?),
            ApplyInputType::Input => files.push(read_from_input()?)
        }
    }
    if files.len() == 0 {
        Result::Err(Box::new(ApplicationError::new("apply files is empty.")))
    }else if files.len() == 1 {
        Result::Ok(files.pop().unwrap())
    }else{
        Result::Ok(reduce_apply_files(files)?)
    }
}

fn read_from_directory(d: &PathBuf) -> Result<Vec<ApplyFile>, Box<dyn Error>> {
    let mut files: Vec<ApplyFile> = Vec::new();
    for item in std::fs::read_dir(d)? {
        if let Ok(entry) = item {
            if entry.file_type()?.is_file() {
                let file_name = entry.file_name();
                let extension_str = PathBuf::from(&file_name).extension().unwrap().to_str().unwrap().to_lowercase();
                let extension = extension_str.as_str();
                if extension == "json" || extension == "yaml" || extension == "toml" {
                    let mut f = d.clone();
                    f.push(&file_name);
                    files.push(read_from_file(&f)?)
                }
            }
        }
    }
    Result::Ok(files)
}

fn read_from_file(f: &PathBuf) -> Result<ApplyFile, Box<dyn Error>> {
    let text = std::fs::read_to_string(f)?;
    let extension_str = f.extension().unwrap().to_str().unwrap().to_lowercase();
    let extension = extension_str.as_str();
    match extension {
        "json" => {
            let json: ApplyFile = serde_json::from_str(&text)?;
            Result::Ok(json)
        },
        "yaml" => {
            let yaml: ApplyFile = serde_yaml::from_str(&text)?;
            Result::Ok(yaml)
        },
        "toml" => {
            let toml: ApplyFile = toml::from_str(&text)?;
            Result::Ok(toml)
        },
        _ => Result::Err(Box::new(ApplicationError::new(&format!("Unsupported file type {}.", extension))))
    }
}

fn read_from_input() -> Result<ApplyFile, Box<dyn Error>> {
    let lines: Vec<String> = stdin().lines().map(|f| f.unwrap()).collect();
    let stdin = lines.join("\n");

    match serde_json::from_str(&stdin) {
        Err(e) => if e.is_data() {
            return Result::Err(Box::new(e));
        },
        Ok(json) => return Result::Ok(json)
    }

    if let Ok(json) = serde_yaml::from_str(&stdin) {
        return Result::Ok(json)
    }

    match toml::from_str(&stdin) {
        Err(e) => return Result::Err(Box::new(e)),
        Ok(json) => return Result::Ok(json)
    }
}

fn reduce_apply_files(mut files: Vec<ApplyFile>) -> Result<ApplyFile, Box<dyn Error>> {
    let mut ret_source_data: Vec<SourceDataBulkForm> = Vec::new(); 
    let mut ret_tags: Vec<TagBulkForm> = Vec::new(); 
    let mut ret_topics: Vec<TopicBulkForm> = Vec::new(); 
    let mut ret_authors: Vec<AuthorBulkForm> = Vec::new();
    let mut ret_settings: Vec<ApplyFileSetting> = Vec::new();

    while let Some(f) = files.pop() {
        if let Some(mut source_data) = f.source_data {
            ret_source_data.append(&mut source_data)
        }
        if let Some(mut tags) = f.tags {
            ret_tags.append(&mut tags)
        }
        if let Some(mut topics) = f.topics {
            ret_topics.append(&mut topics)
        }
        if let Some(mut authors) = f.authors {
            ret_authors.append(&mut authors)
        }
        if let Some(setting) = f.setting {
            ret_settings.push(setting)
        }
    }

    Result::Ok(ApplyFile { 
        source_data: if ret_source_data.is_empty() { Option::None }else{ Option::Some(ret_source_data) }, 
        tags: if ret_tags.is_empty() { Option::None }else{ Option::Some(ret_tags) }, 
        topics: if ret_topics.is_empty() { Option::None }else{ Option::Some(ret_topics) }, 
        authors: if ret_authors.is_empty() { Option::None }else{ Option::Some(ret_authors) },
        setting: reduce_apply_setting(ret_settings)?
    })
}

fn reduce_apply_setting(settings: Vec<ApplyFileSetting>) -> Result<Option<ApplyFileSetting>, Box<dyn Error>> {
    let mut ret = ApplyFileSetting {
        meta: Option::None,
        query: Option::None,
        import: Option::None,
        storage: Option::None,
        server: Option::None,
        find_similar: Option::None,
        source_sites: Option::None
    };

    
    for setting in settings {
        if let Some(server) = setting.server {
            if ret.server.is_none() {
                ret.server = Option::Some(server)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.server is declared multiple times.")))
            }
        }
        if let Some(storage) = setting.storage {
            if ret.storage.is_none() {
                ret.storage = Option::Some(storage)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.storage is declared multiple times.")))
            }
        }
        if let Some(query) = setting.query {
            if ret.query.is_none() {
                ret.query = Option::Some(query)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.query is declared multiple times.")))
            }
        }
        if let Some(meta) = setting.meta {
            if ret.meta.is_none() {
                ret.meta = Option::Some(meta)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.meta is declared multiple times.")))
            }
        }
        if let Some(import) = setting.import {
            if ret.import.is_none() {
                ret.import = Option::Some(import)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.import is declared multiple times.")))
            }
        }
        if let Some(find_similar) = setting.find_similar {
            if ret.find_similar.is_none() {
                ret.find_similar = Option::Some(find_similar)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.find_similar is declared multiple times.")))
            }
        }
        if let Some(sites) = setting.source_sites {
            if ret.source_sites.is_none() {
                ret.source_sites = Option::Some(sites)
            }else{
                return Result::Err(Box::new(ApplicationError::new("setting.source_sites is declared multiple times.")))
            }
        }
    }

    Result::Ok(if ret.meta.is_some() || ret.query.is_some() || ret.import.is_some() || ret.server.is_some() || ret.storage.is_some() || ret.find_similar.is_some() || ret.source_sites.is_some() { Option::Some(ret) }else{ Option::None })
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ApplyFile {
    #[serde(alias = "source_data", alias = "sourceData")]
    pub source_data: Option<Vec<SourceDataBulkForm>>,
    pub tags: Option<Vec<TagBulkForm>>,
    pub topics: Option<Vec<TopicBulkForm>>,
    pub authors: Option<Vec<AuthorBulkForm>>,
    pub setting: Option<ApplyFileSetting>
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ApplyFileSetting {
    pub meta: Option<MetaOptionUpdateForm>,
    pub query: Option<QueryOptionUpdateForm>,
    pub import: Option<ImportOptionUpdateForm>,
    pub storage: Option<StorageOptionUpdateForm>,
    pub server: Option<ServerOptionUpdateForm>,
    #[serde(alias = "find_similar", alias = "findSimilar")]
    pub find_similar: Option<FindSimilarOptionUpdateForm>,
    #[serde(alias = "source_sites", alias = "sites", alias = "sourceSites")]
    pub source_sites: Option<Vec<SourceSiteUpdateForm>>
}