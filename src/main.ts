import { addIcon, Canvas, CanvasNode, CanvasView, Menu, Plugin, setIcon, setTooltip } from 'obsidian';
import { around } from 'monkey-around';
import CanvasStyle from "./CanvasStyle";
import { defaultConfigs, csIcons } from "./memuConfigs"
import {
    handleMenu,
    handleMultiNodesViaNodes,
    handleNodeContextMenu,
    handleSelectionContextMenu,
    handleSingleNode,
    refreshAllCanvasView,
    getToggleMenuItemsClass,
    getItemProperty,
    modifyClassOnElements,
    createElbowPath,
    parseOldSettingsItems,
    sortByProperty,
    groupItemsByProperty,
    transformSubMenuItems
} from "./utils";
import CanvasStyleMenuSettingTab from "./setting";

interface MyPluginSettings {
    currentConfig: string;
    configs: Config;
    savedConfigs: Config;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    currentConfig: "default",
    configs: defaultConfigs,
    savedConfigs: {},
}

export const defaultSettings = JSON.parse(JSON.stringify(defaultConfigs));
export let savedSettings = {};
export let csIconList: string[] = [];

export default class CanvasStyleMenuPlugin extends Plugin {
    settings: MyPluginSettings;
    nodePatched: boolean;
    groupPatched: boolean;
    edgePatched: boolean;

    async checkOldSettings() {
        // Migration of settings from version 0.0.5 and earlier.
        if (this.settings.menuItems || this.settings.subMenuItems || this.settings.customIcons) {
            this.settings.configs.custom1 = {
                name: "custom1",
                menuItems: [],
                subMenuItems: {},
                customIcons: [],
            };

            this.settings.savedConfigs.custom1 = {
                name: "custom1",
                menuItems: [],
                subMenuItems: {},
                customIcons: [],
            };

            const menuItemsNew = parseOldSettingsItems(this.settings.menuItems);
            if (menuItemsNew) {
                menuItemsNew.forEach(item => {
                    item.name = item.title;
                    item.cat = item.cat ? item.cat : '';
                    item.selector = item.selector ? item.selector : '';
                    item.enable = true;
                    delete item.title;
                });
                this.settings.configs.custom1.menuItems = sortByProperty(menuItemsNew, 'cat');
                this.settings.savedConfigs.custom1.menuItems = JSON.parse(JSON.stringify(this.settings.configs.custom1.menuItems));
                delete this.settings.menuItems;
            }

            const subMenuItemsNew = parseOldSettingsItems(this.settings.subMenuItems);
            if (subMenuItemsNew) {
                subMenuItemsNew.forEach(item => {
                    item.name = item.title;
                    item.selector = item.selector ? item.selector : '';
                    item.enable = true;
                    delete item.title;
                });
                this.settings.configs.custom1.subMenuItems = groupItemsByProperty(subMenuItemsNew, 'type');
                this.settings.savedConfigs.custom1.subMenuItems = JSON.parse(JSON.stringify(this.settings.configs.custom1.subMenuItems));
                delete this.settings.subMenuItems;
            }

            const typeValues = this.settings.configs.custom1.menuItems.map(item => item.type);
            typeValues.forEach(type => {
                if (!this.settings.configs.custom1.subMenuItems[type]) {
                    this.settings.configs.custom1.subMenuItems[type] = [];
                    this.settings.savedConfigs.custom1.subMenuItems[type] = [];
                }
            });

            if (this.settings.customIcons) {
                this.settings.customIcons.forEach(icon => {
                    icon.name = icon.iconName;
                    delete icon.iconName;
                });
                this.settings.configs.custom1.customIcons = this.settings.customIcons;
                this.settings.savedConfigs.custom1.customIcons = JSON.parse(JSON.stringify(this.settings.configs.custom1.customIcons));
                delete this.settings.customIcons;
            }

            await this.saveSettings();
        }
    }

    savedSettings() {
        savedSettings = JSON.parse(JSON.stringify(this.settings.savedConfigs));
    }

