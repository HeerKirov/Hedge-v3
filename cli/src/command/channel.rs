
use super::Context;

pub fn info(context: &Context) {
    let list = context.channel_manager.list_channel();
    let current = context.channel_manager.current_channel();
    println!("Using channel: {}", current);
    println!("---");
    println!("Channel list:");
    for c in list {
        println!("- {}", c)
    }
}

pub fn use_channel(context: &Context, channel_name: String) {
    context.channel_manager.use_channel(&channel_name);
    println!("Using channel: {}", &channel_name);
}