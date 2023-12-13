import { App, PluginSettingTab, Setting, ButtonComponent, TextAreaComponent, TextComponent } from 'obsidian';
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
            .setDesc("Set default Menu Config.");

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
            .setDesc("Set default Sub Menu Config.");

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
                await this.plugin.saveSettings();
            });

        const customIconsSetting = new Setting(containerEl);
        customIconsSetting.settingEl.setAttribute(
            "style",
            "display: grid; grid-template-columns: 1fr;"
        );
        customIconsSetting
            .setName("Custom Icons")
            .setDesc("Set Custom Icons Config.");

        this.customIconsContainerEl = containerEl.createDiv({
            cls: "setting-item-container custom-icons-container",
        });

        this.plugin.settings.customIcons.forEach(icon => {
            this.renderCustomIconsSetting(this.customIconsContainerEl, icon, this.plugin);
        });

        this.buildNewIconSetting(this.customIconsContainerEl, (icon) => {
            this.plugin.settings.customIcons.push(icon);
            this.plugin.saveSettings();

            // Re-draw.
            this.display();
        });
    }

    renderCustomIconsSetting(containerEl: HTMLElement, icon: Icon) {
        const iconName = icon.iconName;
        const svgContent = icon.svgContent.replace(/^`|`$/g, '');
        const index = this.plugin.settings.customIcons.indexOf(icon);
        const setting = new Setting(containerEl)
            .addExtraButton((component) =>
                component
                    .setIcon(iconName)
            )
            .addText(text => text
                .setPlaceholder('iconName')
                .setValue(iconName)
                .onChange(async (value) => {
                    this.plugin.settings.customIcons[index].iconName = value;
                    await this.plugin.saveSettings();
                }))
            .addText(text => text
                .setPlaceholder('svgContent')
                .setValue(svgContent)
                .onChange(async (value) => {
                    this.plugin.settings.customIcons[index].svgContent = `${value}`;
                    await this.plugin.saveSettings();
                }))
            .addExtraButton((component) =>
                component
                    .setIcon('x')
                    .onClick(() => {
                        this.plugin.settings.customIcons.splice(index, 1);
                        this.plugin.saveSettings();
                        this.display();
                    })
            );

        return setting;
    }

    buildNewIconSetting(containerEl: HTMLElement, onSubmit: (icon: Icon) => void) {
        const icon: Icon = {
            iconName: '',
            svgContent: ``,
        };

        const setting = new Setting(containerEl)
            .addExtraButton((component) =>
                component
                    .setIcon('plus')
                    .onClick(() => {
                        onSubmit(icon);
                    }))
            .addText(text => text
                .setPlaceholder('iconName')
                .setValue('')
                .onChange((value) => {
                    icon.iconName = value;
                }))
            .addText(text => text
                .setPlaceholder('svgContent')
                .setValue(``)
                .onChange((value) => {
                    icon.svgContent = `${value}`;
                }));

        return setting;
    }
}

    