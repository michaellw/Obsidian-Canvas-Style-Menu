import { App, Canvas, CanvasNode, Menu, MenuItem } from "obsidian";
import CanvasStyleMenuPlugin from "./main";

const handleMultiNodes = (canvas: Canvas, allNodes: boolean, subMenuConfig: SubMenuItem[], menuItemType: string, cssClass: string, onRightClick: boolean) => {
    const nodes = allNodes ? Array.from(canvas.nodes.values()) : Array.from(canvas.selection) as any[];
    const canvasData = canvas.getData();

    if (nodes && nodes.length > 0) {
        for (const node of nodes) {
            const nodeData = canvasData.nodes.find((t: any) => t.id === node.id);
            if (subMenuConfig === null) {
                property = menuItemType;
            } else property = generateClassToPropertyMap(subMenuConfig, cssClass);

            if (property && nodeData) {
                if (onRightClick) {
                    // nodeData[property] = false; //Keep the properties in the canvas file
                    delete nodeData[property]; //Remove the corresponding property from the canvas file
                } else nodeData[property] = cssClass;
            }
        }
        canvas.setData(canvasData);
    }
    canvas.requestSave(true, true);
    canvas.requestFrame();
};

export const handleMultiNodesViaNodes = (canvas: Canvas, nodes: CanvasNode[], subMenuConfig: SubMenuItem[], menuItemType: string, cssClass: string, onRightClick: boolean) => {
    const canvasData = canvas.getData();

    if (nodes && nodes.length > 0) {
        for (const node of nodes) {
            const nodeData = canvasData.nodes.find((t: any) => t.id === node.id);
            if (subMenuConfig === null) {
                property = menuItemType;
            } else property = generateClassToPropertyMap(subMenuConfig, cssClass);
    
            if (property && nodeData) {
                if (onRightClick) {
                    // nodeData[property] = false; //Keep the properties in the canvas file
                    delete nodeData[property]; //Remove the corresponding property from the canvas file
                } else nodeData[property] = cssClass;
            }
        }
        canvas.setData(canvasData);
    }
    canvas.requestSave(true, true);
};

export const handleSingleNode = (node: CanvasNode, subMenuConfig: SubMenuItem[], menuItemType: string, cssClass: string, onRightClick: boolean) => {
    const canvasData = node.canvas.getData();
    const nodeData = canvasData.nodes.find((t: any) => t.id === node.id);
    if (subMenuConfig === null) {
        property = menuItemType;
    } else property = generateClassToPropertyMap(subMenuConfig, cssClass);

    if (property && nodeData) {
        if (onRightClick) {
            // nodeData[property] = false; //Keep the properties in the canvas file
            delete nodeData[property]; //Remove the corresponding property from the canvas file
        } else nodeData[property] = cssClass;
    }
    node.canvas.setData(canvasData);
    node.canvas.requestSave(true, true);
};

const createHandleContextMenu = (section: string, menuConfig: MenuItem[], subMenuConfig: SubMenuItem[], toggleMenu: string[], callback: (cssClass: string) => Promise<void>) => {
    return (menu: Menu) => {
        menuConfig.forEach((memuItem) => {
            if (toggleMenu.includes(memuItem.type)) return;
            menu.addItem((item: MenuItem) => {
                const subMenu = item.setSection(section).setTitle(memuItem.title).setIcon(memuItem.icon).setSubmenu();
                handleMenu(subMenu, subMenuConfig, callback, memuItem.type);
            });
        });
    };
};

export const handleMenu = (subMenu: Menu, subMenuConfig: SubMenuItem[], callback: (cssClass: string) => Promise<void>, type: string) => {
    const filteredMenuItems = subMenuConfig.filter((item) => item.type === type) || [];
    filteredMenuItems.forEach((menuItem) => {
        subMenu.addItem((item: MenuItem) => {
            item
                .setIcon(menuItem.icon)
                .setTitle(menuItem.title)
                .onClick(async () => {
                    await callback(menuItem.class);
                });
        });
    });
};

export const handleSelectionContextMenu = (plugin: CanvasStyleMenuPlugin, menu: Menu, canvas: Canvas, menuConfig: MenuItem[], subMenuConfig: SubMenuItem[], toggleMenu: string[], menuItemType: string) => {
    const callback = async (cssClass: string) => {
        handleMultiNodes(canvas, false, subMenuConfig, menuItemType, cssClass, false);
    };
    createHandleContextMenu('action', menuConfig, subMenuConfig, toggleMenu, callback)(menu);
};

export const handleNodeContextMenu = (plugin: CanvasStyleMenuPlugin, menu: Menu, node: CanvasNode, menuConfig: MenuItem[], subMenuConfig: SubMenuItem[], toggleMenu: string[], menuItemType: string) => {
    const callback = async (cssClass: string) => {
        handleSingleNode(node, subMenuConfig, menuItemType, cssClass, false);
    };
    createHandleContextMenu('canvas', menuConfig, subMenuConfig, toggleMenu, callback)(menu);
};

export const refreshAllCanvasView = (app: App) => {
    const cavasLeaves = app.workspace.getLeavesOfType("canvas");
    if (!cavasLeaves || cavasLeaves.length === 0) return;
    for (const leaf of cavasLeaves) {
        leaf.rebuildView();
    }
};

export function setAttributes(element: any, attributes: any) {
    for (let key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
}

export function toObjectArray(array: MenuItem[]) {
    return array.map((str) => {
        const matches = str.match(/\{(.+?)\}/);
        const objStr = `{${matches[1]}}`;
        return new Function(`return ${objStr}`)();
    });
}

export function generateClassToPropertyMap(subMenuConfig: SubMenuItem[], cssClass: string): { [key: string]: string } {
    const classToPropertyMap: { [key: string]: string } = {};

    subMenuConfig.forEach((subMenuItem) => {
        if (subMenuItem.type && !classToPropertyMap[subMenuItem.class]) {
            classToPropertyMap[subMenuItem.class] = subMenuItem.type;
        }
    });

    return classToPropertyMap[cssClass];
}

export const getToggleMenuItemsClass = (types: string[], items: MenuItem[]): (string | null)[] => {
    return types.map((type) => {
        const toggleMenuItem = items.find((item) => item.type === type);
        return toggleMenuItem ? toggleMenuItem.class : null;
    });
};

export const getMenuItemType = (cssClass: string, items: MenuItem[]): string | null => {
  const menuItem = items.find((item) => item.class === cssClass);
  return menuItem ? menuItem.type : null;
};
