use std::path::PathBuf;
use chrono::NaiveDate;
use crate::module::import::{ImportModule, OrderTimeType};
use super::Context;


pub async fn list(context: &mut Context<'_>) {
    if let Err(e) = context.server_manager.waiting_for_start().await {
        eprintln!("Cannot establish connection to server. {}", e);
        return
    }

    let mut import_module = ImportModule::new(context.server_manager);
    let r = match import_module.list().await {
        Err(e) => {
            eprintln!("Error occrred in requesting. {}", e.to_string());
            return
        },
        Ok(r) => r
    };
    for item in &r.result {
        println!("-{:3}| {:50} | {}", item.id, item.file_name.as_ref().unwrap_or(&"".to_string()), item.partition_time)
    }
    if r.result.len() > 0 {
        println!("---");
    }
    println!("Total {} result(s).", r.total);
}

pub async fn add(context: &mut Context<'_>, files: &Vec<PathBuf>, remove: bool) {
    if files.len() > 0 {
        if let Err(e) = context.server_manager.waiting_for_start().await {
            eprintln!("Cannot establish connection to server. {}", e);
            return
        }

        let mut success = 0;
        let mut failed = 0;
        let mut import_module = ImportModule::new(context.server_manager);
        for file in files {
            if file.is_dir() {
                match std::fs::read_dir(file) {
                    Ok(items) => for item in items {
                        if let Ok(entry) = item {
                            if entry.file_type().is_ok_and(|f| f.is_file()) {
                                let mut f = file.clone();
                                f.push(&entry.file_name());
                                if let Err(e) = import_module.add(&f, remove).await {
                                    println!("\x1b[1;33m{}\x1b[1;31m add failed. {}\x1b[0m", f.to_str().unwrap(), e.to_string());
                                    failed += 1;
                                }else{
                                    println!("\x1b[1;33m{}\x1b[0m added.", f.to_str().unwrap());
                                    success += 1;
                                }
                            }
                        }
                    },
                    Err(e) => {
                        println!("\x1b[1;33m{}\x1b[1;31m cannot read dir. {}\x1b[0m", file.to_str().unwrap(), e.to_string());
                        failed += 1;
                    }
                }
                
            }else if file.is_file() {
                if let Err(e) = import_module.add(file, remove).await {
                    println!("\x1b[1;33m{}\x1b[1;31m add failed. {}\x1b[0m", file.to_str().unwrap(), e.to_string());
                    failed += 1;
                }else{
                    println!("\x1b[1;33m{}\x1b[0m added.", file.to_str().unwrap());
                    success += 1;
                }
            }else{
                println!("\x1b[1;33m{}\x1b[1;31m unsupported file.\x1b[0m", file.to_str().unwrap());
                failed += 1;
            }
        }

        println!("---");
        if failed > 0 {
            println!("Import completed. Success {} files(s), failed \x1b[1;31m{}\x1b[0m files(s).", success, failed);
        }else{
            println!("Import completed. Success {} files(s), failed 0 files(s).", success);
        }
    }
}

pub async fn batch(context: &mut Context<'_>, partition_time: Option<NaiveDate>, create_time: Option<OrderTimeType>, order_time: Option<OrderTimeType>, analyse_source: bool) {
    if partition_time.is_some() || create_time.is_some() || order_time.is_some() || analyse_source {
        if let Err(e) = context.server_manager.waiting_for_start().await {
            eprintln!("Cannot establish connection to server. {}", e);
            return
        }

        let mut import_module = ImportModule::new(context.server_manager);
        match import_module.batch(partition_time, create_time, order_time, analyse_source).await {
            Err(e) => eprintln!("Error occrred in requesting. {}", e.to_string()),
            Ok(_) => println!("Batch Succeed.")
        };
    }
}

pub async fn save(context: &mut Context<'_>) {
    if let Err(e) = context.server_manager.waiting_for_start().await {
        eprintln!("Cannot establish connection to server. {}", e);
        return
    }

    let mut import_module = ImportModule::new(context.server_manager);
    let r = match import_module.save().await {
        Err(e) => {
            eprintln!("Error occrred in requesting. {}", e.to_string());
            return
        },
        Ok(r) => r
    };
    for e in &r.errors {
        let mut v = Vec::new();
        if e.file_not_ready { v.push("File not ready.") }
        if e.not_existed_clone_image_id.is_some() { v.push("Preference clone image not exist.") }
        if e.not_existed_collection_id.is_some() { v.push("Preference collection not exist.") }
        if e.not_existed_book_ids.is_some() { v.push("Preference book not exist.") }
        if e.not_existed_folder_ids.is_some() { v.push("Preference folder not exist.") }
        let reason = v.join(" ");
        
        println!("-{:3}| {}", e.import_id, reason);
    }
    if (&r.errors).len() > 0 {
        println!("---");
        println!("{} item(s) saved. \x1b[1;31m{}\x1b[0m item(s) save failed.", r.total, r.errors.len());
    }else{
        println!("{} item(s) saved.", r.total);
    }
}