import { addIcon, Canvas, CanvasNode, CanvasView, Menu, Plugin, setIcon, setTooltip } from 'obsidian';
import { around } from 'monkey-around';
import CanvasStyle from "./CanvasStyle";
import {
    handleMenu,
    handleMultiNodesViaNodes,
    handleNodeContextMenu,
    handleSelectionContextMenu,
    handleSingleNode,
    refreshAllCanvasView,
    toObjectArray,
    getToggleMenuItemsClass,
    getMenuItemType
} from "./utils";
import CanvasStyleMenuSettingTab from "./setting";

interface MenuItem {
    class: string;
    type: string;
    icon: string;
    title: string;
}

interface SubMenuItem {
    class: string;
    type: string;
    icon: string;
    title: string;
}

interface MyPluginSettings {
    menuItems: MenuItem[];
    subMenuItems: SubMenuItem[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    menuItems: [
        "{ class: 'cs-border', type: 'border', icon: 'box-select', title: 'Border' }",
        "{ class: 'cs-bg', type: 'bg', icon: 'paintbrush', title: 'Background' }",
        "{ class: 'cs-rotate', type: 'rotate', icon: 'rotate-cw', title: 'Rotate' }",
        "{ class: 'cs-shape', type: 'shape', icon: 'diamond', title: 'Shape' }",
        "{ class: 'cs-highlight', type: 'highlight', icon: 'star', title: 'Highlight' }",
        "{ class: 'cs-extra', type: 'extra', icon: 'more-horizontal', title: 'Extra' }",
    ],
    subMenuItems: [
        "{ class: 'cs-border-none', type: 'border', icon: 'text', title: 'No border' }",
        "{ class: 'cs-border-dashed', type: 'border', icon: 'box-select', title: 'Dashed' }",
        "{ class: 'cs-border-default', type: 'border', icon: 'eraser', title: 'Default' }",
        "{ class: 'cs-bg-transparent', type: 'bg', icon: 'flask-conical-off', title: 'Transparent' }",
        "{ class: 'cs-bg-opacity-0', type: 'bg', icon: 'paint-bucket', title: 'Opacity 0' }",
        "{ class: 'cs-bg-default', type: 'bg', icon: 'eraser', title: 'Default' }",
        "{ class: 'cs-rotate-right-45', type: 'rotate', icon: 'redo', title: 'Right 45' }",
        "{ class: 'cs-rotate-right-90', type: 'rotate', icon: 'redo', title: 'Right 90' }",
        "{ class: 'cs-rotate-left-45', type: 'rotate', icon: 'undo', title: 'Left 45' }",
        "{ class: 'cs-rotate-left-90', type: 'rotate', icon: 'undo', title: 'Left 90' }",
        "{ class: 'cs-rotate-default', type: 'rotate', icon: 'eraser', title: 'Default' }",
        "{ class: 'cs-shape-circle', type: 'shape', icon: 'circle', title: 'Circle' }",
        "{ class: 'cs-shape-default', type: 'shape', icon: 'eraser', title: 'Default' }",
    ]
}

export default class CanvasStyleMenuPlugin extends Plugin {
    settings: MyPluginSettings;
    menuConfig: MenuItem[];
    subMenuConfig: SubMenuItem[];
    toggleMenu: string[];

    async onload() {
        await this.loadSettings();
        this.menuConfig = toObjectArray(this.settings.menuItems);
        this.subMenuConfig = toObjectArray(this.settings.subMenuItems);
        const menuTypes = this.menuConfig.map(item => item.type);
        const subMenuTypes = this.subMenuConfig.map(item => item.type);
        this.toggleMenu = menuTypes.filter(type => !subMenuTypes.includes(type));

        this.registerCanvasEvents();
        this.registerCustomIcons();

        this.patchCanvasMenu();
        this.patchCanvasNode();

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new CanvasStyleMenuSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    onunload() {
        console.log('unloading plugin');
        refreshAllCanvasView(this.app);
    }

    registerCanvasEvents() {
        this.registerEvent(this.app.workspace.on("canvas-style-menu:patched-canvas", () => {
            refreshAllCanvasView(this.app);
        }));
        this.registerEvent(this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
            handleSelectionContextMenu(this, menu, canvas, this.menuConfig, this.subMenuConfig, this.toggleMenu);
        }));
        this.registerEvent(this.app.workspace.on("canvas:node-menu", (menu, node) => {
            handleNodeContextMenu(this, menu, node, this.menuConfig, this.subMenuConfig, this.toggleMenu);
        }));
    }

