use std::{error::Error, collections::{HashMap, HashSet}};
use crate::utils::error::ApplicationError;
use super::{config::{Connect, LocalConfig, ConnectParserTag, ConnectParserBook, ConnectParser}, download::{DownloadResult, DownloadTag, DownloadBook}};


pub struct ConnectModule<'t> {
    config: &'t Option<Connect>
}

pub struct Connection<'t> {
    config: &'t Connect,
    conn: sqlite::Connection
}

pub struct Statement<'t> {
    config: &'t Connect,
    site_col_name: String,
    pid_col_name: String,
    underscore_translator: HashMap<String, UnderscoreTranslator>,
    stat: sqlite::Statement<'t>
}

impl <'t> ConnectModule <'t> {
    pub fn new(config: &'t LocalConfig) -> ConnectModule<'t> {
        ConnectModule { config: &config.connect }
    }
    pub fn connect(&self) -> Result<Connection<'t>, Box<dyn Error>> {
        let config = if let Some(c) = self.config { c }else{ return Result::Err(Box::new(ApplicationError::new("Config connect is not configured."))) };

        if config.driver.eq_ignore_ascii_case("sqlite") {
            let conn = sqlite::open(&config.url)?;
            
            let conn = Connection::new(conn, config);

            Result::Ok(conn)
        }else{
            Result::Err(Box::new(ApplicationError::new(&format!("Unsupported connect driver {}.", config.driver))))
        }
    }
}

