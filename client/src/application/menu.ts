import { app, Menu, shell } from "electron"
import { WindowManager } from "./window"
import { Platform } from "../utils/process"

export function registerAppMenu(windowManager: WindowManager, platform: Platform) {
    if(platform === "darwin") {
        //mac上的菜单栏
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            {
                label: "Hedge",
                submenu: [
                    {label: '关于Hedge', role: 'about'},
                    {type: 'separator'},
                    {label: '偏好设置', accelerator: 'Command+,', click() { windowManager.openSettingWindow() }},
                    {type: 'separator'},
                    {label: '服务', role: 'services'},
                    {type: 'separator'},
                    {label: '隐藏Hedge', role: 'hide'},
                    {label: '隐藏其他应用', role: 'hideOthers'},
                    {label: '取消隐藏', role: 'unhide'},
                    {type: 'separator'},
                    {label: '退出Hedge', role: 'quit'},
                ]
            },
            {
                label: '编辑',
                role: 'editMenu',
                submenu: [
                    {label: '撤销', role: 'undo'},
                    {label: '重做', role: 'redo'},
                    {type: 'separator'},
                    {label: '剪切', role: 'cut'},
                    {label: '复制', role: 'copy'},
                    {label: '粘贴', role: 'paste'},
                    {type: 'separator'},
                    {label: '删除', role: 'delete'},
                    {label: '全选', role: 'selectAll'}
                ]
            },
            {
                label: '显示',
                submenu: [
                    {label: '重新加载', role: 'reload'},
                    {label: '开发者工具', role: 'toggleDevTools'},
                    {type: 'separator'},
                    {label: '全屏', role: 'togglefullscreen'}
                ]
            },
            {
                label: '窗口',
                role: 'windowMenu',
                submenu: [
                    {label: '最小化', role: 'minimize'},
                    {label: '缩放', role: 'zoom'},
                    {label: '关闭窗口', role: 'close'},
                    {type: 'separator'},
                    {label: '新建窗口', accelerator: 'Command+N', click() { windowManager.createWindow() }}
                ]
            },
            {
                label: '帮助',
                role: "help",
                submenu: [
                    {label: '帮助向导', click() { windowManager.openGuideWindow() }},
                    {type: 'separator'},
                    {label: 'Github', async click() { await shell.openExternal('https://github.com/HeerKirov/Hedge-v3') }}
                ]
            }
        ]))
    }else{
        //windows & linux上的菜单栏
        Menu.setApplicationMenu(Menu.buildFromTemplate([
            {
                label: "Hedge",
                submenu: [
                    {label: '关于Hedge', role: 'about'},
                    {type: 'separator'},
                    {label: '偏好设置', accelerator: 'Ctrl+,', click() { windowManager.openSettingWindow() }},
                    {type: 'separator'},
                    {label: '退出Hedge', role: 'quit'},
                ]
            },
            {
                label: '编辑',
                role: 'editMenu',
                submenu: [
                    {label: '撤销', role: 'undo'},
                    {label: '重做', role: 'redo'},
                    {type: 'separator'},
                    {label: '剪切', role: 'cut'},
                    {label: '复制', role: 'copy'},
                    {label: '粘贴', role: 'paste'},
                    {label: '删除', role: 'delete'},
                    {type: 'separator'},
                    {label: '全选', role: 'selectAll'}
                ]
            },
            {
                label: '视图',
                submenu: [
                    {label: '重新加载', role: 'reload'},
                    {label: '开发者工具', role: 'toggleDevTools'},
                    {type: 'separator'},
                    {label: '全屏', role: 'togglefullscreen'}
                ]
            },
            {
                label: '窗口',
                role: 'windowMenu',
                submenu: [
                    {label: '最小化', role: 'minimize'},
                    {label: '缩放', role: 'zoom'},
                    {label: '关闭窗口', role: 'close'},
                    {type: 'separator'},
                    {label: '新建窗口', accelerator: 'Ctrl+N', click() { windowManager.createWindow() }}
                ]
            },
            {
                label: '帮助',
                role: "help",
                submenu: [
                    {label: '帮助向导', click() { windowManager.openGuideWindow() }},
                    {type: 'separator'},
                    {label: 'Github', async click() { await shell.openExternal('https://github.com/HeerKirov/Hedge-v3') }}
                ]
            }
        ]))
    }
}

export function registerDockMenu(windowManager: WindowManager, platform: Platform) {
    if(platform === "darwin") {
        app.dock.setMenu(Menu.buildFromTemplate([
            {label: "新建窗口", click() { windowManager.createWindow() }}
        ]))
    }
}
