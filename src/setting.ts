import fs from 'fs';
import path from 'path';
import { App, PluginSettingTab, Setting, Notice, Modal, getIconIds, setIcon, removeIcon, setTooltip } from 'obsidian';
import CanvasStyleMenuPlugin, { defaultSettings, savedSettings, csIconList } from "./main";
import { sortByProperty, renameKey, getFilesInDirectory } from "./utils";

interface MenuItemTypeChanged {
    oldType: string;
    newType: string;
}

class CanvasStyleMenuSetting extends Setting {
    settings: [] | {};
    key: string;
}

export default class CanvasStyleMenuSettingTab extends PluginSettingTab {
    plugin: CanvasStyleMenuPlugin;
    menuItemsContainerEl: HTMLDivElement;
    subMenuItemsContainerEl: HTMLDivElement;
    customIconsContainerEl: HTMLDivElement;
    configTabContainerEl: HTMLDivElement;
    menuItemsTabContainerEl: HTMLDivElement;
    customIconsTabContainerEl: HTMLDivElement;
    previousConfig: string;

    devMode: boolean = false;
    menuItemTypeChanged: MenuItemTypeChanged = { oldType: "", newType: "" };

    constructor(app: App, plugin: CanvasStyleMenuPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        const configs = this.plugin.settings.configs;
        const currentConfig = this.plugin.settings.currentConfig;
        const config = configs[currentConfig];

        const defaultConfigs = JSON.parse(JSON.stringify(defaultSettings));
        const savedConfigs = JSON.parse(JSON.stringify(savedSettings));

        const vaultDir = this.app.vault.adapter.basePath;
        const pluginDir = this.plugin.manifest.dir;
        const packagesFolder = path.join(vaultDir, pluginDir, 'packages');

        // settings header
        this.settingsHeaderContainerEl = containerEl.createDiv({
            cls: "settings-header-container",
        });

        // Style Pack Config
        new Setting(this.settingsHeaderContainerEl)
            .setName("Style Package")
            .setDesc("Manage installed style package and browse community style packages.")
            .addText(text => text
                .setPlaceholder('New Package Name')
            )
            .addExtraButton((component) =>
                component
                    .setIcon("save")
                    .setTooltip("Save as new package")
                    .onClick(async () => {
                        this.removePreviousIcons(currentConfig, savedConfigs);
                        const packageName = this.settingsHeaderContainerEl.querySelector('input').value;
                        if (packageName) {
                            await this.saveAsNewPackage(config, packageName);
                            new Notice('Package successfully saved');
                        }
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("rotate-ccw")
                    .setTooltip("Restore the current package defaults")
                    .onClick(async () => {
                        this.removePreviousIcons(currentConfig, savedConfigs);
                        if (currentConfig in savedConfigs) {
                            configs[currentConfig] = savedConfigs[currentConfig];
                        } else {
                            configs[currentConfig] = defaultConfigs[currentConfig];
                        }
                        await this.plugin.saveSettings();
                        this.plugin.registerCustomIcons();
                        this.plugin.patchCanvasMenu(true);
                        this.display();
                    })
            )
            .addDropdown((dropdown) => {
                Object.keys(configs).forEach((config) => {
                    const group = configs[config];
                    dropdown.addOption(config, group.name);
                });
                dropdown.setValue(currentConfig);
                dropdown.onChange(async (value) => {
                    this.removePreviousIcons(currentConfig, savedConfigs);
                    this.plugin.settings.currentConfig = value;
                    await this.plugin.saveSettings();
                    this.plugin.registerCustomIcons();
                    this.plugin.patchCanvasMenu(true);
                    this.display();
                });
            })
            .addExtraButton((component) =>
                component
                    .setIcon("folder-open")
                    .setTooltip("Open packages folder")
                    .onClick(() => {
                        const { exec } = require('child_process');
                        fs.mkdir(packagesFolder, (err) => {
                            if (err) {
                                if (err.code === 'EEXIST') {
                                    exec(`start explorer ${packagesFolder}`);
                                } else {
                                    console.error('Failed to create style packages folder:', err);
                                }
                            } else {
                                exec(`start explorer ${packagesFolder}`);
                            }
                        });
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("refresh-cw")
                    .setTooltip("Reload packages")
                    .onClick(() => {
                        fs.mkdir(packagesFolder, (err) => {
                            if (err) {
                                if (err.code === 'EEXIST') {
                                } else {
                                    console.error(`Failed to create style packages folder: ${err}`);
                                }
                            } else {}
                        });
                        const packageFiles = getFilesInDirectory(packagesFolder);
                        if (packageFiles) {
                            packageFiles.forEach(packageFile => {
                                const packageFilePath = path.join(packagesFolder, packageFile);
                                let importedPackage = {};
                                fs.readFile(packageFilePath, 'utf-8', async (err, contentAsync) => {
                                    if (err) {
                                        console.error(err);
                                        return;
                                    }
                                    importedPackage = JSON.parse(contentAsync);
                                    const importedConfig = Object.keys(importedPackage)[0];
                                    if (!(importedConfig in this.plugin.settings.configs)) {
                                        this.plugin.settings.configs = { ...this.plugin.settings.configs, ...importedPackage };
                                        this.plugin.settings.savedConfigs = JSON.parse(JSON.stringify({ ...this.plugin.settings.savedConfigs, ...importedPackage }));
                                        await this.plugin.saveSettings();
                                        this.plugin.savedSettings();
                                        this.display();
                                        
                                    }
                                });
                            });
                            new Notice('Reloaded style packages');
                        }
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("upload")
                    .setTooltip("Export package")
                    .onClick(() => {
                        fs.mkdir(packagesFolder, (err) => {
                            if (err) {
                                if (err.code === 'EEXIST') {
                                } else {
                                    console.error(`Failed to create style packages folder: ${err}`);
                                }
                            } else {}
                        });
                        const exportedPackage = {[currentConfig]: config};
                        const jsonString = JSON.stringify(exportedPackage, null, 2);
                        const packageFile = `${currentConfig}.json`;
                        const packageFilePath = path.join(packagesFolder, packageFile);
                        fs.writeFile(packageFilePath, jsonString, (err) => {
                            if (err) {
                                new Notice(`Error writing JSON file: ${err}`);
                            } else {
                                new Notice('Package successfully exported');
                            }
                        });
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("trash")
                    .setTooltip("Delete package")
                    .onClick(async () => {
                        this.removePreviousIcons(currentConfig, savedConfigs);
                        if (currentConfig in savedConfigs) {
                        //if (currentConfig !== 'default') {
                            delete this.plugin.settings.savedConfigs[currentConfig];
                            delete configs[currentConfig];
                            this.plugin.settings.currentConfig = 'default';
                            await this.plugin.saveSettings();
                            this.plugin.registerCustomIcons();
                            this.plugin.patchCanvasMenu(true);
                            this.display();
                        }
                    })
                    .then(cb => {
                        if (currentConfig in savedConfigs) {
                        //if (currentConfig !== 'default') {
                            cb.extraSettingsEl.addClass("mod-warning");
                        } else {
                            cb.extraSettingsEl.addClass("disabled");
                        }
                    })
            )
            //.addButton((component) =>
            //    component
            //        .setButtonText("Manage")
            //        .setClass("mod-cta")
            //        .onClick(() => {
            //        })
            //);

        // config tab
        this.configTabContainerEl = containerEl.createDiv({
            cls: "config-tab-container",
        });

        new Setting(this.configTabContainerEl)
            .addExtraButton((component) =>
                component
                    .setIcon("settings-2")
                    .onClick(() => {
                        if (this.customIconsTabContainerEl.classList.contains("actived")) {
                            this.customIconsTabContainerEl.removeClass("actived");
                        }
                        this.menuItemsTabContainerEl.addClass("actived");
                        if (this.configTabContainerEl.querySelector(".custom-icons-tab.actived")) {
                            this.configTabContainerEl.querySelector(".custom-icons-tab.actived").removeClass("actived");
                        }
                        component.extraSettingsEl.addClass("actived");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("menu-items-tab");
                        cb.extraSettingsEl.addClass("actived");
                        cb.extraSettingsEl.setAttr("data-label", "Menu Items");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("shapes")
                    .onClick(() => {
                        if (this.menuItemsTabContainerEl.classList.contains("actived")) {
                            this.menuItemsTabContainerEl.removeClass("actived");
                        }
                        this.customIconsTabContainerEl.addClass("actived");
                        if (this.configTabContainerEl.querySelector(".menu-items-tab.actived")) {
                            this.configTabContainerEl.querySelector(".menu-items-tab.actived").removeClass("actived");
                        }
                        component.extraSettingsEl.addClass("actived");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("custom-icons-tab");
                        cb.extraSettingsEl.setAttr("data-label", "Custom Icons");
                    })
            )

        // Menu Items Config
        this.menuItemsTabContainerEl = containerEl.createDiv({
            cls: "setting-tab-container menu-items-tab-container actived",
        });

        new Setting(this.menuItemsTabContainerEl)
            .setName("Menu Items")
            .setDesc("Set menu items config.")
            .addExtraButton((component) =>
                component
                    .setIcon("chevrons-up-down")
                    .setTooltip("Expand all")
                    .onClick(() => {
                        config.menuItems.forEach(menuItem => {
                            if (!menuItem.expanded) {
                                menuItem.expanded = true;
                            }
                        })
                        this.display();
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("chevrons-down-up")
                    .setTooltip("Collapse All")
                    .onClick(() => {
                        config.menuItems.forEach(menuItem => {
                            if (menuItem.expanded) {
                                menuItem.expanded = false;
                            }
                        })
                        this.display();
                    })
            )
            .addButton((component) =>
                component
                    .setButtonText("Add Menu Item")
                    .setClass("mod-cta")
                    .onClick(() => {
                        newMenuItemSettingContainerEl.addClass("add-setting");
                    })
            );

        this.menuItemsContainerEl = this.menuItemsTabContainerEl.createDiv({
            cls: "setting-item-container menu-items-container",
        });

        for (let menuItem of config.menuItems) {
            this.renderMenuItemsSetting(
                config,
                menuItem,
                config.menuItems
            );
        }

        const newMenuItemSettingContainerEl = this.menuItemsContainerEl.createDiv({
            cls: "setting-item-container new-menu-item-setting-container",
        });

        this.buildNewMenuItemSetting(newMenuItemSettingContainerEl, async (menuItem) => {
            config.menuItems.push(menuItem);
            config.menuItems = sortByProperty(config.menuItems, 'cat')
            if (!Object.keys(config.subMenuItems).contains(menuItem.type)) {
                config.subMenuItems[menuItem.type] = [];
            }
            await this.plugin.saveSettings();
            this.plugin.patchCanvasMenu(true);

            // Re-draw.
            this.display();
        });

        // Custom Icons Config
        this.customIconsTabContainerEl = containerEl.createDiv({
            cls: "setting-tab-container custom-icons-tab-container",
        });

        new Setting(this.customIconsTabContainerEl)
            .setName("Custom Icons")
            .setDesc("Add custom icons.")
            .addButton((component) =>
                component
                    .setButtonText("Add Custom Icon")
                    .setClass("mod-cta")
                    .onClick(() => {
                        newCustomIconSettingContainerEl.addClass("add-setting");
                    })
            );


        this.customIconsContainerEl = this.customIconsTabContainerEl.createDiv({
            cls: "setting-item-container custom-icons-container",
        });

        config.customIcons.forEach(icon => {
            this.renderCustomIconsSetting(
                config,
                icon
            );
        });

        const newCustomIconSettingContainerEl = this.customIconsContainerEl.createDiv({
            cls: "setting-item-container new-custom-icon-setting-container",
        });

        this.buildNewIconSetting(newCustomIconSettingContainerEl, async (icon) => {
            config.customIcons.push(icon);
            await this.plugin.saveSettings();
            this.plugin.registerCustomIcons();

            // Re-draw.
            this.display();
            this.menuItemsTabContainerEl.removeClass("actived");
            this.customIconsTabContainerEl.addClass("actived");
            this.configTabContainerEl.querySelector(".menu-items-tab.actived").removeClass("actived");
            this.configTabContainerEl.querySelector(".custom-icons-tab").addClass("actived");
        });
    }

    renderMenuItemsSetting(config, menuItem: MenuItem, settings: MenuItem) {
        const cls = menuItem.class;
        const type = menuItem.type;
        const icon = menuItem.icon;
        const name = menuItem.name;
        const cat = menuItem.cat;
        const selector = menuItem.selector;
        const index = config.menuItems.indexOf(menuItem);
        if (this.devMode) {
            if (type === this.menuItemTypeChanged.newType) {
                renameKey(config.subMenuItems, this.menuItemTypeChanged.oldType, this.menuItemTypeChanged.newType);
                this.plugin.saveSettings();
            }
        }
        const subMenuItems = config.subMenuItems[type];
        const setting = new CanvasStyleMenuSetting(this.menuItemsContainerEl)
            .addExtraButton((component) =>
                component
                    .setIcon("chevron-right")
                    .onClick(async () => {
                        config.menuItems[index].expanded = !config.menuItems[index].expanded;
                        await this.plugin.saveSettings();
                        if (config.menuItems[index].expanded) {
                            component.setIcon("chevron-down");
                            component.extraSettingsEl.removeClass("setting-expanded-false");
                            component.extraSettingsEl.addClass("setting-expanded-true");
                        }
                        else {
                            component.setIcon("chevron-right");
                            component.extraSettingsEl.removeClass("setting-expanded-true");
                            component.extraSettingsEl.addClass("setting-expanded-false");
                        }
                    })
                    .then(cb => {
                        if (subMenuItems.length === 0) cb.extraSettingsEl.addClass("nosub");
                        cb.extraSettingsEl.addClass("setting-expanded-true");
                        if (!config.menuItems[index].expanded) {
                            cb.extraSettingsEl.removeClass("setting-expanded-true");
                            cb.extraSettingsEl.addClass("setting-expanded-false");
                            cb.setIcon("chevron-right");
                        } else cb.setIcon("chevron-down");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon(icon)
                    .onClick(() => {
                        new SelectIconModal(this.app, this.plugin, component, 'menuItem', config, index).open();
                    })
            )
            .addText(text => text
                .setPlaceholder('CSS Class')
                .setValue(cls)
                .onChange(async (value) => {
                    config.menuItems[index].class = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setPlaceholder('Type')
                .setValue(type)
                .onChange(async (value) => {
                    config.menuItems[index].type = value;
                    if (this.devMode) {
                        config.subMenuItems[type].forEach(subMenuItem => {
                            subMenuItem.type = value;
                        })
                        await this.plugin.saveSettings();
                        this.menuItemTypeChanged = {oldType: type, newType: value};
                        this.plugin.patchCanvasMenu(true);
                    } else {
                        await this.plugin.saveSettings();
                    }
                })
                .setDisabled(true)
                .inputEl.addClass("disabled")
            )
            .addText(text => text
                .setPlaceholder('Name')
                .setValue(name)
                .onChange(async (value) => {
                    config.menuItems[index].name = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton((component) => {
                component
                    .setIcon("git-commit-horizontal")
                    .setTooltip("For connection line")
                    .onClick(async () => {
                        if (this.devMode) {
                            const ctxmenu = setting.components.find(obj => obj.extraSettingsEl?.classList.contains("setting-ctxmenu-check"));
                            if (!config.menuItems[index].cat) {
                                config.menuItems[index].cat = 'edge';
                                component.extraSettingsEl.removeClass("setting-edge-check");
                                component.extraSettingsEl.addClass("setting-edge-checked");
                                ctxmenu.extraSettingsEl.addClass("disabled");
                            } else {
                                config.menuItems[index].cat = '';
                                component.extraSettingsEl.removeClass("setting-edge-checked");
                                component.extraSettingsEl.addClass("setting-edge-check");
                                ctxmenu.extraSettingsEl.removeClass("disabled");
                            }
                            await this.plugin.saveSettings();
                        }
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-edge-check");
                        if (config.menuItems[index].cat) {
                            cb.extraSettingsEl.removeClass("setting-edge-check");
                            cb.extraSettingsEl.addClass("setting-edge-checked");
                        }
                        if (config.menuItems[index].ctxmenu) {
                            cb.extraSettingsEl.addClass("disabled");
                        }
                        cb.extraSettingsEl.addClass("disabled");
                    });
                })
            .addExtraButton((component) => {
                component
                    .setIcon("cs-badge-cc")
                    .setTooltip("Use cssclasses styling")
                    .onClick(async () => {
                        if (this.devMode) {
                            if (!config.menuItems[index].selector) {
                                config.menuItems[index].selector = 'cc';
                                component.extraSettingsEl.removeClass("setting-cc-check");
                                component.extraSettingsEl.addClass("setting-cc-checked");
                            } else {
                                config.menuItems[index].selector = '';
                                component.extraSettingsEl.removeClass("setting-cc-checked");
                                component.extraSettingsEl.addClass("setting-cc-check");
                            }
                            await this.plugin.saveSettings();
                        }
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-cc-check");
                        if (config.menuItems[index].selector) {
                            cb.extraSettingsEl.removeClass("setting-cc-check");
                            cb.extraSettingsEl.addClass("setting-cc-checked");
                        }
                        cb.extraSettingsEl.addClass("disabled");
                    });
                })
            .addExtraButton((component) => {
                component
                    .setIcon("cs-input-check")
                    .setTooltip("Show in context menu")
                    .onClick(async () => {
                        //const edge = setting.components.find(obj => obj.extraSettingsEl?.classList.contains("setting-edge-check"));
                        config.menuItems[index].ctxmenu = !config.menuItems[index].ctxmenu;
                        if (config.menuItems[index].ctxmenu) {
                            component.extraSettingsEl.removeClass("setting-ctxmenu-check");
                            component.extraSettingsEl.addClass("setting-ctxmenu-checked");
                            //edge.extraSettingsEl.addClass("disabled");
                        } else {
                            component.extraSettingsEl.removeClass("setting-ctxmenu-checked");
                            component.extraSettingsEl.addClass("setting-ctxmenu-check");
                            //edge.extraSettingsEl.removeClass("disabled");
                        }
                        await this.plugin.saveSettings();
                    })
                    .then(cb => {
                        if (subMenuItems.length === 0) cb.extraSettingsEl.addClass("nosub");
                        cb.extraSettingsEl.addClass("setting-ctxmenu-check");
                        if (config.menuItems[index].ctxmenu) {
                            cb.extraSettingsEl.removeClass("setting-ctxmenu-check");
                            cb.extraSettingsEl.addClass("setting-ctxmenu-checked");
                        }
                        if (config.menuItems[index].cat === 'edge') {
                            cb.extraSettingsEl.addClass("disabled");
                        }
                    });
                })
            .addExtraButton((component) =>
                component
                    .setIcon("plus-circle")
                    .setTooltip("Add sub menu item")
                    .onClick(() => {
                        if (!config.menuItems[index].expanded) {
                            config.menuItems[index].expanded = true;
                            setting.components[0].extraSettingsEl.removeClass("setting-expanded-false");
                            setting.components[0].extraSettingsEl.addClass("setting-expanded-true");
                            setting.components[0].setIcon("chevron-down");
                            newSubMenuItemSettingContainerEl.addClass("add-setting");
                        }
                        newSubMenuItemSettingContainerEl.addClass("add-setting");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-up")
                    .onClick(() => {
                        this.moveSetting(setting, false);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-item-controller");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-down")
                    .onClick(() => {
                        this.moveSetting(setting, true);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-item-controller");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(async () => {
                        config.menuItems.splice(index, 1);
                        delete config.subMenuItems[type];
                        //if (subMenuItems.length === 0) delete config.subMenuItems[type];
                        await this.plugin.saveSettings();
                        this.plugin.patchCanvasMenu(true);
                        this.display();
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(config.menuItems[index].enable)
                    .onChange(async (value) => {
                        config.menuItems[index].enable = value;
                        await this.plugin.saveSettings();
                    });
                })
            .then((mn: CanvasStyleMenuSetting) => {
                mn.settings = settings;
                mn.settingEl.addClass("menu-item-setting");
            });

        this.subMenuItemsContainerEl = setting.settingEl.createDiv({
            cls: `setting-item-container submenu-items-container ${type}-items-container`,
        });

        for (let subMenuItem of subMenuItems) {
            this.renderSubMenuItemsSetting(
                config,
                subMenuItem,
                subMenuItems
            );
        }

        const newSubMenuItemSettingContainerEl = this.subMenuItemsContainerEl.createDiv({
            cls: "setting-item-container new-submenu-item-setting-container",
        });

        this.buildNewSubMenuItemSetting(newSubMenuItemSettingContainerEl, type, async (subMenuItem) => {
            subMenuItems.push(subMenuItem);
            await this.plugin.saveSettings();
            this.plugin.patchCanvasMenu(true);

            // Re-draw.
            this.display();
        });

        return setting;
    }

    renderSubMenuItemsSetting(config, subMenuItem: SubMenuItem, settings: SubMenuItem) {
        const cls = subMenuItem.class;
        const type = subMenuItem.type;
        const icon = subMenuItem.icon;
        const name = subMenuItem.name;
        const selector = subMenuItem.selector;
        const index = settings.indexOf(subMenuItem);
        const subMenuItems = config.subMenuItems[type];
        const setting = new CanvasStyleMenuSetting(this.subMenuItemsContainerEl)
            .addExtraButton((component) =>
                component
                    .setIcon("grip-vertical")
            )
            .addExtraButton((component) =>
                component
                    .setIcon(icon)
                    .onClick(() => {
                        new SelectIconModal(this.app, this.plugin, component, 'subMenuItem', subMenuItems, index).open();
                    })
            )
            .addText(text => text
                .setPlaceholder('CSS Class')
                .setValue(cls)
                .onChange(async (value) => {
                    subMenuItems[index].class = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setValue(type)
                .setDisabled(true)
                .inputEl.addClass("hidden")
            )
            .addText(text => text
                .setPlaceholder('Name')
                .setValue(name)
                .onChange(async (value) => {
                    subMenuItems[index].name = value;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .setIcon("cs-badge-cc")
                    .setTooltip("Use cssclasses styling")
                    .onClick(async () => {
                        if (this.devMode) {
                            if (!subMenuItems[index].selector) {
                                subMenuItems[index].selector = 'cc';
                                component.extraSettingsEl.removeClass("setting-cc-check");
                                component.extraSettingsEl.addClass("setting-cc-checked");
                            } else {
                                subMenuItems[index].selector = '';
                                component.extraSettingsEl.removeClass("setting-cc-checked");
                                component.extraSettingsEl.addClass("setting-cc-check");
                            }
                            await this.plugin.saveSettings();
                        }
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-cc-check");
                        if (subMenuItems[index].selector) {
                            cb.extraSettingsEl.removeClass("setting-cc-check");
                            cb.extraSettingsEl.addClass("setting-cc-checked");
                        }
                        cb.extraSettingsEl.addClass("disabled");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-up")
                    .onClick(() => {
                        this.moveSetting(setting, false);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-item-controller");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon("arrow-down")
                    .onClick(() => {
                        this.moveSetting(setting, true);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-item-controller");
                    })
            )
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(async () => {
                        subMenuItems.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.plugin.patchCanvasMenu(true);
                        this.display();
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
            )
            .addToggle((toggle) => {
                toggle
                    .setValue(subMenuItems[index].enable)
                    .onChange(async (value) => {
                        subMenuItems[index].enable = value;
                        await this.plugin.saveSettings();
                    });
                })
            .then((mn: CanvasStyleMenuSetting) => {
                mn.settings = settings;
                mn.settingEl.addClass("submenu-item-setting");
            });

        return setting;
    }

    renderCustomIconsSetting(config, icon: CustomIcon) {
        const name = icon.name;
        const svgContent = icon.svgContent.replace(/^`|`$/g, '');
        const index = config.customIcons.indexOf(icon);
        const setting = new CanvasStyleMenuSetting(this.customIconsContainerEl)
            .addExtraButton((component) =>
                component
                    .setIcon(name)
            )
            .addText(text => text
                .setPlaceholder('Icon Name')
                .setValue(name)
                .onChange(async (value) => {
                    config.customIcons[index].name = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setPlaceholder('SVG Content')
                .setValue(svgContent)
                .onChange(async (value) => {
                    config.customIcons[index].svgContent = `${value}`;
                    await this.plugin.saveSettings();
                    this.plugin.registerCustomIcons();
                    this.display();
                }))
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(async () => {
                        config.customIcons.splice(index, 1);
                        await this.plugin.saveSettings();
                        removeIcon(name);
                        this.display();
                        this.menuItemsTabContainerEl.removeClass("actived");
                        this.customIconsTabContainerEl.addClass("actived");
                        this.configTabContainerEl.querySelector(".menu-items-tab.actived").removeClass("actived");
                        this.configTabContainerEl.querySelector(".custom-icons-tab").addClass("actived");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
                );

        return setting;
    }

    buildNewMenuItemSetting(containerEl: HTMLElement, onSubmit: (menuItem: MenuItem) => void) {
        const menuItem: MenuItem = {
            class: '',
            type: '',
            icon: '',
            name: '',
            cat: '',
            selector: '',
            ctxmenu: false,
            enable: true,
        };

        const setting = new Setting(containerEl)
            .addExtraButton((component) =>
                component
                    .setIcon('plus')
                    .onClick(() => {
                        onSubmit(menuItem);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-cta");
                    })
                )
            .addExtraButton((component) =>
                component
                    .setIcon('cs-circle-dashed')
                    .onClick(() => {
                        const callback = (iconName: string) => {
                            menuItem.icon = iconName;
                        };
                        new SelectIconModal(this.app, this.plugin, component, 'addNew', null, null, callback).open();
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("icon-selector");
                    })
                )
            .addText(text => text
                .setPlaceholder('CSS Class')
                .setValue('')
                .onChange((value) => {
                    menuItem.class = value;
                }))
            .addText(text => text
                .setPlaceholder('Type')
                .setValue('')
                .onChange((value) => {
                    menuItem.type = value;
                }))
            .addText(text => text
                .setPlaceholder('Name')
                .setValue('')
                .onChange((value) => {
                    menuItem.name = value;
                }))
            .addExtraButton((component) => {
                component
                    .setIcon("git-commit-horizontal")
                    .setTooltip("For connection line")
                    .onClick(() => {
                        const cc = setting.components.find(obj => obj.extraSettingsEl?.classList.contains("setting-cc-check"));
                        if (!menuItem.cat && cc) {
                            menuItem.cat = 'edge';
                            component.extraSettingsEl.removeClass("setting-edge-check");
                            component.extraSettingsEl.addClass("setting-edge-checked");
                            cc.extraSettingsEl.addClass("disabled");
                        } else {
                            menuItem.cat = '';
                            component.extraSettingsEl.removeClass("setting-edge-checked");
                            component.extraSettingsEl.addClass("setting-edge-check");
                            if (cc) cc.extraSettingsEl.removeClass("disabled");
                        }
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-edge-check");
                        if (menuItem.cat) {
                            cb.extraSettingsEl.removeClass("setting-edge-check");
                            cb.extraSettingsEl.addClass("setting-edge-checked");
                        }
                    });
                })
            .addExtraButton((component) => {
                component
                    .setIcon("cs-badge-cc")
                    .setTooltip("Use cssclasses styling")
                    .onClick(() => {
                        const edge = setting.components.find(obj => obj.extraSettingsEl?.classList.contains("setting-edge-check"));
                        if (!menuItem.selector && edge) {
                            menuItem.selector = 'cc';
                            component.extraSettingsEl.removeClass("setting-cc-check");
                            component.extraSettingsEl.addClass("setting-cc-checked");
                            edge.extraSettingsEl.addClass("disabled");
                        } else {
                            menuItem.selector = '';
                            component.extraSettingsEl.removeClass("setting-cc-checked");
                            component.extraSettingsEl.addClass("setting-cc-check");
                            if (edge) edge.extraSettingsEl.removeClass("disabled");
                        }
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("setting-cc-check");
                        if (menuItem.selector) {
                            cb.extraSettingsEl.removeClass("setting-cc-check");
                            cb.extraSettingsEl.addClass("setting-cc-checked");
                        }
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(() => {
                        setting.settingEl.parentElement.removeClass("add-setting");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
            )
            .addToggle(toggle => toggle
                .toggleEl.addClass("hidden")
            )

        return setting;
    }

    buildNewSubMenuItemSetting(containerEl: HTMLElement, type: string, onSubmit: (subMenuItem: SubMenuItem) => void) {
        const subMenuItem: SubMenuItem = {
            class: '',
            type: type,
            icon: '',
            name: '',
            selector: '',
            enable: true,
        };

        const setting = new Setting(containerEl)
            .addExtraButton((component) =>
                component
                    .setIcon('plus')
                    .onClick(() => {
                        onSubmit(subMenuItem);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-cta");
                    })
                )
            .addExtraButton((component) =>
                component
                    .setIcon('cs-circle-dashed')
                    .onClick(() => {
                        const callback = (iconName: string) => {
                            subMenuItem.icon = iconName;
                        };
                        new SelectIconModal(this.app, this.plugin, component, 'addNew', null, null, callback).open();
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("icon-selector");
                    })
                )
            .addText(text => text
                .setPlaceholder('CSS Class')
                .setValue('')
                .onChange((value) => {
                    subMenuItem.class = value;
                }))
            .addText(text => text
                .setValue(type)
                .setDisabled(true)
                .inputEl.addClass("hidden")
                )
            .addText(text => text
                .setPlaceholder('Name')
                .setValue('')
                .onChange((value) => {
                    subMenuItem.name = value;
                }))
                        .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .setIcon("cs-badge-cc")
                    .setTooltip("Use cssclasses styling")
                    .onClick(() => {
                        if (!subMenuItem.selector) {
                            subMenuItem.selector = 'cc';
                            component.extraSettingsEl.addClass("setting-cc-checked");
                        } else {
                            subMenuItem.selector = '';
                            component.extraSettingsEl.removeClass("setting-cc-checked");
                        }
                    })
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) => {
                component
                    .then(cb => {
                        cb.extraSettingsEl.addClass("hidden");
                    });
                })
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(() => {
                        setting.settingEl.parentElement.removeClass("add-setting");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
            )
            .addToggle(toggle => toggle
                .toggleEl.addClass("hidden")
            )

        return setting;
    }

    buildNewIconSetting(containerEl: HTMLElement, onSubmit: (icon: CustomIcon) => void) {
        const icon: CustomIcon = {
            name: '',
            svgContent: ``,
        };

        const setting = new Setting(containerEl)
            .addExtraButton((component) =>
                component
                    .setIcon('plus')
                    .onClick(() => {
                        onSubmit(icon);
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-cta");
                    })
                )
            .addText(text => text
                .setPlaceholder('Icon Name')
                .setValue('')
                .onChange((value) => {
                    icon.name = value;
                }))
            .addText(text => text
                .setPlaceholder('SVG Content')
                .setValue(``)
                .onChange((value) => {
                    icon.svgContent = `${value}`;
                }))
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(() => {
                        setting.settingEl.parentElement.removeClass("add-setting");
                    })
                    .then(cb => {
                        cb.extraSettingsEl.addClass("mod-warning");
                    })
            );

        return setting;
    }

    async saveAsNewPackage(config, packageName: string) {
        this.plugin.settings.configs[packageName] = {
            name: packageName,
            menuItems: [],
            subMenuItems: {},
            customIcons: [],
        };

        this.plugin.settings.savedConfigs[packageName] = {
            name: packageName,
            menuItems: [],
            subMenuItems: {},
            customIcons: [],
        };

        this.plugin.settings.configs[packageName].menuItems = config.menuItems;
        this.plugin.settings.configs[packageName].subMenuItems = config.subMenuItems;
        this.plugin.settings.configs[packageName].customIcons = config.customIcons;

        this.plugin.settings.savedConfigs[packageName].menuItems = JSON.parse(JSON.stringify(config.menuItems));
        this.plugin.settings.savedConfigs[packageName].subMenuItems = JSON.parse(JSON.stringify(config.subMenuItems));
        this.plugin.settings.savedConfigs[packageName].customIcons = JSON.parse(JSON.stringify(config.customIcons));

        this.plugin.settings.currentConfig = packageName;
        await this.plugin.saveSettings();
        this.plugin.savedSettings();
        this.plugin.registerCustomIcons();
        this.plugin.patchCanvasMenu(true);
        this.display();
    }

    async moveSetting(setting: CanvasStyleMenuSetting, isMoveDown: boolean) {
        const settings = setting.settings;
        if (settings instanceof Array) {
            const settingEl = setting.settingEl;

            const parentEl = settingEl.parentElement;

            if (parentEl == null) return;

            const index = Array.from(parentEl.children).indexOf(settingEl);

            if (isMoveDown) {
                if (index == settings.length - 1) return;

                parentEl.insertAfter(settingEl, settingEl.nextElementSibling);
                settings.splice(index + 1, 0, settings.splice(index, 1)[0]);
            } else {
                if (index <= 0) return;

                parentEl.insertBefore(settingEl, settingEl.previousElementSibling);
                settings.splice(index - 1, 0, settings.splice(index, 1)[0]);
            }

            await this.plugin.saveSettings();
            this.plugin.patchCanvasMenu();
            this.display();
        }
    }

    removePreviousIcons(currentConfig: string, savedConfigs) {
        const previousConfig = currentConfig.slice();
        let previousIcons = [];
        if (currentConfig in savedConfigs) {
            previousIcons = this.plugin.settings.savedConfigs[previousConfig].customIcons.map(icon => icon.name);
        } else {
            previousIcons = this.plugin.settings.configs[previousConfig].customIcons.map(icon => icon.name);
        }
        previousIcons.forEach((icon) => {
            removeIcon(icon);
        });
    }
}

class SelectIconModal extends Modal {
    constructor(app: App, plugin: CanvasStyleMenuPlugin, component: HTMLElement, container: string, config, index, callback: (iconName: string) => Promise<void>) {
        super(app, plugin);
        this.plugin = plugin;
        this.component = component;
        this.container = container;
        this.config = config;
        this.index = index;
        this.callback = callback;
    }

    onOpen() {
        const {contentEl} = this;
        const iconList = contentEl.createDiv('icon-list-container', (el) => {
            el.createDiv(
                {
                    cls: 'clickable-icon cs-icons actived',
                    attr: {
                        'data-label': 'csIcons',
                    },
                },
                (item) => {
                    setIcon(item, "shapes");
                    item.onClickEvent(() => {
                        if (el.querySelector(".builtin-icons.actived")) {
                            el.querySelector(".builtin-icons.actived").removeClass("actived");
                        };
                        item.addClass("actived");
                        if (this.contentEl.querySelector(".builtin-icons-container.actived")) {
                            this.contentEl.querySelector(".builtin-icons-container.actived").removeClass("actived");
                        };
                        this.contentEl.querySelector(".cs-icons-container").addClass("actived");
                    });
                    item.createEl("div", { text: "Custom Icons", cls: 'icon-list-name' });
                }
            );
            el.createDiv(
                {
                    cls: 'clickable-icon builtin-icons',
                    attr: {
                        'data-label': 'built-in Icons',
                    },
                },
                (item) => {
                    setIcon(item, "blocks");
                    item.onClickEvent(() => {
                        if (el.querySelector(".cs-icons.actived")) {
                            el.querySelector(".cs-icons.actived").removeClass("actived");
                        };
                        item.addClass("actived");
                        if (this.contentEl.querySelector(".cs-icons-container.actived")) {
                            this.contentEl.querySelector(".cs-icons-container.actived").removeClass("actived");
                        };
                        this.contentEl.querySelector(".builtin-icons-container").addClass("actived");
                    });
                    item.createEl("div", { text: "Built-in Icons", cls: 'icon-list-name' });
                }
            );
        });

        const csIcons = this.createIconContainer('cs-icons-container actived', csIconList);
        const builtInIcons = this.createIconContainer('builtin-icons-container', getIconIds().filter(item => !csIconList.includes(item)));
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }

    createIconContainer(containerId: string, iconList: string[]) {
        const container = this.contentEl.createDiv(containerId, (el) => {
            iconList.forEach((icon) => {
                el.createDiv(
                    {
                        cls: 'clickable-icon',
                        attr: {
                            'data-icon': icon,
                        },
                    },
                    (item) => {
                        setIcon(item, icon);
                        setTooltip(item, icon);
                        item.onClickEvent(async () => {
                            if (this.container === 'menuItem') {
                                this.config.menuItems[this.index].icon = icon;
                                await this.plugin.saveSettings();
                            }
                            if (this.container === 'subMenuItem') {
                                this.config[this.index].icon = icon;
                                await this.plugin.saveSettings();
                            }
                            if (this.container === 'addNew') {
                                await this.callback(icon)
                            }
                            this.component.setIcon(icon);
                            this.close();
                        });
                    }
                );
            });
        });

        return container;
    }
}