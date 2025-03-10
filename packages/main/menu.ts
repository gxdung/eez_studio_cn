import os from "os";
import fs from "fs";
import {
    app,
    dialog,
    Menu,
    ipcMain,
    BrowserWindow,
    BaseWindow
} from "electron";
import { autorun, runInAction } from "mobx";

import {
    importInstrumentDefinitionFile,
    openHomeWindow
} from "main/home-window";
import {
    IWindow,
    setForceQuit,
    windows,
    findWindowByBrowserWindow,
    isCrashed
} from "main/window";
import { settings } from "main/settings";
import { APP_NAME } from "main/util";
import { undoManager } from "eez-studio-shared/store";
import { isDev } from "eez-studio-shared/util-electron";

////////////////////////////////////////////////////////////////////////////////

function showAboutBox(item: any, focusedWindow: any) {
    if (focusedWindow) {
        focusedWindow.webContents.send("show-about-box");
    }
}

function isMacOs() {
    return os.platform() === "darwin";
}

function enableMenuItem(
    menuItems: Electron.MenuItemConstructorOptions[],
    id: string,
    enabled: boolean
) {
    for (let i = 0; i < menuItems.length; i++) {
        if (menuItems[i].id === id) {
            menuItems[i].enabled = enabled;
            return;
        }
    }
}

async function openProjectWithFileDialog(focusedWindow: BaseWindow) {
    const result = await dialog.showOpenDialog(focusedWindow, {
        properties: ["openFile"],
        filters: [
            { name: "EEZ Project", extensions: ["eez-project"] },
            {
                name: "EEZ Dashboard",
                extensions: ["eez-dashboard"]
            },
            { name: "All Files", extensions: ["*"] }
        ]
    });
    const filePaths = result.filePaths;
    if (filePaths && filePaths[0]) {
        openFile(filePaths[0], focusedWindow, false);
    }
}

export function openFile(
    filePath: string,
    focusedWindow?: any,
    runMode?: boolean
) {
    if (
        filePath.toLowerCase().endsWith(".eez-project") ||
        filePath.toLowerCase().endsWith(".eez-dashboard")
    ) {
        if (!focusedWindow) {
            focusedWindow = BrowserWindow.getFocusedWindow() || undefined;
        }

        if (focusedWindow) {
            focusedWindow.webContents.send("open-project", filePath, runMode);
        }
    }
}

export function loadDebugInfo(debugInfoFilePath: string, focusedWindow?: any) {
    if (!focusedWindow) {
        focusedWindow = BrowserWindow.getFocusedWindow();
    }

    if (focusedWindow) {
        focusedWindow.webContents.send("load-debug-info", debugInfoFilePath);
    }
}

export function saveDebugInfo(focusedWindow?: any) {
    if (!focusedWindow) {
        focusedWindow = BrowserWindow.getFocusedWindow();
    }

    if (focusedWindow) {
        focusedWindow.webContents.send("save-debug-info");
    }
}

function createNewProject() {
    BrowserWindow.getFocusedWindow()!.webContents.send("new-project");
}

function addInstrument() {
    BrowserWindow.getFocusedWindow()!.webContents.send("add-instrument");
}

////////////////////////////////////////////////////////////////////////////////

function buildMacOSAppMenu(
    win: IWindow | undefined
): Electron.MenuItemConstructorOptions {
    return {
        label: APP_NAME,
        submenu: [
            {
                label: "关于 " + APP_NAME,
                click: showAboutBox
            },
            {
                type: "separator"
            },
            {
                label: "Services",
                role: "services",
                submenu: []
            },
            {
                type: "separator"
            },
            {
                label: "隐藏 " + APP_NAME,
                accelerator: "Command+H",
                role: "hide"
            },
            {
                label: "隐藏其他",
                accelerator: "Command+Alt+H",
                role: "hideOthers"
            },
            {
                label: "显示全部",
                role: "unhide"
            },
            {
                type: "separator"
            },
            {
                label: "退出",
                accelerator: "Command+Q",
                click: function () {
                    setForceQuit();
                    app.quit();
                }
            }
        ]
    };
}

