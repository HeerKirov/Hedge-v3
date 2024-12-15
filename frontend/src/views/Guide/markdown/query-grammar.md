此章节以较为严谨的方式给出HQL的语法定义。当然，这只是便于从上到下地完整阅览HQL的写法，更严谨的定义，请参考最后的文法产生式。
* 根句子  
    根句子指一句完整的查询语句，也是一个完整的合取范式。根句子用AND连接每一个句项，每一个句项的条件都成立时，对象匹配才成立。  
    句项则是一个合取项。它会是一个标签项、评论项或关键字项。除此之外，它还可以携带^标记或NOT标记。  
    `^`: 该项是来源属性。携带此标记时，后续的属性匹配进入来源域。  
    `-`: 该项是否定项。
    ```
    根句子 = 句项 (&) 句项 ...
    句项 = (-) (^) 标签项/评论项/关键字项
    ```
* 评论项  
    匹配一个或多个评论类文本，用AND连接。它包含多个文本字符串形成的列表。  
    ```
    评论项 = [ 字符串 | 字符串 ... ]
    ```
* 标签项  
    匹配一个或多个标签，用OR连接。  
    标签有多种写法。可以直接写出标签的地址，也可以使用运算符进行更复杂的标签匹配。  
    地址是由`.`连接的一串字符串，它们构成了对标签的寻址式匹配。
    ```
    标签项 = (@/#/$) 标签 | 标签 ...
    标签 = 地址
    标签 = 地址 一元运算符
    标签 = 地址 运算符 运算对象
    地址 = 字符串 . 字符串 ...
    ```
* 关键字项  
    进行一个或多个的关键字筛选，用OR连接。  
    SFP是一个"A is B"类型的主系表结构，有时也可以省略为"A"。根据关键字种类的不同，支持不同的运算符和运算对象。这部分的详细支持请参考「HQL方言」一节。
    ```
    关键字项 = SFP | SFP ...
    SFP = 关键字
    SFP = 关键字 运算符 运算对象
    ```
* 运算符  
    支持以下运算符。
    ```
    一元运算符 = ~+/~-
    运算符 = :/>/>=/</<=/~
    ```
* 运算对象  
    运算对象主要包括这几类：单项、集合、范围、排序列表。
    ```
    运算对象 = 对象
    运算对象 = { 对象, 对象 ... }
    运算对象 = [/( 对象, 对象 )/]
    运算对象 = 排序项, 排序项 ...
    排序项 = (+/-) 字符串
    ```
* 对象  
    对象在形式上都是字符串。然而依据其语法功能，可以划分为这几类:
    * string: 字符串。对反引号串以EQ判断，对其他串以LIKE判断。
    * extractString: 精确字符串。对所有的内容以EQ判断。
    * number: 数字。
    * patternNumber: 匹配数字。匹配串会被转换成范围。
    * date: 日期。支持`Y-M-d`的格式，支持`-`、`.`、`/`三种分隔符。
    * size: 文件大小。支持`\d+(KMGT)?[iB|B|$]`的格式。

#### 附：文法产生式

```
-- 根句子，下推为多个句项的连接
SEQUENCE -> SEQUENCE_ITEM
SEQUENCE -> SEQUENCE SEQUENCE_ITEM
SEQUENCE -> SEQUENCE & SEQUENCE_ITEM

-- 句项，下推为body、来源标记、减标记的组合
SEQUENCE_ITEM -> SEQUENCE_BODY
SEQUENCE_ITEM -> ^ SEQUENCE_BODY
SEQUENCE_ITEM -> - SEQUENCE_BODY
SEQUENCE_ITEM -> - ^ SEQUENCE_BODY

-- body，下推为元素或括号标记
SEQUENCE_BODY -> ELEMENT
SEQUENCE_BODY -> BRACKET

-- 元素，下推为元素项以及元素项前缀
ELEMENT -> ELEMENT_ITEM
ELEMENT -> ELEMENT_PREFIX ELEMENT_ITEM

-- 元素项前缀，包括以下3类前缀
ELEMENT_PREFIX -> @
ELEMENT_PREFIX -> #
ELEMENT_PREFIX -> $

-- 括号标记，由中括号括起，包含一定量的字符串内容
BRACKET -> [ BRACKET_ITEM ]

-- 括号标记项，下推为任意数量的str的|组合
BRACKET_ITEM -> str
BRACKET_ITEM -> BRACKET_ITEM str

-- 元素项，下推为任意数量的SFP的|组合
ELEMENT_ITEM -> SFP
ELEMENT_ITEM -> ELEMENT_ITEM | SFP
ELEMENT_ITEM -> ELEMENT_ITEM / SFP

-- SFP，作为主系表结构有如下下推可能：单一主语；主语和一元系语；主语、系语和表语
SFP -> SUBJECT
SFP -> SUBJECT UNARY_FAMILY
SFP -> SUBJECT FAMILY PREDICATIVE

-- 主语，一定是STRING
SUBJECT -> STRING

-- 一元系语
UNARY_FAMILY -> ~+
UNARY_FAMILY -> ~-

-- 二元系语
FAMILY -> :
FAMILY -> >
FAMILY -> >=
FAMILY -> <
FAMILY -> <=
FAMILY -> ~

-- 表语包括：字符串、集合、范围、排序列表
PREDICATIVE -> STRING
PREDICATIVE -> COLLECTION
PREDICATIVE -> RANGE
PREDICATIVE -> SORT_LIST

-- STRING是多个str的.组合，形成地址串
STRING -> str
STRING -> STRING . str

-- 集合，由一对大括号和集合项组成
COLLECTION -> { }
COLLECTION -> { COLLECTION_ITEM }

-- 集合项是多个str的,组合
COLLECTION_ITEM -> str
COLLECTION_ITEM -> COLLECTION_ITEM , str

-- 范围，由范围起止符号和两个范围str组成
RANGE -> RANGE_BEGIN str , str RANGE_END

-- 范围开始符号
RANGE_BEGIN -> [
RANGE_BEGIN -> (

-- 范围结束符号
RANGE_END -> ]
RANGE_END -> )

-- 排序列表，是多个排序项的,组合
SORT_LIST -> ORDERED_SORT_ITEM
SORT_LIST -> SORT_LIST , ORDERED_SORT_ITEM

-- 排序项，下推至排序项外加+ -符号
ORDERED_SORT_ITEM -> SORT_ITEM
ORDERED_SORT_ITEM -> + SORT_ITEM
ORDERED_SORT_ITEM -> - SORT_ITEM

-- 排序项，包括^的写法
SORT_ITEM -> str
SORT_ITEM -> ^ str
```