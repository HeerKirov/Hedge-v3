use std::path::PathBuf;
use async_std::fs;
use serde::Deserialize;

use crate::module::api::{source_data::SourceDataModule, folder::{FolderModule, FolderCreateForm}};

use super::Context;

pub async fn import_folder(context: &mut Context<'_>, file: &Option<PathBuf>, tree: &Option<PathBuf>, dry_run: bool) {
    if let Err(e) = context.server_manager.waiting_for_start().await {
        eprintln!("Cannot establish connection to server. {}", e);
        return
    }

    let mut source_data_module = SourceDataModule::new(context.server_manager);
    let mut folder_module = FolderModule::new(context.server_manager);

    if let Some(file) = file {
        let root = match std::fs::read_dir(file) {
            Ok(ok) => ok,
            Err(e) => {
                eprintln!("File input read error. {}", e);
                return
            }
        };
        let mut dirs: Vec<_> = root.filter(|i| i.as_ref().is_ok_and(|f| f.file_type().is_ok_and(|f| f.is_dir())))
            .map(|i| i.unwrap().file_name())
            .collect();
        dirs.sort();
    
        for dir_name in dirs {
            let dir_name = dir_name.to_str().unwrap();
            let mut dir_path = file.clone();
            dir_path.push(dir_name);
    
            let dir = match std::fs::read_dir(&dir_path) {
                Ok(ok) => ok,
                Err(e) => {
                    println!("{:50}| Read failed. \x1b[1;31m{}\x1b[0m", dir_name, e);
                    continue
                }
            };
    
            let filenames: Vec<String> = dir
                .filter(|f| f.as_ref().is_ok_and(|f| f.file_type().is_ok_and(|f| f.is_file() || f.is_symlink())))
                .map(|f| f.as_ref().unwrap().file_name().to_str().unwrap().to_string())
                .map(|f| f.split_once(".").map(|(a, _)| a.to_string()).unwrap_or(f))
                .collect();
            let filenames: Vec<_> = filenames.iter().map(|f| f.as_str()).collect();
    
            if filenames.is_empty() {
                println!("{:50}| Empty.", dir_name);
                continue
            }
            
            process_one_direcory(&mut source_data_module, &mut folder_module, dry_run, dir_name, filenames).await
        }
    }else if let Some(tree) = tree {
        let f = match fs::read(tree).await {
            Ok(o) => o,
            Err(e) => {
                eprintln!("Tree input read error. {}", e);
                return
            }
        };
        let json: Vec<TreeJsonNode> = match serde_json::from_slice(&f) {
            Ok(o) => o,
            Err(e) => {
                eprintln!("Tree json parse error, {}", e);
                return
            }
        };
        for node in json {
            if let TreeJsonNode::Directory { name, contents } = node {
                let dir_name = if name.starts_with("./") { name[2..].to_string() }else{ name };
                let filenames: Vec<String> = if let Some(contents) = contents {
                    contents.iter().filter_map(|n| match n {
                        TreeJsonNode::File { name } => Option::Some(name.clone()),
                        TreeJsonNode::Link { name } => Option::Some(name.clone()),
                        _ => Option::None
                    }).collect()
                }else{
                    println!("{:50}| Empty.", dir_name);
                    continue
                };
                let filenames: Vec<_> = filenames.iter().map(|f| f.as_str()).collect();

                if filenames.is_empty() {
                    println!("{:50}| Empty.", dir_name);
                    continue
                }

                process_one_direcory(&mut source_data_module, &mut folder_module, dry_run, &dir_name, filenames).await
            }
        }
    }else{
        panic!("Neither file nor tree is specified.")
    }
}

async fn write_into_folder(folder_module: &mut FolderModule<'_>, folder_name: &str, image_ids: Vec<i32>) -> Result<i32, Box<dyn std::error::Error>> {
    match folder_module.create(&FolderCreateForm{title: folder_name.to_string(), folder_type: "FOLDER".to_string(), parent_id: Option::None, ordinal: Option::None, images: Option::Some(image_ids)}).await {
        Ok(r) => return Result::Ok(r.id),
        Err(e) => return Result::Err(e)
    }
}

async fn process_one_direcory(source_data_module: &mut SourceDataModule<'_>, folder_module: &mut FolderModule<'_>, dry_run: bool, dir_name: &str, filenames: Vec<&str>) {
    let result = match source_data_module.analyse_source_name(&filenames).await {
        Err(e) => {
            eprintln!("{:50}| Error occrred in analyse source name request. {}", dir_name, e.to_string());
            return
        },
        Ok(r) => r
    };

    if !dry_run {
        let image_ids: Vec<_> = result.iter().filter(|i| i.image_id.is_some()).map(|i| i.image_id.unwrap()).collect();

        match write_into_folder(folder_module, dir_name, image_ids).await {
            Err(e) => {
                eprintln!("{:50}| Error occrred in create folder request. {}", dir_name, e.to_string());
                return
            },
            Ok(_) => {}
        }
    }

    let mut success = 0;
    let mut missing = 0;
    let mut error = 0;
    for r in result {
        if r.error.is_some() {
            error += 1;
        }else if r.image_id.is_some() {
            success += 1;
        }else{
            missing += 1;
        }
    }

    print!("{:50}| ", dir_name);
    if success > 0 { print!("success \x1b[1;32m{}\x1b[0m, ", success) }else{ print!("success 0, ") }
    if missing > 0 { print!("missing \x1b[1;33m{}\x1b[0m, ", missing) }else{ print!("missing 0, ") }
    if error > 0 { print!("error \x1b[1;31m{}\x1b[0m.", error) }else{ print!("error 0.") }
    println!()
}

#[derive(Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
enum TreeJsonNode {
    Report,
    Directory {
        name: String,
        contents: Option<Vec<TreeJsonNode>>
    },
    File {
        name: String
    },
    Link {
        name: String
    }
}