////////////////////////////////////////////////////////////////////////////////

function buildFileMenu(win: IWindow | undefined) {
    const fileMenuSubmenu: Electron.MenuItemConstructorOptions[] = [];

    fileMenuSubmenu.push(
        {
            label: "新建工程",
            accelerator: "CmdOrCtrl+N",
            click: function (item, focusedWindow) {
                createNewProject();
            }
        },
        {
            label: "添加调试设备",
            accelerator: "CmdOrCtrl+Alt+N",
            click: function (item, focusedWindow) {
                addInstrument();
            }
        },
        {
            label: "新建窗口",
            accelerator: "CmdOrCtrl+Shift+N",
            click: function (item, focusedWindow) {
                openHomeWindow();
            }
        },
        {
            type: "separator"
        },
        {
            label: "打开",
            accelerator: "CmdOrCtrl+O",
            click: (item, focusedWindow) => {
                if (!focusedWindow) {
                    focusedWindow =
                        BrowserWindow.getFocusedWindow() || undefined;
                }

                if (focusedWindow) {
                    openProjectWithFileDialog(focusedWindow);
                }
            }
        },
        {
            label: "打开最近文件",
            submenu: settings.mru.map(mru => ({
                label: mru.filePath,
                click: function () {
                    if (fs.existsSync(mru.filePath)) {
                        openFile(mru.filePath);
                    } else {
                        // file not found, remove from mru
                        var i = settings.mru.indexOf(mru);
                        if (i != -1) {
                            runInAction(() => {
                                settings.mru.splice(i, 1);
                            });
                        }

                        // notify user
                        dialog.showMessageBox(
                            BrowserWindow.getFocusedWindow()!,
                            {
                                type: "error",
                                title: "EEZ Studio",
                                message: "File does not exist.",
                                detail: `The file '${mru.filePath}' does not seem to exist anymore.`
                            }
                        );
                    }
                }
            }))
        }
    );

    if (
        win?.activeTabType === "project" ||
        win?.activeTabType === "run-project"
    ) {
        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                label: "重新载入工程",
                click: function (item: any, focusedWindow: any) {
                    focusedWindow.webContents.send("reload-project");
                }
            }
        );

        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                label: "加载调试日志信息",
                click: async function (item: any, focusedWindow: any) {
                    const result = await dialog.showOpenDialog(focusedWindow, {
                        properties: ["openFile"],
                        filters: [
                            {
                                name: "EEZ Debug Info",
                                extensions: ["eez-debug-info"]
                            },
                            {
                                name: "EEZ Debug Info",
                                extensions: ["eez-debug-info"]
                            },
                            { name: "All Files", extensions: ["*"] }
                        ]
                    });
                    const filePaths = result.filePaths;
                    if (filePaths && filePaths[0]) {
                        loadDebugInfo(filePaths[0], focusedWindow);
                    }
                }
            }
        );

        if (win.state.isDebuggerActive) {
            fileMenuSubmenu.push({
                label: "Save Debug Info...",
                click: function (item: any, focusedWindow: any) {
                    saveDebugInfo(focusedWindow);
                }
            });
        }
    }

    fileMenuSubmenu.push(
        {
            type: "separator"
        },
        {
            label: "导入仪器定义...",
            click: async function (item: any, focusedWindow: any) {
                const result = await dialog.showOpenDialog(focusedWindow, {
                    properties: ["openFile"],
                    filters: [
                        {
                            name: "Instrument Definition Files",
                            extensions: ["zip"]
                        },
                        { name: "All Files", extensions: ["*"] }
                    ]
                });
                const filePaths = result.filePaths;
                if (filePaths && filePaths[0]) {
                    importInstrumentDefinitionFile(filePaths[0]);
                }
            }
        }
    );

    if (win?.activeTabType === "project") {
        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                id: "save",
                label: "保存",
                accelerator: "CmdOrCtrl+S",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        focusedWindow.webContents.send("save");
                    }
                }
            },
            {
                label: "另存为",
                accelerator: "CmdOrCtrl+Shift+S",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        focusedWindow.webContents.send("saveAs");
                    }
                }
            },

            {
                type: "separator"
            },
            {
                label: "校验当前工程",
                accelerator: "CmdOrCtrl+K",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        focusedWindow.webContents.send("check");
                    }
                }
            },
            {
                label: "编译当前工程",
                accelerator: "CmdOrCtrl+B",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        focusedWindow.webContents.send("build");
                    }
                }
            }
        );

        if (win.state.hasExtensionDefinitions) {
            fileMenuSubmenu.push(
                {
                    label: "Build Extensions",
                    click: function (item: any, focusedWindow: any) {
                        if (focusedWindow) {
                            focusedWindow.webContents.send("build-extensions");
                        }
                    }
                },
                {
                    label: "Build and Install Extensions",
                    click: function (item: any, focusedWindow: any) {
                        if (focusedWindow) {
                            focusedWindow.webContents.send(
                                "build-and-install-extensions"
                            );
                        }
                    }
                }
            );
        }
    } else if (win?.activeTabType === "instrument") {
        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                id: "save",
                label: "保存",
                accelerator: "CmdOrCtrl+S",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        focusedWindow.webContents.send("save");
                    }
                }
            }
        );
    }

    let count = BrowserWindow.getAllWindows().filter(b => {
        return b.isVisible();
    }).length;
    if (count > 1) {
        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                label: "关闭窗口",
                accelerator: "CmdOrCtrl+W",
                click: function (item: any, focusedWindow: any) {
                    if (focusedWindow) {
                        if (isCrashed(focusedWindow)) {
                            app.exit();
                        } else {
                            focusedWindow.webContents.send("beforeClose");
                        }
                    }
                }
            }
        );
    }

    if (!isMacOs()) {
        fileMenuSubmenu.push(
            {
                type: "separator"
            },
            {
                label: "退出",
                click: function (item: any, focusedWindow: any) {
                    if (isCrashed(focusedWindow)) {
                        app.exit();
                    } else {
                        setForceQuit();
                        app.quit();
                    }
                }
            }
        );
    }

    return {
        label: "文件",
        submenu: fileMenuSubmenu
    };
}

