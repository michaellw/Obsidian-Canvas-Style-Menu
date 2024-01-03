import { CanvasNode, Component } from "obsidian";
import { modifyClassOnElements } from "./utils";

export default class CanvasStyle extends Component {
    private node: CanvasNode;

    constructor(node: CanvasNode, menuConfig: MenuItem[]) {
        super();

        this.node = node;
        this.types = menuConfig.map((menuItem) => menuItem.type);

        this.types.forEach((type) => {
            this[type] = this.node.unknownData[type] || '';
        })
    }

    onload() {
        this.updateNode();
    }

    onunload() {
        super.onunload();
    }

    setStyle(cat: string, selector: string, type: string, cssClass: string) {
        if (this.node.canvas.readonly) return;
        if (this[type] === cssClass) return;

        if (this[type] !== '' || this[type] !== undefined) {
            this.oldType = this[type];
        }
        if (cssClass !== false || cssClass !== undefined) {
            this[type] = cssClass;
            this.node.unknownData[type] = cssClass;
        }

        this.updateNode(cat, selector, type);
    }

    async updateNode(cat: string, selector: string, type: string) {
        if (this.oldType) {
            if (cat === 'edge') {
                this.node.lineGroupEl.removeClass(this.oldType);
                this.node.lineEndGroupEl.removeClass(this.oldType);
                this.node.render()
            } else {
                try {
                    this.node.nodeEl.removeClass(this.oldType);
                    modifyClassOnElements('remove', this.node.contentEl, 'markdown-preview-view', this.oldType);
                } finally {}
            }
        }
        if (this[type]) {
            if (cat === 'edge') {
                this.node.lineGroupEl.addClass(this[type]);
                this.node.lineEndGroupEl.addClass(this[type]);
                this.node.render()
            } else {
                if (selector === 'cc') {
                    await modifyClassOnElements('add', this.node.contentEl, 'markdown-preview-view', this[type]);
                } else this.node.nodeEl.addClass(this[type]);
            }
        }
    }
}
