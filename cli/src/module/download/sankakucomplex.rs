use std::error::Error;
use reqwest::Method;
use super::{Adapter, DownloadResult, DownloadAttachInfo, DownloadTag, DownloadBook};

pub async fn download_for_sankakucomplex(adapter: &Adapter, id: i64) -> Result<(DownloadResult, DownloadAttachInfo), Box<dyn Error>> {
    let start_timestamp = chrono::Utc::now().timestamp_millis();
    let url = format!("https://capi-v2.sankakucomplex.com/posts?lang=en&page=1&limit=1&tags=id_range:{id}");
    let (res, retry_cnt) = adapter.try_req(Method::GET, url.as_str()).await?;
    let text = res.text().await?;
    let mut retry_sum_cnt = retry_cnt;

    let value: serde_json::Value = serde_json::from_str(text.as_str())?;
    let arr = value.as_array().unwrap();
    let obj = if let Some(obj) = arr.get(0) { obj } else {
        return Result::Err(Box::new(std::io::Error::new(std::io::ErrorKind::NotFound, format!("Post {id} not found."))));
    };

    let tags: Option<Vec<DownloadTag>> = if let Some(tags) = obj.get("tags").filter(|t| t.is_array()).map(|t| t.as_array().unwrap()) {
        Option::Some(tags.iter().map(|tag| {
            let tag_name = tag.get("tagName").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().replace('_', " "));
            let name_en = tag.get("name_en").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().replace('_', " "));
            let name_ja = tag.get("name_ja").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().to_string());
            let name = tag.get("name").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().replace('_', " "));
            let type_code = tag.get("type").filter(|f| f.is_i64()).map(|f| f.as_i64().unwrap());
            DownloadTag {
                tag_type: type_code.map(|c| get_tag_types(c).to_string()),
                code: tag_name.as_ref().map(|f| f.clone()).unwrap_or_else(|| name_en.as_ref().map(|f| f.clone()).unwrap_or_else(|| name.as_ref().map(|f| f.clone()).expect("Tag name is not exist."))),
                name: tag_name.as_ref().map(|f| f.clone()).or_else(|| name_en.as_ref().map(|f| f.clone()).or_else(|| name.as_ref().map(|f| f.clone()))),
                other_name: name_ja,
            }
        }).collect())
    }else{
        Option::None
    };

    let books: Option<Vec<DownloadBook>> = if let Some(_) = obj.get("in_visible_pool").filter(|b| b.is_boolean() && b.as_bool().unwrap()) {
        let (res, retry_cnt) = download_for_book(adapter, id).await?;
        retry_sum_cnt += retry_cnt;
        Option::Some(res)
    }else{
        Option::None
    };

    let children: Option<Vec<i64>> = if let Some(_) = obj.get("has_children").filter(|b| b.is_boolean() && b.as_bool().unwrap()) {
        let (res, retry_cnt) = download_for_children(adapter, id).await?;
        retry_sum_cnt += retry_cnt;
        Option::Some(res)
    }else{
        Option::None
    };

    let parent = if let Some(parent) = obj.get("parent_id") {
        parent.as_i64()
    }else{
        Option::None
    };

    let relations = if children.is_some() && parent.is_some() {
        let mut ret = Vec::new();
        for ele in children.unwrap() {
            ret.push(ele);
        }
        ret.push(parent.unwrap());
        Option::Some(ret)
    }else if let Some(children) = children {
        Option::Some(children)
    }else if let Some(parent) = parent {
        Option::Some(vec![parent])
    }else{
        Option::None
    };

    let end_timestamp = chrono::Utc::now().timestamp_millis();
    let ret = DownloadResult { tags, books, relations, title: Option::None, description: Option::None, additional_info: Option::None };
    let info = DownloadAttachInfo { retry_count: retry_sum_cnt, time_cost: end_timestamp - start_timestamp };

    Result::Ok((ret, info))
}

async fn download_for_children(adapter: &Adapter, id: i64) -> Result<(Vec<i64>, i32), Box<dyn Error>> {
    let url = format!("https://capi-v2.sankakucomplex.com/posts?lang=en&page=1&limit=40&tags=parent:{id}");
    let (res, retry_cnt) = adapter.try_req(Method::GET, url.as_str()).await?;
    let text = res.text().await?;

    let value: serde_json::Value = serde_json::from_str(text.as_str())?;
    let arr = value.as_array().unwrap();
    let ret = arr.iter().map(|child| child.get("id").filter(|f| f.is_i64()).map(|f| f.as_i64().unwrap()).expect("Children id is not exist.")).collect();

    Result::Ok((ret, retry_cnt))
}

async fn download_for_book(adapter: &Adapter, id: i64) -> Result<(Vec<DownloadBook>, i32), Box<dyn Error>> {
    let url = format!("https://capi-v2.sankakucomplex.com/post/{id}/pools?lang=en");
    let (res, retry_cnt) = adapter.try_req(Method::GET, url.as_str()).await?;
    let text = res.text().await?;

    let value: serde_json::Value = serde_json::from_str(text.as_str())?;
    let arr = value.as_array().unwrap();
    let ret = arr.iter().map(|book| {
        let id = book.get("id").filter(|f| f.is_i64()).map(|f| f.as_i64().unwrap()).expect("Book id is not exist.");
        let name = book.get("name").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().to_string());
        let name_ja = book.get("name_ja").filter(|f| f.is_string()).map(|f| f.as_str().unwrap().to_string());
        DownloadBook { 
            code: id.to_string(),
            title: name,
            other_title: name_ja
        }
    }).collect();

    Result::Ok((ret, retry_cnt))
}

fn get_tag_types(type_code: i64) -> &'static str {
    match type_code {
        1 => "artist",     // 画师
        2 => "studio",     // 团体信息
        3 => "copyright",  // 所属作品
        4 => "character",  // 角色
        8 => "medium",     // 图像信息
        9 => "meta",       // 元信息
        0 => "general",    // 内容
        5 => "genre",      // 特别内容
        _ => panic!("Unknown tag type {}.", type_code)
    }
}