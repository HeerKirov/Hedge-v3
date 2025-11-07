pub mod app;
pub mod apply;
pub mod channel;
pub mod server;
pub mod import;
pub mod source_data;
pub mod tool;

use crate::module::channel::ChannelManager;
use crate::module::config::LocalConfig;
// use crate::module::local_data::LocalDataManager;
use crate::module::server::ServerManager;

pub struct Context<'t> {
    pub config: LocalConfig,
    // pub local_data_manager: &'t LocalDataManager,
    pub channel_manager: &'t ChannelManager<'t>,
    pub server_manager: &'t mut ServerManager
}