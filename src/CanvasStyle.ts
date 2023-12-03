import { CanvasNode, Component } from "obsidian";

export default class CanvasStyle extends Component {
    private node: CanvasNode;

    constructor(node: CanvasNode, menuConfig: MenuItem[]) {
        super();

        this.node = node;
        this.types = menuConfig.map((config) => config.type);

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

    setStyle(type: string, cssClass: string) {
        if (this.node.canvas.readonly) return;
        if (this[type] === cssClass) return;

        if (this[type] !== ''|| this[type] !== undefined) {
            this.oldType = this[type];
        }
        if (cssClass !== false || cssClass !== undefined) {
            this[type] = cssClass;
            this.node.unknownData[type] = cssClass;
        }

        this.updateNode(type);
    }

    updateNode(type: string) {
        if (this.oldType) {
            this.node.nodeEl.removeClass(this.oldType);
        }
        if (this[type]) {
            this.node.nodeEl.addClass(this[type]);
        }
    }
}
