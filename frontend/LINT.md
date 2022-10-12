# LINT Document

## 文件组织规范

### src文件组织形式
```
assets/			-- 静态资源文件
typings/		-- d.ts定义文件

functions/      -- 主函数库
utils/          -- 工具函数库
constants/      -- 常量定义
modules/        -- 服务模块
services/       -- 服务层

styles/			-- 全局样式

components/		-- 轻组件库
layouts/		-- 重组件库
views/			-- 页面组件库

routes.ts		-- 路由定义
main.ts			-- 主文件
App.vue			-- 构建App的根组件
```

### 组件
以**SFC**组件为主。SFC组件使用`setup` + `typescript` + `pug` + `sass`编写。逻辑组件或特殊组件使用**TSX**编写，且这类组件一般使用inline CSS。避免使用散落的sass文件。

组件类内容主要分为3部分。

#### views
views文件夹存放**页面组件**。页面组件由路由索引，构成App的主要现实内容。页面组件几乎不会复用，各自保持在路由或组件树上的相应位置。
```
views/
    <XXX>/          -- 一个页面组件
        <YYY>/      -- 此页面的子页面，或者较为复杂的子组件
        <XXX>.vue   -- 此页面组件的主组件
        <...>.vue   -- 其他较为简单的子组件
```
此结构可递归嵌套。

子组件通常可平铺在同级文件夹下，或者较为复杂时放入次级文件夹组装。但是，如果需要复用或者过于复杂，还是应该拆出去放在重型组件库。

页面结构中会有很多的service注入，一般来说，这些代码应该放到service层，不应该在view下直接编写了。

#### components-module
components-module文件夹存放**重型业务组件或系统功能组件**。它们通常聚焦于一套完整的业务功能，与业务耦合严重，或者存在跨页面复用。
例如，一套完整的Tag编辑器、全局对话框系统。

components-module文件夹按用途分类管理这些重型组件。组件需要被导出到上一级的分组文件夹以方便批量引用。

#### components-business
components-business文件夹存放**轻型业务组件**。它们通常实现一些轻量级、局部的业务相关组件。例如，各类表单元素编辑器遗迹表单元素展示套件。

components-business文件夹按用途分类管理这些轻型组件。组件需要被导出到上一级的分组文件夹以方便批量引用。

#### components
components文件夹存放**轻型组件或单一功能组件**。它们一般专注于单一功能，比较轻量，或者是与业务无关的外围组件。例如，Grid视图、虚拟滚动视图、布局组件、定制表单组件。

components文件夹按用途分类管理这些轻型组件。组件需要被导出到上一级的分组文件夹以方便批量引用。

#### 功能组件组织清单
* `components`
    * `form`: 简单的表单类组件，如输入框、按钮、选择器等。
    * `universal`: 简单的显示元素组件，如进度条、星星、换行文本、标签。
    * `logical`: 逻辑型组件，只负责逻辑功能且通常没有DOM实体，如懒加载、编辑控制器等。
    * `interaction`: 有复杂交互逻辑的交互组件。 
    * `data`: 有复杂交互逻辑的数据组件。 
    * `layout`: 各类布局框架组件，如侧边栏架构、顶栏架构等。
* `components-business`
    * `element`: 业务相关的封装元素，如MetaTag展示组件、缩略图展示组件等。
    * `form-display`: 表单相关的展示器类组件，提供高度集成的、直接面向业务实体的展示器。
    * `form-editor`: 表单相关的编辑器类组件，提供高度集成的、直接面向业务实体的编辑器。
    * `form-kit`: 表单相关的组合套件，一般为display和editor的整合一体式编辑器。
    * `top-bar`: 顶栏上使用的各类功能组件，用于配合顶栏架构装配一个完整功能的顶栏。
* `components-module`
    * `data`: 重型且复杂的数据组件，提供某个场景下的复杂数据交互。比如实现后的图库滚动列表、TagTree等。
    * `module`: 全局安装的服务模块，如messageBox、Toast、GlobalDialog、GlobalCallOut等。
    * `drawer`: 已经完成装配的抽屉组件，如MetaTag编辑器抽屉等。
    * `dialog`: 已经完成装配的对话框组件，如ImportDialog导入对话框等。
    * `view-stack`: 提供各类详情页面的视图栈的重型组件。各类详情页面也包括于此。

#### 所有组件名称用词规范
所有组件都需要遵循下面的用词规范，使名称清晰可辨。
* `SideBar`: 指左侧的侧边栏部分。
* `TopBar`: 指内容区域中，上面的顶栏部分。
* `Pane`: 指内容区域中，右侧可开关的侧边栏部分。
* `Dialog`: 指屏幕中央弹出的、遮蔽背景的、大块交互式对话框。
* `Drawer`: 指内容区域中，从左侧弹出的、遮蔽背景的、大块交互式对话框。
* `CallOut`: 指屏幕中弹出的、小型的、用于信息提示的悬浮框。
* `Panel`: 指内容区域部分的面板。当需要在内容区域打开新内容时，叠加的部分就是这个。
* `Page`: 指覆盖整个窗口区域的页面，一般来说只用于组件树。
* `View`: 指覆盖整个窗口的视图区域，因此有时也会指覆盖整个窗口的视图组件。
* `MessageBox`: 指窗口正中弹出的、遮蔽背景的、小型通知/交互对话框。算是Dialog的一种，但用途比较专一。
* `Toast`: 指窗口右上角弹出的消息通知(在naive-ui中的名称是notification，不要混淆)。
* `Notification`: 指通过系统API弹出的消息通知。

### 代码
#### functions
存放各类功能代码。
* `http-client`: HTTP请求客户端，将server的API封装为有类型声明的可访问形式。非composition API。
* `ipc-client`: IPC请求客户端，将client的IPC封装为有类型声明的可访问形式。非composition API。
* `ws-client`: WebSocket客户端，将server的WebSocket封装为有类型声明的可访问形式。非composition API。
* `app`: 定义一套组装起来的client访问套件，提供了与程序基础运行环境相关的所有信息和操作，以及各类请求客户端的访问入口。是composition API。

#### modules
面向全局安装的、提供全局性的功能服务模块，例如keyboard全局事件服务、document全局控制服务、router全局导航服务等。

#### services
将各类功能组织起来形成服务层，直接面向view/layouts插入和注入。反过来说，面向view的一般都是service，尽量避免直接引入functions层的东西。

服务层的主要内容有这么几块：
* `base`: 面向组件树安装的、提供页面功能支持的基本模块。
* `global`: 面向全局安装的、提供全局性的业务服务模块，例如导入服务、设置属性服务等。
* `...`: 其他主要的、提供页面数据服务的业务模块。

#### constants
提供各类公共定义体系，例如惯用名称定义等。

#### utils
提供各种业务无关的工具函数库。
