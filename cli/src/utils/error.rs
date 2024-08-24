
#[derive(Debug, Clone)]
pub struct ApplicationError {
    pub message: String
}

#[derive(Debug, Clone)]
pub struct ApiResultError {
    pub code: String,
    pub message: String
}

impl ApplicationError {
    pub fn new(message: &str) -> ApplicationError {
        ApplicationError { message: message.to_string() }
    }
}

impl ApiResultError {
    pub fn new(code: &str, message: &str) -> ApiResultError {
        ApiResultError { code: code.to_string(), message: message.to_string() }
    }
}

impl std::fmt::Display for ApplicationError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl std::fmt::Display for ApiResultError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}: {}", self.code, self.message)
    }
}

impl std::error::Error for ApplicationError {
    fn cause(&self) -> Option<&dyn std::error::Error> {
        Option::None
    }
    fn description(&self) -> &str {
        &self.message
    }
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Option::None
    }
}

impl std::error::Error for ApiResultError {
    fn cause(&self) -> Option<&dyn std::error::Error> {
        Option::None
    }
    fn description(&self) -> &str {
        &self.message
    }
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        Option::None
    }
}