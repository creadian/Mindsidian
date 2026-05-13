import type MindMap from './mindmap';
import type Node from './INode';

// Default palette. Inline-style colors (not CSS classes) so the rendered
// <mark> elements look the same in mindmap view, markdown source, and
// Obsidian's reading view across light/dark themes.
export const HIGHLIGHT_COLORS: { name: string; hex: string }[] = [
    { name: 'Yellow', hex: '#FFD580' },
    { name: 'Green',  hex: '#A7E8A4' },
    { name: 'Pink',   hex: '#FFB3D1' },
    { name: 'Blue',   hex: '#A4C9F7' },
    { name: 'Orange', hex: '#FFB088' },
    { name: 'Purple', hex: '#CDA8E6' },
];

// Floating palette of color swatches that appears next to the selected
// node. Click a swatch → wraps the node's text in <mark style="...">.
// Click × → strips the wrap. Click outside → close.
//
// Attached to mindmap.containerEL (the viewport), not appEl (the canvas),
// so it stays a constant visual size regardless of mindmap zoom.
export class HighlightPalette {
    private el: HTMLElement;
    private mindmap: MindMap;
    private outsideClickHandler: (e: MouseEvent) => void;
    private isOpen: boolean = false;
    private currentNode: Node | null = null;
    // Optional secondary targets (multi-select). When non-empty, pick()
    // applies the color/clear to every node in this list as well as
    // `currentNode`. Anchor / position is still based on `currentNode`.
    private currentNodes: Node[] = [];

    constructor(mindmap: MindMap) {
        this.mindmap = mindmap;
        var doc = mindmap.containerEL.ownerDocument || document;
        this.el = doc.createElement('div');
        this.el.classList.add('mm-highlight-palette');
        this.el.style.display = 'none';
        mindmap.containerEL.appendChild(this.el);

        HIGHLIGHT_COLORS.forEach((c) => {
            var swatch = doc.createElement('button');
            swatch.classList.add('mm-highlight-swatch');
            swatch.style.background = c.hex;
            swatch.setAttribute('aria-label', `Highlight ${c.name}`);
            swatch.setAttribute('title', c.name);
            swatch.addEventListener('click', (e) => {
                e.stopPropagation();
                this.pick(c.hex);
            });
            // Prevent the mousedown from blurring an in-flight contentEditable
            // (so applyHighlight's cancelEdit captures the latest text).
            swatch.addEventListener('mousedown', (e) => e.stopPropagation());
            this.el.appendChild(swatch);
        });

        var clear = doc.createElement('button');
        clear.classList.add('mm-highlight-swatch', 'mm-highlight-clear');
        clear.textContent = '×';
        clear.setAttribute('aria-label', 'Remove highlight');
        clear.setAttribute('title', 'Remove highlight');
        clear.addEventListener('click', (e) => {
            e.stopPropagation();
            this.pick(null);
        });
        clear.addEventListener('mousedown', (e) => e.stopPropagation());
        this.el.appendChild(clear);

        this.outsideClickHandler = (e: MouseEvent) => {
            if (this.isOpen && !this.el.contains(e.target as Node)) {
                this.close();
            }
        };
    }

    openForNode(node: Node) {
        this.currentNode = node;
        this.currentNodes = [];
        var nodeRect = (node as any).containEl.getBoundingClientRect();
        var crect = this.mindmap.containerEL.getBoundingClientRect();
        // Below the node, aligned to its left edge. Clamp into viewport
        // if the node sits near the right edge.
        var top = nodeRect.bottom - crect.top + 8;
        var left = nodeRect.left - crect.left;
        // Display first so we can measure the palette width.
        this.el.style.display = 'flex';
        var paletteWidth = this.el.offsetWidth;
        var maxLeft = this.mindmap.containerEL.clientWidth - paletteWidth - 8;
        if (left > maxLeft) left = maxLeft;
        if (left < 8) left = 8;
        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
        this.isOpen = true;

        // Defer attaching the outside-click listener until after the
        // current click cycle, otherwise the very click that opened the
        // palette would close it.
        var doc = this.mindmap.containerEL.ownerDocument || document;
        setTimeout(() => {
            doc.addEventListener('click', this.outsideClickHandler, true);
        }, 0);
    }

    // Open the palette anchored at `anchor`, and apply the chosen color
    // (or clear) to every node in `targets`. Used for multi-selection
    // highlighting — anchor is typically the first selected node.
    openForNodes(anchor: Node, targets: Node[]) {
        this.currentNode = anchor;
        this.currentNodes = targets ? targets.slice() : [];
        var nodeRect = (anchor as any).containEl.getBoundingClientRect();
        var crect = this.mindmap.containerEL.getBoundingClientRect();
        var top = nodeRect.bottom - crect.top + 8;
        var left = nodeRect.left - crect.left;
        this.el.style.display = 'flex';
        var paletteWidth = this.el.offsetWidth;
        var maxLeft = this.mindmap.containerEL.clientWidth - paletteWidth - 8;
        if (left > maxLeft) left = maxLeft;
        if (left < 8) left = 8;
        this.el.style.left = `${left}px`;
        this.el.style.top = `${top}px`;
        this.isOpen = true;
        var doc = this.mindmap.containerEL.ownerDocument || document;
        setTimeout(() => {
            doc.addEventListener('click', this.outsideClickHandler, true);
        }, 0);
    }

    close() {
        this.el.style.display = 'none';
        this.isOpen = false;
        this.currentNode = null;
        this.currentNodes = [];
        var doc = this.mindmap.containerEL.ownerDocument || document;
        doc.removeEventListener('click', this.outsideClickHandler, true);
    }

    private pick(color: string | null) {
        if (this.currentNodes && this.currentNodes.length > 0) {
            this.currentNodes.forEach((n) => {
                (n as any).applyHighlight(color);
            });
        } else if (this.currentNode) {
            (this.currentNode as any).applyHighlight(color);
        }
        this.close();
    }

    destroy() {
        this.close();
        if (this.el.parentNode) this.el.parentNode.removeChild(this.el);
    }
}
