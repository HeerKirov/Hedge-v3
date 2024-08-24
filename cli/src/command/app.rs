use std::process::{Command, Stdio};
use super::Context;

pub fn start_app(context: &Context) {
    if let Some(application_path) = &context.config.work_path.application_path {
        let channel = context.channel_manager.current_channel();
        let args = if !context.config.debug_mode {
            vec!["--channel", channel]
        }else{
            let userdata_path = context.config.work_path.userdata_path.to_str().unwrap();
            vec!["--channel", channel, "--debug-mode", "--local-data-path", userdata_path]
        };
        
        match Command::new(application_path)
                .args(&args)
                .stderr(Stdio::null())
                .stdout(Stdio::null())
                .spawn() {
            Err(e) => {
                eprintln!("Hedge app start failed. {}", e.to_string())
            },
            Ok(_) => {}
        }
    }else{
        eprintln!("Config application_path is not configured.")
    }
}
