mod cli;
mod command;
mod module;
mod utils;

use clap::{Parser, CommandFactory};
use clap_complete::generate;
use cli::{Cli, Import, Channel, Server, SourceData, Tool};
use command::apply::ApplyInputType;
use module::local_data::LocalDataManager;
use module::channel::ChannelManager;
use module::server::ServerManager;

#[tokio::main]
async fn main() {
    let cli = Cli::parse();
    let config = module::config::load_config();
    let local_data_manager = LocalDataManager::new(&config);
    let channel_manager = ChannelManager::new(&config, &local_data_manager);
    let mut server_manager = ServerManager::new(&config, &channel_manager);
    let mut context = command::Context {
        config,
        // local_data_manager: &local_data_manager,
        channel_manager: &channel_manager,
        server_manager: &mut server_manager
    };
    match cli {
        Cli::App => command::app::start_app(&context),
        Cli::Channel(channel) => match channel {
            Channel::Info => command::channel::info(&context),
            Channel::Use { channel_name } => command::channel::use_channel(&context, channel_name)
        }
        Cli::Server(server) => match server {
            Server::Status => command::server::status(&mut context).await,
            Server::Start => command::server::start(&mut context).await,
            Server::Stop => command::server::stop(&mut context).await,
            Server::Kill => command::server::kill(&mut context).await,
            Server::Log{ date } => command::server::log(&mut context, date).await
        }
        Cli::Apply(apply) => {
            let mut input: Vec<ApplyInputType> = Vec::new();
            if let Some(f) = apply.directory {
                for ele in f {
                    input.push(ApplyInputType::Directory(ele));
                }
            }
            if let Some(f) = apply.file {
                for ele in f {
                    input.push(ApplyInputType::File(ele));
                }
            }
            if apply.input {
                input.push(ApplyInputType::Input);
            }
            if input.is_empty() {
                eprintln!("Options --directory, --file and --input should have least one.")
            }else{
                command::apply::apply(&mut context, &input, apply.verbose).await
            }
        }
        Cli::Import(import) => match import {
            Import::Add { files, remove } => command::import::add(&mut context, &files, remove).await,
            Import::Batch { partition_time, create_time, order_time, analyse_source } => command::import::batch(&mut context, partition_time, create_time, order_time, analyse_source).await,
            Import::List => command::import::list(&mut context).await,
            Import::Save => command::import::save(&mut context).await
        }
        Cli::SourceData(source_data) => match source_data {
            SourceData::Query { hql, limit, offset } => command::source_data::query(&mut context, hql.as_str(), offset, limit).await,
            SourceData::Download => command::source_data::download(&mut context).await,
            SourceData::Connect { split, limit, update, verbose } => command::source_data::connect(&mut context, &split, limit, update, verbose).await
        }
        Cli::Tool(tool) => match tool {
            Tool::ImportFolder { dir, tree, dry_run } => command::tool::import_folder(&mut context, &dir, &tree, dry_run).await
        }
        Cli::Completion(completion) => generate(completion.shell, &mut Cli::command(), "hedge", &mut std::io::stdout())
    }
}