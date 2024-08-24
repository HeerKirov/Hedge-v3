use std::io::Write;
use std::{fs, io::ErrorKind};
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use toml;
use super::config::LocalConfig;

#[derive(Deserialize, Serialize)]
pub struct LocalData {
    pub using_channel: Option<String>
}

pub struct LocalDataManager {
    local_data_path: PathBuf
}

impl LocalDataManager {
    pub fn new(config: &LocalConfig) -> LocalDataManager {
        LocalDataManager {
            local_data_path: config.work_path.userdata_path.join("cli/context.toml")
        }
    }
    pub fn read(&self) -> LocalData {
        match fs::read_to_string(&self.local_data_path) {
            Err(e) => if e.kind() == ErrorKind::NotFound {
                LocalData {
                    using_channel: Option::None
                }
            }else{
                panic!("Cannot load local data {}: {}", self.local_data_path.to_str().unwrap(), e)
            },
            Ok(t) => match toml::from_str(&t) {
                Err(e) => panic!("Local data format error: {}", e),
                Ok(t) => t
            }
        }
    }
    pub fn write(&self, data: &LocalData) {
        match toml::to_string(data) {
            Err(e) => panic!("Local data format error: {}", e),
            Ok(s) => {
                
                match fs::write(&self.local_data_path, &s) {
                    Err(e) => {
                        if e.kind() == ErrorKind::NotFound {
                            self.write_and_create(&s);
                        }else{
                            panic!("Cannot write local data {}: {}", self.local_data_path.to_str().unwrap(), e)
                        }
                    },
                    Ok(_) => {}
                }
            }
        }
    }
    fn write_and_create(&self, data: &String) {
        if let Some(parent) = self.local_data_path.parent() {
            match fs::create_dir_all(parent) {
                Err(e) => panic!("Cannot create local data dir {}: {}", parent.to_str().unwrap(), e),    
                Ok(_) => {}
            }
        }
        match fs::File::create(&self.local_data_path) {
            Err(e) => panic!("Cannot create local data {}: {}", self.local_data_path.to_str().unwrap(), e),
            Ok(mut file) => match file.write(data.as_bytes()) {
                Err(e) => panic!("Cannot write local data {}: {}", self.local_data_path.to_str().unwrap(), e),
                Ok(_) => {}
            }
        }
    }
}