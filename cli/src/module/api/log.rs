use std::error::Error;
use reqwest::Method;
use crate::module::server::ServerManager;


pub struct LogModule<'t> {
    server_manager: &'t ServerManager
}

impl <'t> LogModule<'t> {
    pub fn new(server_manager: &'t ServerManager) -> LogModule<'t> {
        LogModule { server_manager }        
    }
    // pub async fn list(&mut self) -> Result<Vec<String>, Box<dyn Error>> {
    //     self.server_manager.req(Method::GET, "/api/logs").await
    // }
    pub async fn get(&mut self, date: Option<String>) -> Result<String, Box<dyn Error>> {
        let path = if let Some(date) = date { format!("/app/logs/server.{date}.log") } else { "/app/logs/server.log".to_string() };
        self.server_manager.req_with_plaintext(Method::GET, path).await
    }
}
