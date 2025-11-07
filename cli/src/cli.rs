use std::path::PathBuf;
use clap::{Args, Parser, Subcommand};
use chrono::NaiveDate;
use clap_complete::Shell;
use crate::module::import::OrderTimeType;

#[derive(Parser)]
#[command(bin_name = "hedge", name = "hedge", version, about = "Hedge Command Line Application")]
pub enum Cli {
    #[command(about = "Start hedge application")]
    App,
    #[command(about = "Apply anywhere files for data updates")]
    Apply(Apply),
    #[command(subcommand, about = "Cli Channel control")]
    Channel(Channel),
    #[command(subcommand, about = "Background service process control")]
    Server(Server),
    #[command(subcommand, about = "File import management")]
    Import(Import),
    #[command(subcommand, about = "Source data management")]
    SourceData(SourceData),
    #[command(subcommand, about = "Toolbox")]
    Tool(Tool),
    #[command(about = "Generate shell completions")]
    Completion(Completion),
}

#[derive(Args)]
pub struct Apply {
    #[arg(short, long, help = "read from files in directory")]
    pub directory: Option<Vec<PathBuf>>,
    #[arg(short, long, help = "read from file")]
    pub file: Option<Vec<PathBuf>>,
    #[arg(short, long, help = "read from stdin")]
    pub input: bool,
    #[arg(short, long, help = "print verbose output")]
    pub verbose: bool,
}

#[derive(Subcommand)]
pub enum Channel {
    #[command(about = "Show using and all channels")]
    Info,
    #[command(about = "Change using channel")]
    Use {
        #[arg(help = "target channel name")]
        channel_name: String
    }
}

#[derive(Subcommand)]
pub enum Server {
    #[command(about = "Show service status")]
    Status,
    #[command(about = "Start service and keep it running")]
    Start,
    #[command(about = "Stop service")]
    Stop,
    #[command(about = "Force kill service")]
    Kill,
    #[command(about = "Print server.log")]
    Log {
        #[arg(help = "Log file date. Default today")]
        date: Option<String>
    }
}

#[derive(Subcommand)]
pub enum Import {
    #[command(about = "Import new file")]
    Add {
        #[arg(help = "any local files")]
        files: Vec<PathBuf>,
        #[arg(short, long, help = "remove origin file")]
        remove: bool
    },
    #[command(about = "List all imported files")]
    List,
    #[command(about = "Batch update imported files")]
    Batch {
        #[arg(short, long, help = "set partition time")]
        partition_time: Option<NaiveDate>,
        #[arg(short, long, help = "set create time by some category")]
        create_time: Option<OrderTimeType>,
        #[arg(short, long, help = "set order time by some category")]
        order_time: Option<OrderTimeType>,
        #[arg(short, long, help = "analyse source date")]
        analyse_source: bool
    },
    #[command(about = "Save all imported files")]
    Save
}

#[derive(Subcommand)]
pub enum SourceData {
    #[command(about = "Query source data by HQL")]
    Query {
        #[arg(help = "hedge query language")]
        hql: String,
        #[arg(long, help = "query limit", default_value_t = 100)]
        limit: u32,
        #[arg(long, help = "query offset", default_value_t = 0)]
        offset: u32
    },
    #[command(about = "Download metadata for NOT_EDITED source data")]
    Download,
    #[command(about = "Connect database to read metadata for NOT_EDITED source data")]
    Connect {
        #[arg(long, short, help = "query condition to split result")]
        split: Vec<String>,
        #[arg(long, help = "query limit")]
        limit: Option<u32>,
        #[arg(short, long, help = "allow to update exist item", default_value_t = false)]
        update: bool,
        #[arg(short, long, help = "print verbose output")]
        verbose: bool,
    }
}

#[derive(Subcommand)]
pub enum Tool {
    #[command(about = "Import folder struct from dir")]
    ImportFolder {
        #[arg(short, long, help = "local dir")]
        dir: Option<PathBuf>,
        #[arg(short, long, help = "tree output json")]
        tree: Option<PathBuf>,
        #[arg(long, help = "dry run")]
        dry_run: bool
    }
}

#[derive(Args)]
pub struct Completion {
    #[arg(help = "shell type")]
    pub shell: Shell
}