////////////////////////////////////////////////////////////////////////////////

function buildEditMenu(win: IWindow | undefined) {
    const editSubmenu: Electron.MenuItemConstructorOptions[] = [
        {
            id: "undo",
            label: "撤销",
            accelerator: "CmdOrCtrl+Z",
            role: "undo",
            click: function (item, focusedWindow) {
                if (focusedWindow) {
                    const win = findWindowByBrowserWindow(focusedWindow);
                    if (win !== undefined && win.state.undo != null) {
                        win.browserWindow.webContents.send("undo");
                        return;
                    }
                }

                undoManager.undo();
            }
        },
        {
            id: "redo",
            label: "重做",
            accelerator: "CmdOrCtrl+Y",
            role: "redo",
            click: function (item, focusedWindow) {
                if (focusedWindow) {
                    const win = findWindowByBrowserWindow(focusedWindow);
                    if (win !== undefined && win.state.redo != null) {
                        win.browserWindow.webContents.send("redo");
                        return;
                    }
                }

                undoManager.redo();
            }
        },
        {
            type: "separator"
        },
        {
            label: "剪切",
            accelerator: "CmdOrCtrl+X",
            role: "cut",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("cut");
                }
            }
        },
        {
            label: "复制",
            accelerator: "CmdOrCtrl+C",
            role: "copy",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("copy");
                }
            }
        },
        {
            label: "粘贴",
            accelerator: "CmdOrCtrl+V",
            role: "paste",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("paste");
                }
            }
        },
        {
            label: "删除",
            accelerator: "Delete",
            role: "delete",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("delete");
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "全选",
            accelerator: "CmdOrCtrl+A",
            role: "selectAll",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("select-all");
                }
            }
        }
    ];

    if (win?.activeTabType === "project") {
        editSubmenu.push({
            type: "separator"
        });
        editSubmenu.push({
            label: "查找工程组件",
            accelerator: "CmdOrCtrl+Shift+F",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("findProjectComponent");
                }
            }
        });
    }

    const editMenu: Electron.MenuItemConstructorOptions = {
        label: "编辑",
        submenu: editSubmenu
    };

    enableMenuItem(
        <Electron.MenuItemConstructorOptions[]>editMenu.submenu,
        "undo",
        win !== undefined && win.state.undo != null
            ? !!win.state.undo
            : undoManager.canUndo
    );

    enableMenuItem(
        <Electron.MenuItemConstructorOptions[]>editMenu.submenu,
        "redo",
        win !== undefined && win.state.redo != null
            ? !!win.state.redo
            : undoManager.canRedo
    );

    return editMenu;
}

