import fs from 'fs';
import path from 'path';
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
    const edgeData = canvasData.edges.find((t: any) => t.id === node.id);
    if (subMenuConfig === null) {
        property = menuItemType;
    } else property = generateClassToPropertyMap(subMenuConfig, cssClass);

    if (property && nodeData) {
        if (onRightClick) {
            // nodeData[property] = false; //Keep the properties in the canvas file
            delete nodeData[property]; //Remove the corresponding property from the canvas file
        } else nodeData[property] = cssClass;
    }
    if (property && edgeData) {
        if (onRightClick) {
            // edgeData[property] = false; //Keep the properties in the canvas file
            delete edgeData[property]; //Remove the corresponding property from the canvas file
        } else edgeData[property] = cssClass;
    }
    node.canvas.setData(canvasData);
    node.canvas.requestSave(true, true);
};

const createHandleContextMenu = (section: string, menuConfig: MenuItem[], subMenuConfig: SubMenuItem[], toggleMenu: string[], callback: (cssClass: string) => Promise<void>) => {
    return (menu: Menu) => {
        menuConfig.forEach((menuItem) => {
            if (toggleMenu.includes(menuItem.type) && menuItem.cat !== 'edge' && menuItem.ctxmenu === true && menuItem.enable === true) {
                menu.addItem((item: MenuItem) => {
                    item
                        .setIcon(menuItem.icon)
                        .setTitle(menuItem.name)
                        .onClick(async () => {
                            await callback(menuItem.class);
                        });
                });
            }
            if (!toggleMenu.includes(menuItem.type) && menuItem.cat !== 'edge' && menuItem.ctxmenu === true && menuItem.enable === true) {
                menu.addItem((item: MenuItem) => {
                    const subMenu = item.setSection(section).setTitle(menuItem.name).setIcon(menuItem.icon).setSubmenu();
                    handleMenu(subMenu, subMenuConfig, callback, menuItem.type);
                });
            }
        });
    };
};