impl <'t> Connection <'t> {
    fn new(conn: sqlite::Connection, config: &'t Connect) -> Connection<'t> {
        Connection { conn, config }
    }
    pub fn statement(&'t mut self, split: &Vec<String>, limit: Option<u32>) -> Result<Statement<'t>, Box<dyn Error>> {
        let split = format!("({})", split.iter().map(|f| format!("'{f}'")).collect::<Vec<String>>().join(", "));
        let limit = format!("{}", limit.unwrap_or(65536));
        let site = format!("({})", self.config.parser.keys().map(|f| format!("'{f}'")).collect::<Vec<String>>().join(", "));
        let sql = self.config.query
            .replace("$split", &split)
            .replace("$site", &site)
            .replace("$limit", &limit);

        let stat = self.conn.prepare(sql)?;
        let site_col_name = if let Ok(n) = stat.column_name("site") { n.to_string() }
            else if let Ok(n) = stat.column_name("source") { n.to_string() }
            else if let Ok(n) = stat.column_name("source_site") { n.to_string() }
            else { return Result::Err(Box::new(ApplicationError::new("Cannot find site column. Please specifiy a column named site, source or source_site."))) };
        let pid_col_name = if let Ok(n) = stat.column_name("id") { n.to_string() }
            else if let Ok(n) = stat.column_name("pid") { n.to_string() }
            else if let Ok(n) = stat.column_name("source_id") { n.to_string() }
            else { return Result::Err(Box::new(ApplicationError::new("Cannot find source id column. Please specifiy a column named id, pid or source_id."))) };
        let mut underscore_translator: HashMap<String, UnderscoreTranslator> = HashMap::new();
        for (k, v) in &self.config.parser {
            if v.translate_underscore_to_space.is_some() && !v.translate_underscore_to_space.as_ref().unwrap().is_empty() {
                underscore_translator.insert(k.clone(), UnderscoreTranslator::new(v.translate_underscore_to_space.as_ref().unwrap())?);
            }
        }

        Result::Ok(Statement::new(stat, self.config, site_col_name.to_string(), pid_col_name.to_string(), underscore_translator))
    }
}

impl <'t> Statement <'t> {
    fn new(stat: sqlite::Statement<'t>, config: &'t Connect, site_col_name: String, pid_col_name: String, underscore_translator: HashMap<String, UnderscoreTranslator>) -> Statement<'t> {
        Statement { config, stat, site_col_name, pid_col_name, underscore_translator }
    }
    pub fn next(&mut self) -> Option<(Option<(String, i64, Option<i32>)>, Result<DownloadResult, Box<dyn Error>>)> {
        if let Ok(sqlite::State::Row) = self.stat.next() {
            let (identity, result) = self.process_row();
            Option::Some((identity, result))
        }else{
            Option::None
        }
    }
    fn process_row(&self) -> (Option<(String, i64, Option<i32>)>, Result<DownloadResult, Box<dyn Error>>) {
        let origin_site: String = match self.stat.read(self.site_col_name.as_str()) {
            Ok(r) => r,
            Err(e) => return (Option::None, Result::Err(Box::new(e)))
        };
    
        if let Some(parser) = self.config.parser.get(&origin_site) {
            let origin_pid: String = match self.stat.read(self.pid_col_name.as_str()) {
                Ok(r) => r,
                Err(e) => return (Option::None, Result::Err(Box::new(e)))
            };
            let (id, part) = match parse_origin_pid(&origin_pid) {
                Ok(r) => r,
                Err(e) => return (Option::None, Result::Err(e))
            };
            let underscore_translator = self.underscore_translator.get(&origin_site);
            let download_result = match generate_download_result(&self.stat, parser, underscore_translator) {
                Ok(r) => r,
                Err(e) => return (Option::None, Result::Err(e))
            };
            (Option::Some((parser.site.clone(), id, part)), Result::Ok(download_result))
        }else{
            (Option::None, Result::Err(Box::new(ApplicationError::new(&format!("Undefined site type '{}'.", origin_site)))))
        }
    }
}

fn generate_download_result(stat: &sqlite::Statement, parser: &ConnectParser, underscore_translator: Option<&UnderscoreTranslator>) -> Result<DownloadResult, Box<dyn Error>> {
    let title = if let Some(ref addr) = parser.title { Option::Some(stat_read_str(stat, &addr)?) }else{ Option::None };
    let description = if let Some(ref addr) = parser.description { Option::Some(stat_read_str(stat, &addr)?) }else{ Option::None };
    let tags = if let Some(ref t) = parser.tag { Option::Some(stat_read_tag(stat, &t)?) }else{ Option::None };
    let books = if let Some(ref b) = parser.book { Option::Some(stat_read_book(stat, &b)?) }else{ Option::None };
    let relations = if let Some(ref r) = parser.relation { Option::Some(stat_read_relations(stat, &r.selector)?) }else{ Option::None };
    let additional_info = if let Some(ref a) = parser.additional_info { Option::Some(stat_read_additional_info(stat, &a)?) }else{ Option::None };
    
    let result = DownloadResult { title, description, tags, books, relations, additional_info };
    let result = if let Some(t) = underscore_translator { map_result_underscore_to_space(result, t) }else{ result };
    Result::Ok(result)
}

fn parse_origin_pid(pid: &str) -> Result<(i64, Option<i32>), Box<dyn Error>> {
    if let Some(idx) = pid.find(|c| c == '_') {
        let id: i64 = pid[..idx].parse()?;
        let part: i32 = pid[idx + 1..].trim_matches('p').parse()?;
        Result::Ok((id, Option::Some(part)))
    }else{
        let id: i64 = pid.parse()?;
        Result::Ok((id, Option::None))
    }
}

fn stat_read_str(stat: &sqlite::Statement, selector: &str) -> Result<String, Box<dyn Error>> {
    let addr: Vec<&str> = selector.split('.').collect();
    if addr.len() == 1 {
        let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
            //skip null column
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not string.", selector))))
        };
        Result::Ok(text)
    }else{
        let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
            //error for null column
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not string.", selector))))       
        };
        let value: serde_json::Value = serde_json::from_str(&text)?;
        let value = addr_selector(&value, &addr[1..])?;
        if let Some(value) = value {
            if let Some(s) = value.as_str() {
                Result::Ok(s.to_string())
            }else{
                Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not string.", selector))))       
            }
        }else{
            Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", selector))))       
        }
    }
}

