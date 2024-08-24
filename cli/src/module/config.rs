use std::{fs, env, path, io::ErrorKind, collections::HashMap};
use serde::Deserialize;
use home::home_dir;

pub fn load_config() -> LocalConfig {
    let local_config_path = match env::var_os("LOCAL_CONFIG_PATH") {
        Some(p) => p.to_str().unwrap().to_string(),
        None => userdata_path().join("cli/config.toml").to_str().unwrap().to_string()
    };
    let local_config_text = match fs::read_to_string(&local_config_path) {
        Ok(data) => Option::Some(data),
        Err(e) => if e.kind() == ErrorKind::NotFound {
            Option::None
        }else{
            panic!("Cannot load local config {}: {}", &local_config_path, e)
        }
    };
    let data: LocalConfigFile = match local_config_text {
        Some(text) => match toml::from_str(&*text) {
           Ok(data) => data,
           Err(e) => panic!("Local config format error: {}", e)
        }
        None => default_config_file()
    };

    LocalConfig {
        debug_mode: data.debug_mode.unwrap_or(false),
        work_path: WorkPath { 
            application_path: data.work_path.application_path.map(path::PathBuf::from),
            userdata_path: data.work_path.userdata_path.as_ref().map(path::PathBuf::from).unwrap_or_else(|| userdata_path()),
            server_path: data.work_path.server_path.as_ref().map(path::PathBuf::from).unwrap_or_else(|| data.work_path.userdata_path.as_ref().map(path::PathBuf::from).unwrap_or_else(|| userdata_path()).join("server")),
            appdata_path: data.work_path.appdata_path.as_ref().map(path::PathBuf::from).unwrap_or_else(|| data.work_path.userdata_path.as_ref().map(path::PathBuf::from).unwrap_or_else(|| userdata_path()).join("appdata")),
        },
        download: data.download.as_ref().map(|download| Download { 
            waiting_interval: download.waiting_interval, 
            timeout_interval: download.timeout_interval,
            proxy: download.proxy.clone(),
            available_sites: download.available_sites.as_ref().map(|f| f[..].to_vec()).unwrap_or_else(|| Vec::new())
        }).unwrap_or_else(|| Download { 
            waiting_interval: Option::None, 
            timeout_interval: Option::None, 
            proxy: Option::None,
            available_sites: Vec::new()
        }),
        connect: data.connect.map(|c| Connect { 
            driver: c.driver, 
            url: c.url, 
            query: c.query, 
            parser: c.parser
        })
    }
}

fn userdata_path() -> std::path::PathBuf {
    match home_dir() {
        Some(u) => {
            if cfg!(target_os = "macos") {
                u.join("Library/Application Support/Hedge-v3")
            }else if cfg!(target_os = "linux") {
                u.join(".config/Hedge-v3")
            }else{
                panic!("Unsupported system platform.")
            }
        },
        None => panic!("Cannot read HOME dir.")
    }
}

fn default_config_file() -> LocalConfigFile {
    LocalConfigFile { 
        debug_mode: Option::None,
        work_path: LocalConfigFileWorkPath { 
            application_path: Option::None, 
            server_path: Option::None, 
            appdata_path: Option::None, 
            userdata_path: Option::None
        },
        download: Option::None,
        connect: Option::None
    }
}

pub struct LocalConfig {
    pub debug_mode: bool,
    pub work_path: WorkPath,
    pub download: Download,
    pub connect: Option<Connect>
}

pub struct WorkPath {
    pub application_path: Option<path::PathBuf>,
    pub userdata_path: path::PathBuf,
    pub server_path: path::PathBuf,
    pub appdata_path: path::PathBuf
}

pub struct Download {
    pub waiting_interval: Option<u64>,
    pub timeout_interval: Option<u64>,
    pub proxy: Option<String>,
    pub available_sites: Vec<AvailableSite>
}

pub struct Connect {
    pub driver: String,
    pub url: String,
    pub query: String,
    pub parser: HashMap<String, ConnectParser>
}

#[derive(Deserialize, Clone)]
pub struct AvailableSite {
    pub site: String,
    pub rule: String
}

#[derive(Deserialize)]
struct LocalConfigFile {
    debug_mode: Option<bool>,
    work_path: LocalConfigFileWorkPath,
    download: Option<LocalConfigFileDownload>,
    connect: Option<LocalConfigDbConnect>
}

#[derive(Deserialize)]
struct LocalConfigFileWorkPath {
    application_path: Option<String>,
    server_path: Option<String>,
    appdata_path: Option<String>,
    userdata_path: Option<String>
}

#[derive(Deserialize)]
struct LocalConfigFileDownload {
    waiting_interval: Option<u64>,
    timeout_interval: Option<u64>,
    proxy: Option<String>,
    available_sites: Option<Vec<AvailableSite>>
}

#[derive(Deserialize)]
struct LocalConfigDbConnect {
    driver: String,
    url: String,
    query: String,
    parser: HashMap<String, ConnectParser>
}

#[derive(Deserialize, Clone)]
pub struct ConnectParser {
    pub site: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub tag: Option<ConnectParserTag>,
    pub book: Option<ConnectParserBook>,
    pub relation: Option<ConnectParserRelation>,
    pub additional_info: Option<HashMap<String, String>>,
    pub translate_underscore_to_space: Option<Vec<String>>
}

#[derive(Deserialize, Clone)]
pub struct ConnectParserTag {
    pub selector: String,
    pub code: String,
    pub name: Option<String>,
    pub other_name: Option<String>,
    #[serde(rename = "type")]
    pub tag_type: Option<String>,
}

#[derive(Deserialize, Clone)]
pub struct ConnectParserBook {
    pub selector: String,
    pub code: String,
    pub title: Option<String>,
    pub other_title: Option<String>
}

#[derive(Deserialize, Clone)]
pub struct ConnectParserRelation {
    pub selector: Vec<String>
}