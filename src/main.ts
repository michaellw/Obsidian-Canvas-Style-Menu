import { addIcon, Canvas, CanvasNode, CanvasView, Menu, Plugin, setIcon, setTooltip } from 'obsidian';
import { around } from 'monkey-around';
import CanvasStyle from "./CanvasStyle";
import { menuItems, subMenuItems, customIcons } from "./memuConfigs"
import {
    handleMenu,
    handleMultiNodesViaNodes,
    handleNodeContextMenu,
    handleSelectionContextMenu,
    handleSingleNode,
    refreshAllCanvasView,
    toObjectArray,
    getToggleMenuItemsClass,
    getItemProperty,
    modifyClassOnElements
} from "./utils";
import CanvasStyleMenuSettingTab from "./setting";

interface MenuItem {
    cat: string;
    selector: string;
    class: string;
    type: string;
    icon: string;
    title: string;
}

interface SubMenuItem {
    selector: string;
    class: string;
    type: string;
    icon: string;
    title: string;
}

interface Icon {
    iconName: string;
    svgContent: string;
}

interface MyPluginSettings {
    menuItems: MenuItem[];
    subMenuItems: SubMenuItem[];
}

const DEFAULT_SETTINGS: MyPluginSettings = {
    menuItems,
    subMenuItems,
    customIcons,
}

export default class CanvasStyleMenuPlugin extends Plugin {
    settings: MyPluginSettings;
    menuConfig: MenuItem[];
    subMenuConfig: SubMenuItem[];
    toggleMenu: string[];

    async refreshSetting() {
        await this.loadSettings();
        this.menuConfig = toObjectArray(this.settings.menuItems);
        this.subMenuConfig = toObjectArray(this.settings.subMenuItems);
        const menuTypes = this.menuConfig.map(item => item.type);
        const subMenuTypes = this.subMenuConfig.map(item => item.type);
        this.toggleMenu = menuTypes.filter(type => !subMenuTypes.includes(type));
    }

    async onload() {
        await this.refreshSetting();

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
        this.registerEvent(this.app.workspace.on("canvas-style-menu:patched-node", () => {
            this.patchCanvasNode();
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
        const jsonIcons = JSON.stringify(this.settings.customIcons);
        const parsedIcons: Icon[] = JSON.parse(jsonIcons);
        parsedIcons.forEach((icon: string) => {
            const iconName = icon.iconName;
            const svgContent = icon.svgContent.replace(/( width| height)="(\d+)"/g, '$1="100%"');
            addIcon(iconName, svgContent);
        })
    }

    patchCanvasMenu() {
        let [nodePatched, edgePatched] = this.patchCanvasNode();
        let groupPatched = nodePatched;
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

                        if (!nodePatched) {
                            if (this.canvas.nodes.size > 0) {
                                this.canvas.app.workspace.trigger("canvas-style-menu:patched-node");
                                nodePatched = true;
                            }
                        }

                        const nodes = this.canvas.nodes.values();
                        if (!groupPatched) {
                            for (const node of nodes) {
                                if (node?.text === undefined) {
                                    this.canvas.app.workspace.trigger("canvas-style-menu:patched-node");
                                    groupPatched = true;
                                    break;
                                }
                            }
                        }

                        const edge = this.canvas.edges.values().next().value;
                        if (!edgePatched) {
                            if (this.canvas.edges.size > 0 && edge?.unknownData?.id) {
                                this.canvas.app.workspace.trigger("canvas-style-menu:patched-node");
                                edgePatched = true;
                            }
                        }

                        const menuClasses = menuConfig.map(item => item.class)
                        const oldMenuItems = this.menuEl.querySelectorAll('.clickable-icon[class$=-menu-item]');
                        oldMenuItems.forEach(item => {
                            const itemClass = item.className.match(/\b(\w+)-menu-item\b/)[1];
                            if (!menuClasses.includes(itemClass)) {
                                item.remove()
                            }
                        })

                        const createMenuButton = (category: string, cssClass: string, tooltip: string, icon: string) => {
                            const currentSelection = this.canvas.selection;
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
                                const toggleMenuItemsClass = getToggleMenuItemsClass(toggleMenu, menuConfig)
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
                            createAndSetupMenuButton(memuItem.cat, memuItem.class, toggleMenu, memuItem.title, memuItem.icon, (menu, containingNodes) => {
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
        const subMenuConfig = this.subMenuConfig
        const allMenuConfig = menuConfig.concat(subMenuConfig)

        const patchNode = () => {
            const canvasView = this.app.workspace.getLeavesOfType("canvas").first()?.view;
            if (!canvasView) return false;

            const canvas: Canvas = (canvasView as CanvasView)?.canvas;
            if (!canvas) return false;

            let node = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values().next().value;
            const nodes = (this.app.workspace.getLeavesOfType("canvas").first()?.view as any).canvas.nodes.values();

            for (const group of nodes) {
                if (group?.text === undefined) {
                    node = group
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

            console.log("Canvas-Style-Menu: canvas node patched");
            return true;
        };

        const patchEdge = () => {
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

            console.log("Canvas-Style-Menu: canvas edge patched");
            return true;
        };

        return [patchNode(), patchEdge()];

        this.app.workspace.onLayoutReady(() => {
            if (!patchNode()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchNode() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
            if (!patchEdge()) {
                const evt = this.app.workspace.on("layout-change", () => {
                    patchEdge() && this.app.workspace.offref(evt);
                });
                this.registerEvent(evt);
            }
        });
    }

}