    async onload() {
        await this.loadSettings();
        await this.checkOldSettings();
        this.savedSettings();

        this.registerCanvasEvents();
        this.registerCustomIcons(csIcons);

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
        const menuConfig = this.settings.configs[this.settings.currentConfig].menuItems;
        const subMenuConfig = transformSubMenuItems(this.settings.configs[this.settings.currentConfig].subMenuItems);
        const menuTypes = menuConfig.map(item => item.type);
        const subMenuTypes = subMenuConfig.map(item => item.type);
        const toggleMenu = menuTypes.filter(type => !subMenuTypes.includes(type));

        this.registerEvent(this.app.workspace.on("canvas-style-menu:patched-canvas", () => {
            refreshAllCanvasView(this.app);
        }));
        this.registerEvent(this.app.workspace.on("canvas-style-menu:patch-canvas-node", () => {
            this.patchCanvasNode();
            refreshAllCanvasView(this.app);
        }));
        this.registerEvent(this.app.workspace.on("canvas:selection-menu", (menu, canvas) => {
            handleSelectionContextMenu(this, menu, canvas, menuConfig, subMenuConfig, toggleMenu);
        }));
        this.registerEvent(this.app.workspace.on("canvas:node-menu", (menu, node) => {
            handleNodeContextMenu(this, menu, node, menuConfig, subMenuConfig, toggleMenu);
        }));
    }

    registerCustomIcons(csIcons: CustomIcon[]) {
        let customIcons: CustomIcon[] = [];
        if (csIcons) {
            customIcons = csIcons.concat(this.settings.configs[this.settings.currentConfig].customIcons);
        } else {
            customIcons = this.settings.configs[this.settings.currentConfig].customIcons;
        }
        const jsonIcons = JSON.stringify(customIcons);
        const parsedIcons: CustomIcon[] = JSON.parse(jsonIcons);
        parsedIcons.forEach((icon: string) => {
            const name = icon.name;
            const svgContent = icon.svgContent.replace(/( width| height)="(\d+)"/g, '$1="100%"');
            addIcon(name, svgContent);
            csIconList.push(name);
        })
    }