fn stat_read_tag(stat: &sqlite::Statement, tag: &ConnectParserTag) -> Result<Vec<DownloadTag>, Box<dyn Error>> {
    let addr: Vec<&str> = tag.selector.split('.').collect();
    let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
        //skip null column
        return Result::Ok(Vec::new())
    };
    if let Some(json) = addr_selector(&serde_json::from_str(&text)?, &addr[1..])? {
        if let Some(arr) = json.as_array() {
            let mut ret: Vec<DownloadTag> = Vec::new();
            for item in arr {
                let code = field_selector(item, &tag.code, "Tag.code")?;
                let name = if let Some(ref n) = tag.name { field_selector_option(item, &n, "Tag.name")? }else{ Option::None };
                let other_name = if let Some(ref n) = tag.other_name { field_selector_option(item, &n, "Tag.other_name")? }else{ Option::None };
                let tag_type = if let Some(ref n) = tag.tag_type { field_selector_option(item, &n, "Tag.type")? }else{ Option::None };
                if code.is_empty() {
                    if (name.is_some() && !name.unwrap().is_empty()) || (other_name.is_some() && !other_name.unwrap().is_empty()) {
                        return Result::Err(Box::new(ApplicationError::new(&format!("Tag code is empty but name/other_name not. (name/other_name={})", tag.name.as_ref().unwrap_or_else(|| tag.other_name.as_ref().unwrap()))))) 
                    }
                }else{
                    ret.push(DownloadTag { code, name, other_name, tag_type })
                }
            }
            Result::Ok(ret)
        }else if let Some(_) = json.as_null() {
            Result::Ok(Vec::new())
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not an array.", tag.selector))))       
        }
    }else{
        return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", tag.selector))))   
    }
}

fn stat_read_book(stat: &sqlite::Statement, book: &ConnectParserBook) -> Result<Vec<DownloadBook>, Box<dyn Error>> {
    let addr: Vec<&str> = book.selector.split('.').collect();
    let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
        //skip null column
        return Result::Ok(Vec::new())
    };
    if let Some(json) = addr_selector(&serde_json::from_str(&text)?, &addr[1..])? {
        if let Some(arr) = json.as_array() {
            let mut ret: Vec<DownloadBook> = Vec::new();
            for item in arr {
                let code = field_selector(item, &book.code, "Tag.code")?;
                let title = if let Some(ref n) = book.title { field_selector_option(item, &n, "Book.title")? }else{ Option::None };
                let other_title = if let Some(ref n) = book.other_title { field_selector_option(item, &n, "Book.other_title")? }else{ Option::None };
                ret.push(DownloadBook { code, title, other_title })
            }
            Result::Ok(ret)
        }else if let Some(_) = json.as_null() {
            Result::Ok(Vec::new())
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not an array.", book.selector))))       
        }
    }else{
        return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", book.selector))))   
    }
}

fn stat_read_relations(stat: &sqlite::Statement, selectors: &Vec<String>) -> Result<Vec<i64>, Box<dyn Error>> {
    let mut ret: Vec<i64> = Vec::new();
    for selector in selectors {
        let addr: Vec<&str> = selector.split('.').collect();
        let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
            //skip null column
            continue
        };
        if let Some(json) = addr_selector(&serde_json::from_str(&text)?, &addr[1..])? {
            if let Some(arr) = json.as_array() {
                for item in arr {
                    if let Some(i) = item.as_i64() {
                        ret.push(i);
                    }else if let Some(s) = item.as_str() {
                        ret.push(s.parse()?);
                    }else{
                        return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}'s item is not number or string.", selector))))   
                    }
                }
            }else if let Some(i) = json.as_i64() {
                ret.push(i);
            }else if let Some(s) = json.as_str() {
                ret.push(s.parse()?);
            }else if let Some(_) = json.as_null() {
                //skip
            }else{
                return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not array, number or string.", selector))))       
            }
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", selector))))   
        }
    }
    Result::Ok(ret)
}

fn stat_read_additional_info(stat: &sqlite::Statement, selectors: &HashMap<String, String>) -> Result<HashMap<String, String>, Box<dyn Error>> {
    let mut ret: HashMap<String, String> = HashMap::new();
    for (field, selector) in selectors {
        let addr: Vec<&str> = selector.split('.').collect();
        let text: String = if let Some(text) = stat.read::<Option<String>, &str>(addr[0])? { text }else{
            //skip null column
            continue
        };
        if let Some(json) = addr_selector(&serde_json::from_str(&text)?, &addr[1..])? {
            if let Some(s) = json.as_str() {
                ret.insert(field.clone(), s.to_string());
            }else if let Some(_) = json.as_null() {
                //skip
            }else{
                return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not string.", selector))))       
            }
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", selector))))   
        }
    }

    Result::Ok(ret)
}

fn addr_selector<'t>(json: &'t serde_json::Value, addr: &[&str]) -> Result<Option<&'t serde_json::Value>, Box<dyn Error>> {
    let mut value: Option<&serde_json::Value> = Option::Some(json);
    for a in addr {
        if let Some(v) = value {
            if v.is_object() {
                value = if let Some(v) = v.get(a) { Option::Some(v) }else{ Option::None };
            }else{
                return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not an object.", a))))    
            }
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("Selector '{}' is not exist.", a))))
        }
    }
    Result::Ok(value)
}