////////////////////////////////////////////////////////////////////////////////

function buildViewMenu(win: IWindow | undefined) {
    let viewSubmenu: Electron.MenuItemConstructorOptions[] = [];

    viewSubmenu.push(
        {
            label: "主页",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("openTab", "home");
                }
            }
        },
        {
            label: "历史",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("openTab", "history");
                }
            }
        },
        {
            label: "快捷键和组设置",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send(
                        "openTab",
                        "shortcutsAndGroups"
                    );
                }
            }
        },
        {
            label: "笔记",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send(
                        "openTab",
                        "homeSection_notebooks"
                    );
                }
            }
        },
        {
            label: "插件",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("openTab", "extensions");
                }
            }
        },
        {
            label: "设置",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("openTab", "settings");
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "项目编辑器剪贴板",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("showScrapbookManager");
                }
            }
        },
        {
            type: "separator"
        }
    );

    viewSubmenu.push(
        {
            label: "切换全屏",
            accelerator: (function () {
                if (isMacOs()) {
                    return "Ctrl+Command+F";
                } else {
                    return "F11";
                }
            })(),
            click: function (item, focusedWindow) {
                if (focusedWindow) {
                    focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
                }
            }
        },
        {
            label: "开发人员工具",
            accelerator: (function () {
                if (isMacOs()) {
                    return "Alt+Command+I";
                } else {
                    return "Ctrl+Shift+I";
                }
            })(),
            click: function (item, focusedWindow: any) {
                if (focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            }
        },
        {
            label: settings.isDarkTheme ? "使用亮色主题" : "使用深色主题",
            accelerator: (function () {
                if (isMacOs()) {
                    return "Alt+Command+T";
                } else {
                    return "Ctrl+Shift+T";
                }
            })(),
            click: function (item, focusedWindow: any) {
                if (focusedWindow) {
                    focusedWindow.webContents.send("switch-theme");
                }
            }
        },
        {
            type: "separator"
        },
        {
            label: "放大窗口",
            role: "zoomIn"
        },
        {
            label: "缩小窗口",
            role: "zoomOut"
        },
        {
            label: "重置窗口比例",
            role: "resetZoom"
        },
        {
            type: "separator"
        }
    );

    if (win?.activeTabType === "project") {
        viewSubmenu.push({
            type: "separator"
        });

        viewSubmenu.push({
            label: settings.showComponentsPaletteInProjectEditor
                ? "Hide Components Palette"
                : "Show Components Palette",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send(
                        "toggleComponentsPalette"
                    );
                }
            }
        });

        viewSubmenu.push({
            label: "重置布局",
            click: function (item) {
                if (win) {
                    win.browserWindow.webContents.send("resetLayoutModels");
                }
            }
        });

        viewSubmenu.push({
            type: "separator"
        });
    }

    viewSubmenu.push({
        label: "下一个选项卡",
        accelerator: "Ctrl+Tab",
        click: function (item) {
            if (win) {
                win.browserWindow.webContents.send("show-next-tab");
            }
        }
    });

    viewSubmenu.push({
        label: "上一个选项卡",
        accelerator: "Ctrl+Shift+Tab",
        click: function (item) {
            if (win) {
                win.browserWindow.webContents.send("show-previous-tab");
            }
        }
    });

    viewSubmenu.push({
        type: "separator"
    });

    viewSubmenu.push({
        label: "重新加载",
        accelerator: "CmdOrCtrl+R",
        click: function (item) {
            if (win) {
                win.browserWindow.webContents.send("reload");
                //focusedWindow.webContents.reload();
                //focusedWindow.webContents.clearHistory();
            }
        }
    });

    return {
        label: "视图",
        submenu: viewSubmenu
    };
}

