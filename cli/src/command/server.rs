use crate::{module::server::ServerStatusType, utils::error::ApplicationError};

use super::Context;


pub async fn status(context: &mut Context<'_>) {
    let stat = context.server_manager.status().await;
    println!("Running status: {}", stat.status);
    if stat.status != ServerStatusType::Stop {
        println!("---");
        if stat.remote_mode {
            println!("Mode: Remote ")
        }
        if let Some(pid) = stat.pid {
            println!("PID: {}", pid)
        }
        if let Some(host) = stat.host {
            println!("Host: {}", host)
        }
        if let Some(port) = stat.port {
            println!("Port: {}", port)
        }
        if let Some(t) = stat.start_time {
            let now = chrono::Utc::now().timestamp_millis();
            let delta = (now - t) / 1000;
            let sec = delta % 60;
            let min = (delta % 3600) / 60;
            let hour = delta / 3600;
            println!("Elapsed Time: {:02}:{:02}:{:02}", hour, min, sec);
        }
    }
}

pub async fn start(context: &mut Context<'_>) {
    if context.server_manager.status().await.status == ServerStatusType::Stop {
        println!("Starting...");
        if let Err(e) = context.server_manager.waiting_for_start().await {
            eprintln!("Cannot establish connection to server. {}", e);
            return
        }
    }
    context.server_manager.permanent(true).await;
    println!("Backend service is running in permanent mode.")
}

pub async fn stop(context: &mut Context<'_>) {
    if context.server_manager.status().await.status != ServerStatusType::Stop {
        context.server_manager.permanent(false).await;
        println!("Backend service exited permanent mode.")
    }
}

pub async fn kill(context: &mut Context<'_>) {
    if context.server_manager.status().await.status != ServerStatusType::Stop {
        if let Err(e) = context.server_manager.kill() {
            if let Some(e) = e.downcast_ref::<ApplicationError>() {
                eprintln!("{}", e.message)
            }else{
                eprintln!("{}", e)
            }
        }else{
            println!("Backend service is killed.")
        }
    }
}

pub fn log(context: &Context<'_>) {
    context.server_manager.log();
}