export const handleMenu = (subMenu: Menu, subMenuConfig: SubMenuItem[], callback: (cssClass: string) => Promise<void>, type: string) => {
    const filteredMenuItems = subMenuConfig.filter((item) => item.type === type) || [];
    filteredMenuItems.forEach((menuItem) => {
        if (menuItem.enable === true) {
            subMenu.addItem((item: MenuItem) => {
                item
                    .setIcon(menuItem.icon)
                    .setTitle(menuItem.name)
                    .onClick(async () => {
                        await callback(menuItem.class);
                    });
            });
        }
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

export function parseOldSettingsItems(items: string[] | undefined): void {
    if (items) {
        // Replace single quotes with double quotes, and remove extra spaces
        const formattedStrings = items.map(str =>
            str.replace(/'/g, '"').replace(/([\w-]+):/g, '"$1":').replace(/'/g, '"')
        );
        // Convert a string to a JSON object
        const jsonObjectArray = formattedStrings.map(str => JSON.parse(str));
        return jsonObjectArray;
    }
}

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

export const getItemProperty = (cssClass: string, items: MenuItem[], property: string): string | null => {
  const menuItem = items.find((item) => item.class === cssClass);
  return menuItem ? menuItem[property] : null;
};

export async function modifyClassOnElements(addOrRemove: string, contentEl: HTMLElement, className: string, propertyValue: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1));
    const elements = contentEl.getElementsByClassName(className) as HTMLCollectionOf<HTMLElement>;

    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        if (addOrRemove === 'add') {
            element.classList.add(propertyValue);
        }
        if (addOrRemove === 'remove') {
            element.classList.remove(propertyValue);
        }
    }
}

export function sortByProperty<T>(array: T[], property: keyof T): T[] {
    const grouped: { [key: string]: T[] } = {};

    // Grouping based on incoming attributes
    for (const item of array) {
        const key = item[property];
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
    }

    // Merge the sorted arrays in the order of the original arrays
    const result = Object.values(grouped).reduce((acc, current) => acc.concat(current), []);

    return result;
}

export function groupItemsByProperty(items: Item[], property: string): { [key: string]: Item[] } {
    const groupedItems: { [key: string]: Item[] } = {};

    items.forEach((item) => {
        const propValue = item[property];

        if (!groupedItems[propValue]) {
            groupedItems[propValue] = [];
        }

        groupedItems[propValue].push(item);
    });

    return groupedItems;
}

export function transformSubMenuItems(subMenuItems: SubMenuItems): TransformedSubMenuItems[] {
    const transformedSubMenuItems: TransformedSubMenuItems[] = [];

    for (const type in subMenuItems) {
        if (subMenuItems.hasOwnProperty(type)) {
            const items = subMenuItems[type];
            transformedSubMenuItems.push(...items.map(item => ({ ...item, type })));
        }
    }

    return transformedSubMenuItems;
}

export function renameKey(obj: Record<string, any>, oldKey: string, newKey: string): void {
    // Check if the key to be modified exists
    if (obj.hasOwnProperty(oldKey)) {
        // Creates a new object, keeping the reference to the original object, but changing the key name to newKey.
        obj[newKey] = obj[oldKey];

        // Delete old key-value pairs
        delete obj[oldKey];
    }
}

export function getFilesInDirectory(directoryPath: string): string[] {
    const filesAndFolders = fs.readdirSync(directoryPath);
    const files = filesAndFolders.filter(fileOrFolder => {
        const fullPath = path.join(directoryPath, fileOrFolder);
        return fs.statSync(fullPath).isFile();
    });

    return files;
}

export function createElbowPath(from: string, to: string, x1: number, y1: number, x2: number, y2: number): string {
    if (from === 'left' && to === 'right') {
        if (x1 > x2) {
            const control1X = x1 - (x1 - x2) / 2;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (x1 < x2) {
            const control1X = x1 - 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y1 + (y2 - y1) / 2;
            const control3X = x2 + 50;
            const control3Y = control2Y;
            const control4X = control3X;
            const control4Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${control3Y} H${control4X} V${y2} H${x2}`;
            //const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${control3Y} H${control4X} V${control4Y} H${x2}`;
            return pathData;
        }
    }
    if (from === 'right' && to === 'left') {
        if (x1 < x2) {
            const control1X = x1 + (x2 - x1) / 2;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (x1 > x2) {
            const control1X = x1 + 30;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y1 - (y1 - y2) / 2;
            const control3X = x2 - 30;
            const control3Y = control2Y;
            const control4X = control3X;
            const control4Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${control3Y} H${control4X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'right' && to === 'right') {
        if (x1 >= x2) {
            const control1X = x1 + 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (x1 < x2) {
            const control1X = x2 + 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'left' && to === 'left') {
        if (x1 >= x2) {
            const control1X = x2 - 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (x1 < x2) {
            const control1X = x1 - 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'top' && to === 'bottom') {
        if (y1 > y2) {
            const control1X = x1;
            const control1Y = y1 - (y1 - y2) / 2;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (y1 < y2) {
            const control1X = x1;
            const control1Y = y1 - 50 ;
            const control2X = x1 + (x2 - x1) / 2;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2 + 50;
            const control4X = x2;
            const control4Y = control3Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${control3Y} H${control4X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'bottom' && to === 'top') {
        if (y1 < y2) {
            const control1X = x1;
            const control1Y = y1 + (y2 - y1) / 2;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (y1 > y2) {
            const control1X = x1;
            const control1Y = y1 + 50 ;
            const control2X = x1 - (x1 - x2) / 2;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2 - 50;
            const control4X = x2;
            const control4Y = control3Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${control3Y} H${control4X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'top' && to === 'top') {
        if (y1 >= y2) {
            const control1X = x1;
            const control1Y = y2 - 50;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (y1 < y2) {
            const control1X = x1;
            const control1Y = y1 - 50;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'bottom' && to === 'bottom') {
        if (y1 >= y2) {
            const control1X = x1;
            const control1Y = y1 + 50;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
        if (y1 < y2) {
            const control1X = x1;
            const control1Y = y2 + 50;
            const control2X = x2;
            const control2Y = control1Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'left' && to === 'top') {
        if (x1 > x2 && y1 < y2) {
            const controlX = x2;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 > x2 && y1 > y2) || (x1 < x2)) {
            const control1X = x1 - 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2 - 50;
            const control3X = x2;
            const control3Y = control2Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'top' && to === 'left') {
        if (x1 < x2 && y1 > y2) {
            const controlX = x1;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 < x2 && y1 < y2) || (x1 > x2)) {
            const control1X = x1;
            const control1Y = y1 - 50;
            const control2X = x2 - 50;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'right' && to === 'top') {
        if (x1 < x2 && y1 < y2) {
            const controlX = x2;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 < x2 && y1 > y2) || (x1 > x2)) {
            const control1X = x1 + 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2 - 50;
            const control3X = x2;
            const control3Y = control2Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'top' && to === 'right') {
        if (x1 > x2 && y1 > y2) {
            const controlX = x1;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 > x2 && y1 < y2) || (x1 < x2)) {
            const control1X = x1;
            const control1Y = y1 - 50;
            const control2X = x2 + 50;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'left' && to === 'bottom') {
        if (x1 > x2 && y1 > y2) {
            const controlX = x2;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 > x2 && y1 < y2) || (x1 < x2)) {
            const control1X = x1 - 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2 + 50;
            const control3X = x2;
            const control3Y = control2Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'bottom' && to === 'left') {
        if (x1 < x2 && y1 < y2) {
            const controlX = x1;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 < x2 && y1 > y2) || (x1 > x2)) {
            const control1X = x1;
            const control1Y = y1 + 50;
            const control2X = x2 - 50;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'right' && to === 'bottom') {
        if (x1 < x2 && y1 > y2) {
            const controlX = x2;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 < x2 && y1 < y2) || (x1 > x2)) {
            const control1X = x1 + 50;
            const control1Y = y1;
            const control2X = control1X;
            const control2Y = y2 + 50;
            const control3X = x2;
            const control3Y = control2Y;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
    if (from === 'bottom' && to === 'right') {
        if (x1 > x2 && y1 < y2) {
            const controlX = x1;
            const controlY = y2;
            const pathData = `M${x1},${y1} H${controlX} V${controlY} H${x2}`;
            return pathData;
        }
        if ((x1 > x2 && y1 > y2) || (x1 < x2)) {
            const control1X = x1;
            const control1Y = y1 + 50;
            const control2X = x2 + 50;
            const control2Y = control1Y;
            const control3X = control2X;
            const control3Y = y2;
            const pathData = `M${x1},${y1} H${control1X} V${control1Y} H${control2X} V${control2Y} H${control3X} V${y2} H${x2}`;
            return pathData;
        }
    }
}