    registerCustomIcons() {
        addIcon("fold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 16.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 7.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
        addIcon("unfold-vertical", `<g id="surface1"><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 22.000312 L 12 16.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 12 7.999687 L 12 1.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 4.000312 12 L 1.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 10.000312 12 L 7.999687 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 16.000312 12 L 13.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 22.000312 12 L 19.999688 12 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 19.000312 L 12 22.000312 L 9 19.000312 " transform="matrix(4.166667,0,0,4.166667,0,0)"/><path style="fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(0%,0%,0%);stroke-opacity:1;stroke-miterlimit:4;" d="M 15 4.999687 L 12 1.999687 L 9 4.999687 " transform="matrix(4.166667,0,0,4.166667,0,0)"/></g>`);
    }

    patchCanvasMenu() {
        const patchMenu = () => {
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const menu = (canvasView as CanvasView)?.canvas.menu;
            if (!menu) return false;

            const selection = menu.selection;
            if (!selection) return false;

            const menuConfig = this.menuConfig
            const subMenuConfig = this.subMenuConfig

            const toggleMenu = this.toggleMenu;

            const menuUninstaller = around(menu.constructor.prototype, {
                render: (next: any) =>
                    function (...args: any) {
                        const result = next.call(this, ...args);

                        const createMenuButton = (cssClass: string, tooltip: string, icon: string) => {
                            if (this.menuEl.querySelector(`.${cssClass}-menu-item`)) return result;
                            const buttonEl = createEl("button", `clickable-icon ${cssClass}-menu-item`);
                            setTooltip(buttonEl, tooltip, {
                                placement: "top",
                            });
                            setIcon(buttonEl, icon);
                            return buttonEl;
                        };

                        const handleButtonClick = (buttonEl: HTMLElement, clickHandler: () => void) => {
                            const pos = buttonEl.getBoundingClientRect();
                            if (!buttonEl.hasClass("has-active-menu")) {
                                buttonEl.toggleClass("has-active-menu", true);
                                const menu = new Menu();
                                const containingNodes = this.canvas.getContainingNodes(this.selection.bbox);

                                clickHandler(menu, containingNodes);

                                buttonEl.toggleClass("has-active-menu", false);
                                menu.setParentElement(this.menuEl).showAtPosition({
                                    x: pos.x,
                                    y: pos.bottom,
                                    width: pos.width,
                                    overlap: true
                                });
                            }
                        };

                        const createAndSetupMenuButton = (cssClass: string, toggleMenu: string[], tooltip: string, icon: string, clickHandler: (menu: Menu, containingNodes: any[]) => void) => {
                            const buttonEl = createMenuButton(cssClass, tooltip, icon);
                            if (buttonEl) {
                                const toggleMenuItemsClass = getToggleMenuItemsClass(toggleMenu, menuConfig)
                                if (toggleMenuItemsClass.includes(cssClass)) {
                                    const currentSelection = this.canvas.selection;
                                    const containingNodes = this.canvas.getContainingNodes(this.selection.bbox);
                                    const menuItemType = getMenuItemType(cssClass, menuConfig);
                                    buttonEl.addEventListener("click", () => {
                                        currentSelection.size === 1 
                                        ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, false) 
                                        : (containingNodes.length > 1 
                                            ? handleMultiNodesViaNodes(this.canvas, containingNodes, null, menuItemType, cssClass, false) 
                                            : (currentSelection 
                                                ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, false) 
                                                : ""));
                                    });
                                    buttonEl.addEventListener("contextmenu", () => {
                                        currentSelection.size === 1 
                                        ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, true) 
                                        : (containingNodes.length > 1 
                                            ? handleMultiNodesViaNodes(this.canvas, containingNodes, null, menuItemType, cssClass, true) 
                                            : (currentSelection 
                                                ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, true) 
                                                : ""));
                                    });
                                } else buttonEl.addEventListener("click", () => handleButtonClick(buttonEl, clickHandler));
                                this.menuEl.appendChild(buttonEl);
                            }
                        };

                        menuConfig.forEach((memuItem) => {
                            createAndSetupMenuButton(memuItem.class, toggleMenu, memuItem.title, memuItem.icon, (menu, containingNodes) => {
                                handleMenu(menu, subMenuConfig, async (cssClass: string) => {
                                    const currentSelection = this.canvas.selection;
                                    currentSelection.size === 1 
                                    ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), subMenuConfig, null, cssClass, false) 
                                    : (containingNodes.length > 1 
                                        ? handleMultiNodesViaNodes(this.canvas, containingNodes, subMenuConfig, null, cssClass, false) 
                                        : (currentSelection 
                                            ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), subMenuConfig, null, cssClass, false) 
                                            : ""));
                                }, memuItem.type);
                            });
                        });

                        return result;
                    },
            });

            this.register(menuUninstaller);
            this.app.workspace.trigger("canvas-style-menu:patched-canvas");

            console.log("Canvas-Style-Menu: canvas history patched");
            return true;

        };


        this.app.workspace.onLayoutReady(() => {
            if (!patchMenu()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchMenu() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

    patchCanvasNode() {
        const initCanvasStyle = (node: any) => {
            return new CanvasStyle(node, this.menuConfig);
        };

        const menuConfig = this.menuConfig

        const patchNode = () => {
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const canvas: Canvas = (canvasView as CanvasView)?.canvas;
            if (!canvas) return false;

            const node = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values().next().value;

            if (!node) return false;
            let prototype = Object.getPrototypeOf(node);
            while (prototype && prototype !== Object.prototype) {
                prototype = Object.getPrototypeOf(prototype);
                // @ts-expected-error Find the parent prototype
                if (prototype.renderZIndex) {
                    break;
                }
            }

            if (!prototype) return false;

            const uninstaller = around(prototype, {
                render: (next: any) =>
                    function (...args: any) {
                        const result = next.call(this, ...args);

                        this.nodeCSSclass = initCanvasStyle(this);

                        const typeToPropertyMap = menuConfig.reduce((acc, item) => {
                            acc[item.type] = `unknownData.${item.type}`;
                            return acc;
                        }, {} as { [key: string]: string });
                        menuConfig.forEach((item) => {
                            const propertyKey = typeToPropertyMap[item.type];
                            const propertyValue = new Function(`return this.${propertyKey}`).call(this);
                            if (propertyValue) {
                                this.nodeEl.classList.add(propertyValue);
                            }
                        });

                        return result;
                    },
                setData: (next: any) =>
                    function (data: any) {
                        const typeToPropertyMap = menuConfig.reduce((acc, item) => {
                            acc[item.type] = `${item.type}`;
                            return acc;
                        }, {} as { [key: string]: string });
                        menuConfig.forEach((item) => {
                            const propertyKey = typeToPropertyMap[item.type];
                            const propertyValue = data[propertyKey];
                            this.nodeCSSclass?.setStyle(item.type, propertyValue);
                        });

                        return next.call(this, data);
                    }
            });
            this.register(uninstaller);

            console.log("Canvas-Style-Menu: canvas node patched");
            return true;
        };

        this.app.workspace.onLayoutReady(() => {
            if (!patchNode()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchNode() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

}