////////////////////////////////////////////////////////////////////////////////

function buildMacOSWindowMenu(
    win: IWindow | undefined
): Electron.MenuItemConstructorOptions {
    return {
        label: "窗口",
        role: "window",
        submenu: [
            {
                label: "最小化",
                accelerator: "CmdOrCtrl+M",
                role: "minimize"
            },
            {
                label: "关闭",
                accelerator: "CmdOrCtrl+W",
                role: "close"
            },
            {
                type: "separator"
            },
            {
                label: "Bring All to Front",
                role: "front"
            }
        ]
    };
}

////////////////////////////////////////////////////////////////////////////////

function buildHelpMenu(
    win: IWindow | undefined
): Electron.MenuItemConstructorOptions {
    const helpMenuSubmenu: Electron.MenuItemConstructorOptions[] = [];

    if (isDev) {
        helpMenuSubmenu.push({
            label: "文档",
            accelerator: "F1",
            click: function (item: any, focusedWindow: any) {
                focusedWindow.webContents.send("show-documentation-browser");
            }
        });
        helpMenuSubmenu.push({
            type: "separator"
        });
    }

    helpMenuSubmenu.push({
        label: "关于",
        click: showAboutBox
    });

    return {
        label: "帮助",
        role: "help",
        submenu: helpMenuSubmenu
    };
}

////////////////////////////////////////////////////////////////////////////////

function buildMenuTemplate(win: IWindow | undefined) {
    var menuTemplate: Electron.MenuItemConstructorOptions[] = [];

    if (isMacOs()) {
        menuTemplate.push(buildMacOSAppMenu(win));
    }

    menuTemplate.push(buildFileMenu(win));

    menuTemplate.push(buildEditMenu(win));

    menuTemplate.push(buildViewMenu(win));

    if (isMacOs()) {
        menuTemplate.push(buildMacOSWindowMenu(win));
    } else {
        menuTemplate.push(buildHelpMenu(win));
    }

    return menuTemplate;
}

////////////////////////////////////////////////////////////////////////////////

autorun(() => {
    for (let i = 0; i < windows.length; i++) {
        const win = windows[i];
        if (win.focused) {
            let menuTemplate = buildMenuTemplate(win);
            let menu = Menu.buildFromTemplate(menuTemplate);
            Menu.setApplicationMenu(menu);
        }
    }
});

////////////////////////////////////////////////////////////////////////////////

ipcMain.on("getReservedKeybindings", function (event: any) {
    const menuTemplate = buildMenuTemplate(undefined);

    let keybindings: string[] = [];

    function addKeybinding(accelerator: Electron.Accelerator) {
        let keybinding = accelerator.toString();

        if (isMacOs()) {
            keybinding = keybinding.replace("CmdOrCtrl", "Meta");
            keybinding = keybinding.replace("CommandOrControl", "Meta");
        } else {
            keybinding = keybinding.replace("CmdOrCtrl", "Ctrl");
            keybinding = keybinding.replace("CommandOrControl", "Ctrl");
        }

        keybindings.push(keybinding);
    }

    function addKeybindings(menu: Electron.MenuItemConstructorOptions[]) {
        for (let i = 0; i < menu.length; i++) {
            const menuItem = menu[i];
            if (menuItem.accelerator) {
                addKeybinding(menuItem.accelerator);
            }
            if (menuItem.submenu && "length" in menuItem.submenu) {
                addKeybindings(
                    menuItem.submenu as Electron.MenuItemConstructorOptions[]
                );
            }
        }
    }

    addKeybindings(menuTemplate);

    event.returnValue = keybindings;
});

ipcMain.on("open-file", function (event, path, runMode) {
    openFile(path, undefined, runMode);
});

ipcMain.on("new-project", function (event) {
    createNewProject();
});

ipcMain.on("open-project", function (event) {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        openProjectWithFileDialog(focusedWindow);
    }
});
