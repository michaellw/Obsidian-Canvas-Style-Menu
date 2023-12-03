import { App, PluginSettingTab, Setting, TextAreaComponent } from 'obsidian';
import CanvasStyleMenuPlugin from "./main";
import { setAttributes } from "./utils";

export default class CanvasStyleMenuSettingTab extends PluginSettingTab {
    plugin: CanvasStyleMenuPlugin;

    constructor(app: App, plugin: CanvasStyleMenuPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        const menuItemSetting = new Setting(containerEl);
        menuItemSetting.settingEl.setAttribute(
            "style",
            "display: grid; grid-template-columns: 1fr;"
        );
        menuItemSetting
            .setName("Menu Items")
            .setDesc(
                "Set default Menu Config."
            );

        const menuItemContent = new TextAreaComponent(
            menuItemSetting.controlEl
        );
        setAttributes(menuItemContent.inputEl, {
            style: "margin-top: 12px; width: 100%; height: 16vh; resize:none;",
            class: "ms-css-editor",
        });
        menuItemContent
            .setValue(this.plugin.settings.menuItems.join('\n'))
            .onChange(async (value) => {
                const newArray = value.split('\n').map(item => item.trim());
                this.plugin.settings.menuItems = newArray;
                await this.plugin.saveSettings();
            });

        const subMenuItemSetting = new Setting(containerEl);
        subMenuItemSetting.settingEl.setAttribute(
            "style",
            "display: grid; grid-template-columns: 1fr;"
        );
        subMenuItemSetting
            .setName("Sub Menu Items")
            .setDesc(
                "Set default Sub Menu Config."
            );

        const subMenuItemContent = new TextAreaComponent(
            subMenuItemSetting.controlEl
        );
        setAttributes(subMenuItemContent.inputEl, {
            style: "margin-top: 12px; width: 100%; height: 24vh; resize:none;",
            class: "ms-css-editor",
        });
        subMenuItemContent
            .setValue(this.plugin.settings.subMenuItems.join('\n'))
            .onChange(async (value) => {
                const newArray = value.split('\n').map(item => item.trim());
                this.plugin.settings.subMenuItems = newArray;
                this.plugin.saveSettings();
            });
    }
}