    patchCanvasMenu(refreshed: boolean) {
        if (refreshed) {
            this.nodePatched = false;
            this.groupPatched = false;
            this.edgePatched = false;
        }

        let nodePatched = this.nodePatched;
        let groupPatched = this.groupPatched;
        let edgePatched = this.edgePatched;

        const patchMenu = () => {
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const menu = (canvasView as CanvasView)?.canvas.menu;
            if (!menu) return false;

            const selection = menu.selection;
            if (!selection) return false;

            const menuConfig = this.settings.configs[this.settings.currentConfig].menuItems
            const subMenuConfig = transformSubMenuItems(this.settings.configs[this.settings.currentConfig].subMenuItems);
            const menuTypes = menuConfig.map(item => item.type);
            const subMenuTypes = subMenuConfig.map(item => item.type);
            const toggleMenu = menuTypes.filter(type => !subMenuTypes.includes(type));

            const menuUninstaller = around(menu.constructor.prototype, {
                render: (next: any) =>
                    function (...args: any) {
                        const result = next.call(this, ...args);
                        const currentSelection = this.canvas.selection;

                        if (!nodePatched) {
                            if (this.canvas.nodes.size > 0) {
                                this.canvas.app.workspace.trigger("canvas-style-menu:patch-canvas-node");
                                nodePatched = true;
                            }
                        }

                        const nodes = this.canvas.nodes.values();
                        if (!groupPatched) {
                            for (const node of nodes) {
                                if (node?.unknownData.type === "group") {
                                    this.canvas.app.workspace.trigger("canvas-style-menu:patch-canvas-node");
                                    groupPatched = true;
                                    break;
                                }
                            }
                        }

                        const edge = this.canvas.edges.values().next().value;
                        if (!edgePatched) {
                            if (this.canvas.edges.size > 0 && edge?.unknownData?.id) {
                                this.canvas.app.workspace.trigger("canvas-style-menu:patch-canvas-node");
                                edgePatched = true;
                            }
                        }

                        const menuClasses = menuConfig.map(item => item.class)
                        const oldMenuItems = this.menuEl.querySelectorAll('.clickable-icon[class$=-menu-item]');
                        oldMenuItems.forEach(item => {
                            const itemClass = item.className.match(/^(.+?)(?=-menu-item)/)[1];
                            if (!menuClasses.includes(itemClass)) {
                                item.remove()
                            }
                        })

                        const createMenuButton = (category: string, cssClass: string, tooltip: string, icon: string) => {
                            const currentSelectionArray = Array.from(currentSelection);
                            const allFalse = currentSelectionArray.every((value: number) => {
                                return !value.nodeEl;
                            });
                            if (allFalse) {
                                if (category === 'edge') {
                                    if (this.menuEl.querySelector(`.${cssClass}-menu-item`)) return result;
                                    const buttonEl = createEl("button", `clickable-icon ${cssClass}-menu-item`);
                                    setTooltip(buttonEl, tooltip, {
                                        placement: "top",
                                    });
                                    setIcon(buttonEl, icon);
                                    return buttonEl;
                                }
                            } else {
                                if (category !== 'edge') {
                                    if (this.menuEl.querySelector(`.${cssClass}-menu-item`)) return result;
                                    const buttonEl = createEl("button", `clickable-icon ${cssClass}-menu-item`);
                                    setTooltip(buttonEl, tooltip, {
                                        placement: "top",
                                    });
                                    setIcon(buttonEl, icon);
                                    return buttonEl;
                                }
                            }
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

                        const createAndSetupMenuButton = (category: string, cssClass: string, toggleMenu: string[], tooltip: string, icon: string, clickHandler: (menu: Menu, containingNodes: any[]) => void) => {
                            const buttonEl = createMenuButton(category, cssClass, tooltip, icon);
                            if (buttonEl) {
                                const toggleMenuItemsClass = getToggleMenuItemsClass(toggleMenu, menuConfig);
                                const currentSelection = this.canvas.selection;
                                const containingNodes = this.canvas.getContainingNodes(this.selection.bbox);
                                const menuItemType = getItemProperty(cssClass, menuConfig, 'type');
                                if (toggleMenuItemsClass.includes(cssClass)) {
                                    buttonEl.addEventListener("click", () => {
                                        currentSelection.size === 1 
                                        ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, false) 
                                        : (containingNodes.length > 1 
                                            ? handleMultiNodesViaNodes(this.canvas, containingNodes, null, menuItemType, cssClass, false) 
                                            : (currentSelection 
                                                ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, false) 
                                                : ""));
                                    });
                                } else buttonEl.addEventListener("click", () => handleButtonClick(buttonEl, clickHandler));
                                buttonEl.addEventListener("contextmenu", () => {
                                    currentSelection.size === 1 
                                    ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, true) 
                                    : (containingNodes.length > 1 
                                        ? handleMultiNodesViaNodes(this.canvas, containingNodes, null, menuItemType, cssClass, true) 
                                        : (currentSelection 
                                            ? handleSingleNode(<CanvasNode>Array.from(currentSelection)?.first(), null, menuItemType, cssClass, true) 
                                            : ""));
                                });
                                this.menuEl.appendChild(buttonEl);
                            }
                        };

                        menuConfig.forEach((memuItem) => {
                            if (memuItem.enable === true) {
                                createAndSetupMenuButton(memuItem.cat, memuItem.class, toggleMenu, memuItem.name, memuItem.icon, (menu, containingNodes) => {
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
                            }
                        });

                        return result;
                    },
            });

            this.register(menuUninstaller);
            this.app.workspace.trigger("canvas-style-menu:patched-canvas");

            console.log("Canvas-Style-Menu: canvas menu patched");
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
        const menuConfig = this.settings.configs[this.settings.currentConfig].menuItems
        const subMenuConfig = transformSubMenuItems(this.settings.configs[this.settings.currentConfig].subMenuItems);
        const allMenuConfig = menuConfig.concat(subMenuConfig)

        const initCanvasStyle = (node: any) => {
            return new CanvasStyle(node, menuConfig);
        };

        const patchNode = () => {
            let groupPatched: boolean = false;
            if (this.nodePatched && this.groupPatched) return;

            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const canvas: Canvas = (canvasView as CanvasView)?.canvas;
            if (!canvas) return false;

            let node = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values().next().value;
            const nodes = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values();

            for (const group of nodes) {
                if (group?.unknownData.type === "group") {
                    node = group;
                    groupPatched = true;
                    break;
                }
            }

            if (!node) return false;
            let prototypeNode = Object.getPrototypeOf(node);
            
            while (prototypeNode && prototypeNode !== Object.prototype) {
                prototypeNode = Object.getPrototypeOf(prototypeNode);
                // @ts-expected-error Find the parent prototype
                if (prototypeNode.renderZIndex) {
                    break;
                }
            }

            if (!prototypeNode) return false;

            const uninstallerNode = around(prototypeNode, {
                render: (next: any) =>
                    function (...args: any) {
                        const result = next.call(this, ...args);

                        this.nodeCSSclass = initCanvasStyle(this);

                        const typeToPropertyMap = menuConfig.reduce((acc, item) => {
                            acc[item.type] = `unknownData.${item.type}`;
                            return acc;
                        }, {} as { [key: string]: string });
                        menuConfig.forEach(async (item) => {
                            const propertyKey = typeToPropertyMap[item.type];
                            const propertyValue = new Function(`return this.${propertyKey}`).call(this);
                            if (propertyValue) {
                                if (getItemProperty(propertyValue, allMenuConfig, 'selector') === 'cc') {
                                    await modifyClassOnElements('add', this.contentEl, 'markdown-preview-view', propertyValue);
                                } else this.nodeEl.classList.add(propertyValue);
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
                            const selector = getItemProperty(propertyValue, allMenuConfig, 'selector');
                            this.nodeCSSclass?.setStyle(item.cat, selector, item.type, propertyValue);
                        });

                        return next.call(this, data);
                    }
            });

            this.register(uninstallerNode);

            if (!this.nodePatched) {
                this.nodePatched = true;
                console.log("Canvas-Style-Menu: canvas node patched");
            }

            if (groupPatched) {
                if (!this.groupPatched) {
                    this.groupPatched = true;
                    console.log("Canvas-Style-Menu: canvas group patched");
                }
            }
            return true;
        };

        const patchEdge = () => {
            if (this.edgePatched) return;
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const canvas: Canvas = (canvasView as CanvasView)?.canvas;
            if (!canvas) return false;

            const edge = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.edges.values().next().value;

            if (!edge) return false;
            let prototypeEdge = Object.getPrototypeOf(edge);
            if (!prototypeEdge) {
                return false;
            } else {
                const uninstallerEdge = around(prototypeEdge, {
                    render: (next: any) =>
                        function (...args: any) {
                            const result = next.call(this, ...args);

                            this.nodeCSSclass = initCanvasStyle(this);

                            let fromOffsetH: number = 0;
                            let fromOffsetV: number = 0;
                            let toOffsetH: number = 0;
                            let toOffsetV: number = 0;

                            if (this.from.side === 'right') fromOffsetH = -8;
                            if (this.from.side === 'left') fromOffsetH = 8;
                            if (this.from.side === 'top') fromOffsetV = 8;
                            if (this.from.side === 'bottom') fromOffsetV = -8;
                            if (this.to.side === 'right') toOffsetH = -8;
                            if (this.to.side === 'left') toOffsetH = 8;
                            if (this.to.side === 'top') toOffsetV = 8;
                            if (this.to.side === 'bottom') toOffsetV = -8;

                            function createLinePath(x1: number, y1: number, x2: number, y2: number): string {
                                const pathData = `M${x1},${y1} L${x2},${y2}`;
                                return pathData;
                            }
                            const linePath = createLinePath(this.bezier.from.x + fromOffsetH, this.bezier.from.y + fromOffsetV, this.bezier.to.x + toOffsetH, this.bezier.to.y + toOffsetV);

                            function calculateAngle(x1: number, y1: number, x2: number, y2: number): number {
                                const angleRad = Math.atan2(y2 - y1, x2 - x1);
                                const angleDeg = (angleRad * 180) / Math.PI;
                                return angleDeg;
                            }
                            const angle = calculateAngle(this.bezier.from.x + fromOffsetH, this.bezier.from.y + fromOffsetV, this.bezier.to.x + toOffsetH, this.bezier.to.y + toOffsetV);
                            const fromRotateAngle = angle - 90;
                            const toRotateAngle = angle - 270;

                            const elbowPath = createElbowPath(this.from.side, this.to.side, this.bezier.from.x + fromOffsetH, this.bezier.from.y + fromOffsetV, this.bezier.to.x + toOffsetH, this.bezier.to.y + toOffsetV);

                            const typeToPropertyMap = menuConfig.reduce((acc, item) => {
                                acc[item.type] = `unknownData.${item.type}`;
                                return acc;
                            }, {} as { [key: string]: string });
                            menuConfig.forEach((item) => {
                                const propertyKey = typeToPropertyMap[item.type];
                                const propertyValue = new Function(`return this.${propertyKey}`).call(this);
                                if (propertyValue) {
                                    this.lineGroupEl.classList.add(propertyValue);
                                    this.lineEndGroupEl.classList.add(propertyValue);
                                    if (propertyValue === 'cs-line-straight') {
                                        const displayPath = this.lineGroupEl.querySelector('.canvas-display-path');
                                        const interactionPath = this.lineGroupEl.querySelector('.canvas-interaction-path');
                                        displayPath.setAttribute('d', linePath);
                                        interactionPath.setAttribute('d', linePath);
                                        if (this.toLineEnd && !this.fromLineEnd) {
                                            const toNewTransform = this.toLineEnd.el.style.transform.replace(/rotate\([-\d]+deg\)/, `rotate(${toRotateAngle}deg)`);
                                            this.toLineEnd.el.style.transform = toNewTransform;
                                        }
                                        if (this.fromLineEnd) {
                                            const fromNewTransform = this.fromLineEnd.el.style.transform.replace(/rotate\([-\d]+deg\)/, `rotate(${fromRotateAngle}deg)`);
                                            const toNewTransform = this.toLineEnd.el.style.transform.replace(/rotate\([-\d]+deg\)/, `rotate(${toRotateAngle}deg)`);
                                            this.fromLineEnd.el.style.transform = fromNewTransform;
                                            this.toLineEnd.el.style.transform = toNewTransform;
                                        } 
                                    }
                                    if (propertyValue === 'cs-line-elbow') {
                                        const displayPath = this.lineGroupEl.querySelector('.canvas-display-path');
                                        const interactionPath = this.lineGroupEl.querySelector('.canvas-interaction-path');
                                        displayPath.setAttribute('d', elbowPath);
                                        interactionPath.setAttribute('d', elbowPath);
                                    }
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
                                const selector = getItemProperty(propertyValue, allMenuConfig, 'selector');
                                this.nodeCSSclass?.setStyle(item.cat, selector, item.type, propertyValue);
                            });

                            return next.call(this, data);
                        }
                });

                this.register(uninstallerEdge);
            }

            if (!this.edgePatched) {
                this.edgePatched = true;
                console.log("Canvas-Style-Menu: canvas edge patched");
            }
            return true;
        };

        this.app.workspace.onLayoutReady(() => {
            if (!patchNode()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    this.nodePatched && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
            if (!patchEdge()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    this.edgePatched && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

}
