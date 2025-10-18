
function preprocessUrlPatterns(urlPatterns: string[]): string[] {
    return urlPatterns.map(pattern => {
        // 检查是否包含中间通配符（/*/）
        if (pattern.includes('/*/')) {
            // 分割URL模式
            const parts = pattern.split('/*/')
            if (parts.length >= 2) {
                // 取通配符前的部分作为查询模式
                return parts[0] + '/*'
            }
        }
        // 如果没有中间通配符，保持原样
        return pattern
    })
}

function filterTabsByOriginalPattern(tabs: chrome.tabs.Tab[], originalPatterns: string[]): chrome.tabs.Tab[] {
    return tabs.filter(tab => {
        return originalPatterns.some(pattern => {
            if (!tab.url) return false

            if (pattern.includes('/*/')) {
                // 处理中间通配符模式
                const regex = convertUrlPatternToRegex(pattern)
                return regex.test(tab.url)
            } else {
                // 处理标准模式
                return matchUrlPattern(tab.url, pattern)
            }
        })
    })
}

function convertUrlPatternToRegex(pattern: string): RegExp {
    // 转义正则特殊字符
    let regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '[^\\s/]*')

    // 处理中间通配符
    regexPattern = regexPattern.replace(/\\\/\\\[\^\\s\/\]\*\\\//g, '/[^\\s/]*/')

    return new RegExp('^' + regexPattern + '$')
}

function matchUrlPattern(url: string, pattern: string): boolean {
    if (pattern.endsWith('/*')) {
        const base = pattern.slice(0, -2)
        return url.startsWith(base)
    }
    return url === pattern
}

export async function queryTabs({ url, ...options }: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
    try {

        // 预处理URL模式
        const processedPatterns = preprocessUrlPatterns(urlPatterns)

        // 合并查询条件
        const queryInfo: chrome.tabs.QueryInfo = {...options, url: processedPatterns}

        // 使用Chrome API查询标签页
        const allTabs = await chrome.tabs.query(queryInfo)

        // 根据原始模式进行二次过滤
        return filterTabsByOriginalPattern(allTabs, urlPatterns)
    } catch (error) {
        console.error('Error querying tabs:', error)
        return []
    }
}