fn field_selector(json: &serde_json::Value, field: &str, field_name: &str) -> Result<String, Box<dyn Error>> {
    if let Some(s) = field_selector_option(json, field, field_name)? {
        Result::Ok(s)
    }else{
        return Result::Err(Box::new(ApplicationError::new(&format!("{} '{}' returns null.", field_name, field))))
    }
}

fn field_selector_option(json: &serde_json::Value, field: &str, field_name: &str) -> Result<Option<String>, Box<dyn Error>> {
    if let Some(code) = json.get(field) {
        if let Some(s) = code.as_str() { 
            Result::Ok(Option::Some(s.to_string()))
        }else if code.is_null() {
            Result::Ok(Option::None)
        }else{
            return Result::Err(Box::new(ApplicationError::new(&format!("{} '{}' is not string.", field_name, field))))       
        }
    }else{
        Result::Ok(Option::None)
    }
}

fn map_result_underscore_to_space(mut r: DownloadResult, translator: &UnderscoreTranslator) -> DownloadResult {
    if translator.title { r.title = r.title.map(|t| underscore_to_space(&t)) }
    if translator.description { r.description = r.description.map(|t| underscore_to_space(&t)) }
    if translator.tag_code || translator.tag_name || translator.tag_other_name || translator.tag_type {
        if let Some(ref mut tags) = r.tags {
            for tag in tags.iter_mut() {
                if translator.tag_code { tag.code = underscore_to_space(&tag.code) }
                if translator.tag_name { tag.name = tag.name.as_ref().map(|t| underscore_to_space(&t)) }
                if translator.tag_other_name { tag.other_name = tag.other_name.as_ref().map(|t| underscore_to_space(&t)) }
                if translator.tag_type { tag.tag_type = tag.tag_type.as_ref().map(|t| underscore_to_space(&t)) }
            }
        }
    }
    if translator.book_code || translator.book_title || translator.book_other_title {
        if let Some(ref mut books) = r.books {
            for book in books.iter_mut() {
                if translator.book_code { book.code = underscore_to_space(&book.code) }
                if translator.book_title { book.title = book.title.as_ref().map(|t| underscore_to_space(&t)) }
                if translator.book_other_title { book.other_title = book.other_title.as_ref().map(|t| underscore_to_space(&t)) }
            }
        }
    }
    if !translator.additional_info.is_empty() {
        if let Some(ref mut info) = r.additional_info {
            for (k, v) in info.iter_mut() {
                if let Some(_) = translator.additional_info.get(k) {
                    *v = underscore_to_space(v)
                }
            }
        }
    }
    r
}

fn underscore_to_space(origin: &str) -> String {
    origin.replace('_', " ")
}

struct UnderscoreTranslator {
    title: bool,
    description: bool,
    tag_code: bool,
    tag_name: bool,
    tag_other_name: bool,
    tag_type: bool,
    book_code: bool,
    book_title: bool,
    book_other_title: bool,
    additional_info: HashSet<String>
}

impl UnderscoreTranslator {
    fn empty() -> UnderscoreTranslator {
        UnderscoreTranslator {
            title: false,
            description: false,
            tag_code: false,
            tag_name: false,
            tag_other_name: false,
            tag_type: false,
            book_code: false,
            book_title: false,
            book_other_title: false,
            additional_info: HashSet::new()
        }
    }
    fn new(types: &Vec<String>) -> Result<UnderscoreTranslator, ApplicationError> {
        let mut ret = Self::empty();

        for str in types {
            match str.as_str() {
                "title" => ret.title = true,
                "description" => ret.description = true,
                "tag.code" => ret.tag_code = true,
                "tag.name" => ret.tag_name = true,
                "tag.other_name" => ret.tag_other_name = true,
                "tag.type" => ret.tag_type = true,
                "book.code" => ret.book_code = true,
                "book.title" => ret.book_title = true,
                "book.other_title" => ret.book_other_title = true,
                _ => if str.starts_with("additional_info.") {
                    let field = str["additional_info.".len()..].to_string();
                    ret.additional_info.insert(field);
                }else{
                    return Result::Err(ApplicationError::new(&format!("Unrecoginzed underscore translate type {}.", str)))
                }
            }
        }

        Result::Ok(ret)
    }
}
