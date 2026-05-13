import INode, { INodeData } from './INode'
import Layout from './Layout'
import { HighlightPalette } from './HighlightPalette'
import { Notice, Platform } from 'obsidian'
import SVG from 'svg.js'
import { MindMapView } from '../MindMapView'
import { frontMatterKey, basicFrontmatter } from '../constants';
import Exec from './Execute'
import {uuid} from '../MindMapView'

import importXmind  from './import/xmindZen'
import jsZip from 'jszip'
import { t } from 'src/lang/helpers'

let deleteIcon = '<svg class="icon" width="16px" height="16.00px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path  d="M799.2 874.4c0 34.4-28 62.4-62.368 62.4H287.2a62.496 62.496 0 0 1-62.4-62.4V212h574.4v662.4zM349.6 100c0-7.2 5.6-12.8 12.8-12.8h300c7.2 0 12.768 5.6 12.768 12.8v37.6H349.6V100z m636.8 37.6H749.6V100c0-48-39.2-87.2-87.2-87.2h-300a87.392 87.392 0 0 0-87.2 87.2v37.6H37.6C16.8 137.6 0 154.4 0 175.2s16.8 37.6 37.6 37.6h112v661.6A137.6 137.6 0 0 0 287.2 1012h449.6a137.6 137.6 0 0 0 137.6-137.6V212h112c20.8 0 37.6-16.8 37.6-37.6s-16.8-36.8-37.6-36.8zM512 824c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.768-37.6-37.6-37.6-20.8 0-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6m-175.2 0c20.8 0 37.6-16.8 37.6-37.6v-400c0-20.8-16.8-37.6-37.6-37.6s-37.6 16.8-37.6 37.6v400c0.8 20.8 17.6 37.6 37.6 37.6m350.4 0c20.8 0 37.632-16.8 37.632-37.6v-400c0-20.8-16.8-37.6-37.632-37.6-20.768 0-37.6 16.8-37.6 37.6v400c0 20.8 16.8 37.6 37.6 37.6" /></svg>';
let addIcon = '<svg class="icon" width="16px" height="16.00px" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path  d="M512 1024C230.4 1024 0 793.6 0 512S230.4 0 512 0s512 230.4 512 512-230.4 512-512 512z m0-960C265.6 64 64 265.6 64 512s201.6 448 448 448 448-201.6 448-448S758.4 64 512 64z"  /><path d="M800 544H224c-19.2 0-32-12.8-32-32s12.8-32 32-32h576c19.2 0 32 12.8 32 32s-12.8 32-32 32z"  /><path  d="M512 832c-19.2 0-32-12.8-32-32V224c0-19.2 12.8-32 32-32s32 12.8 32 32v576c0 19.2-12.8 32-32 32z"  /></svg>';
let tempDispLevel = 0;

interface Setting {
    theme?: string;
    canvasSize?: number;
    background?: string;
    fontSize?: number;
    color?: string,
    exportMdModel?: string,
    headLevel: number,
    layoutDirect: string,
    strokeArray?:any[],
    focusOnMove?: boolean
}

export default class MindMap {
    root: INode;
    status: string;
    appEl: HTMLElement;
    contentEL: HTMLElement;
    containerEL: HTMLElement;
    path?: string;
    editNode?: INode;
    selectNode?: INode;
    lastSelectedNode?: INode;
    // Multi-selection: nodes picked via the 2s-hold marquee. Independent of
    // selectNode (single click), but clearSelectNode wipes both.
    selectNodes: INode[] = [];
    // Marquee state — 2s hold on empty space activates "selection mode",
    // which draws a rectangle and adds intersected nodes to selectNodes.
    _marqueeTimer: any = null;
    _marqueeMode: boolean = false;
    _marqueeMoved: boolean = false;
    _marqueeStartPageX: number = 0;
    _marqueeStartPageY: number = 0;
    _marqueeStartClientX: number = 0;
    _marqueeStartClientY: number = 0;
    _marqueeStartCanvasX: number = 0;
    _marqueeStartCanvasY: number = 0;
    _marqueeDom: HTMLElement = null;
    _isGroupDrag: boolean = false;
    // Suppress the immediate `click` event that follows the mouseup at the
    // end of a marquee gesture — otherwise appClickFn treats it as a click on
    // empty space and wipes the freshly-built multi-selection.
    _suppressNextClick: boolean = false;
    // The node currently shown with the drop-target highlight + indicator
    // arrow during an in-progress drag. Cached so appDrop / appTouchEnd can
    // commit the move based on what the user saw, not on a fresh hit-test
    // (which is unreliable if the finger lifts slightly off the target).
    _currentDropNode: INode | null = null;
    setting: Setting;
    data: INodeData;
    drag?: boolean;
    startX?: number;
    startY?: number;
    dx?: number;
    dy?: number;
    mmLayout?: Layout;
    draw: any;
    edgeGroup: any;
    _nodeNum: number = 0;
    _tempNum: number = 0;
    view?: MindMapView;
    colors: string[] = [];
    _dragNode: INode;
    exec: Exec;
    scalePointer: number[] = [];
    mindScale = 100;
    _indicateDom:HTMLElement;
    _menuDom:HTMLElement;
    _dragType:string='';
    _left:number;
    _top:number;
    dispLevel:number;
    isComposing = false;
    isFocused = true;
    highlightPalette: HighlightPalette | null = null;

    constructor(data: INodeData, containerEL: HTMLElement, setting?: Setting) {
        this.setting = Object.assign({
            theme: 'default',
            //canvasSize: 8000,
            canvasSize: 36000,
            fontSize: 16,
            background: 'transparent',
            color: 'inherit',
            exportMdModel: 'default',
            headLevel: 2,
            layoutDirect: ''
        }, setting || {});


        // Defensive resets — guard against stale state surviving across
        // close+reopen of the same file (Cmd+W bug). All zoom/touch state
        // must start fresh per instance.
        this.mindScale = 100;
        this.scalePointer = [];
        this._isTouchZooming = false;
        this._pinchStartDist = 0;
        this._pinchStartScale = 100;

        this.data = data;
        this.appEl = document.createElement('div');

        this.appEl.classList.add('mm-mindmap');
        this.appEl.classList.add(`mm-theme-${this.setting.theme}`);
        // On mobile, appEl must NOT be scrollable — its content (contentEL) is 100%
        // of its size so there's zero scroll room, causing instant rubber-band bounce.
        // containerEL is the real viewport; appEl is just the big canvas inside it.
        if (Platform.isDesktop) {
            this.appEl.style.overflow = "auto";
        } else {
            this.appEl.style.overflow = "visible";
        }


        this.contentEL = document.createElement('div');
        this.contentEL.style.position = "relative";
        this.contentEL.style.width = "100%";
        this.contentEL.style.height = "100%";
        this.appEl.appendChild(this.contentEL);
        this.draw = SVG(this.contentEL).size('100%', '100%');

        this.setAppSetting();
        containerEL.appendChild(this.appEl);
        this.containerEL = containerEL;


        //layout direct
        this._indicateDom = document.createElement('div');
        this._indicateDom.classList.add('mm-node-layout-indicate');
        this._indicateDom.style.display='none';

        //menu
        this._menuDom = document.createElement('div');
        this._menuDom.classList.add('mm-node-menu');
        this._menuDom.style.display='none';
        this.setMenuIcon();

        this.contentEL.appendChild(this._indicateDom);
        this.contentEL.appendChild(this._menuDom);

        //history
        this.exec = new Exec();

        // link line
        this.edgeGroup = this.draw.group();

        this.appClickFn = this.appClickFn.bind(this);
        this.appDragstart = this.appDragstart.bind(this);
        this.appDragend = this.appDragend.bind(this);
        this.appDragover = this.appDragover.bind(this);
        this.appDblclickFn = this.appDblclickFn.bind(this);
        this.appMouseOverFn = this.appMouseOverFn.bind(this);
        this.appDrop = this.appDrop.bind(this);
        this.appKeyup = this.appKeyup.bind(this);
        this.compositionStart = this.compositionStart.bind(this);
        this.compositionEnd = this.compositionEnd.bind(this);

        this.appKeydown = this.appKeydown.bind(this);
        this.appMousewheel = this.appMousewheel.bind(this);
        this.appContainerWheel = this.appContainerWheel.bind(this);
        this.appMouseMove = this.appMouseMove.bind(this);

        this.appMouseDown = this.appMouseDown.bind(this);
        this.appMouseUp = this.appMouseUp.bind(this);

        // Mobile touch handlers
        this.appTouchStart = this.appTouchStart.bind(this);
        this.appTouchMove = this.appTouchMove.bind(this);
        this.appTouchEnd = this.appTouchEnd.bind(this);
        this.appTouchCancel = this.appTouchCancel.bind(this);

        this.appFocusIn = this.appFocusIn.bind(this);
        this.appFocusOut = this.appFocusOut.bind(this);

        //custom event
        this.initNode = this.initNode.bind(this);
        this.renderEditNode = this.renderEditNode.bind(this);
        this.mindMapChange = this.mindMapChange.bind(this);

        this.initEvent();
        //this.center();
        this.dispLevel=0;
    }

    setMenuIcon(){
        var addNodeDom = document.createElement('span');
        var deleteNodeDom = document.createElement('span');
        addNodeDom.classList.add('mm-icon-add-node');
        deleteNodeDom.classList.add('mm-icon-delete-node');
        addNodeDom.innerHTML = addIcon;
        deleteNodeDom.innerHTML = deleteIcon;
        this._menuDom.appendChild(addNodeDom);
        this._menuDom.appendChild(deleteNodeDom);
    }

    setAppSetting() {
        this.appEl.style.width = `${this.setting.canvasSize}px`;
        this.appEl.style.height = `${this.setting.canvasSize}px`;
        this.contentEL.style.width = `100%`;
        this.contentEL.style.height = `100%`;
        //  this.contentEL.style.color=`${this.setting.color};`;
        this.contentEL.style.background = `${this.setting.background}`;
        this.contentEL.style.fontSize = `${this.setting.fontSize}px`;
    }
    //create node
    init(collapsedIds?: string[]) {
        var that = this;
        var data = this.data;
        var x = this.setting.canvasSize / 2 - 60;
        var y = this.setting.canvasSize / 2 - 200;
        var waitCollapseNodes:INode[]=[];

        function initNode(d: INodeData, isRoot: boolean, p?: INode) {
            that._nodeNum++;
            var n = new INode(d, that);
            // if (collapsedIds && collapsedIds.includes(n.getId())) {
            //     n.isExpand = false;
            // }
            // if (p && (!p.isExpand || p.isHide)) {
            //     n.isHide = true;
            // }

            that.contentEL.appendChild(n.containEl);
            if (isRoot) {
                n.setPosition(x, y);
                that.root = n;
                n.data.isRoot = true;
            } else {
                n.setPosition(0, 0);
                p.children.push(n);
                n.parent = p;
            }

            n.refreshBox();

            if(!d.expanded){
                waitCollapseNodes.push(n)
            }
            n.refreshBox();
            if (d.children && d.children.length) {
                d.children.forEach((dd: INodeData) => {
                    initNode(dd, false, n);
                });
            }
        }
        initNode(data, true);

        if(waitCollapseNodes.length){
            waitCollapseNodes.forEach(n=>{
                n.collapse();
            });
        }
    }

    traverseBF(callback: Function, node?: INode) {
        var array = [];
        array.push(node || this.root);
        var currentNode = array.shift();
        while (currentNode) {
            for (let i = 0, len = currentNode.children.length; i < len; i++) {
                array.push(currentNode.children[i]);
            }
            callback(currentNode);
            currentNode = array.shift();
        }
    }

    traverseDF(callback: Function, node?: INode, cbFirst?: boolean) {
        function recurse(currentNode: INode) {
            if (currentNode) {
                if (cbFirst) {
                    callback(currentNode);
                }
                if (currentNode.children) {
                    for (var i = 0, length = currentNode.children.length; i < length; i++) {
                        recurse(currentNode.children[i]);
                    }
                }
                if (!cbFirst) {
                    callback(currentNode);
                }
            }
        }
        recurse(node || this.root);

    }

    // --- Multi-select helpers (marquee selection) ---
    addToMultiSelect(node: INode) {
        if (!node || node.data.isRoot) return;
        if (this.selectNodes.indexOf(node) === -1) {
            this.selectNodes.push(node);
            if (node.containEl) {
                if (!node.containEl.classList.contains('mm-node-multi-select')) {
                    node.containEl.classList.add('mm-node-multi-select');
                }
                // Make the node grabbable for HTML5 drag — without this, the
                // user can't start a group drag from a multi-selected node on
                // desktop (draggable is only set by single-node select()).
                node.containEl.setAttribute('draggable', 'true');
            }
        }
    }

    clearMultiSelect() {
        if (!this.selectNodes || this.selectNodes.length === 0) return;
        for (var i = 0; i < this.selectNodes.length; i++) {
            var n = this.selectNodes[i];
            if (n && n.containEl) {
                n.containEl.classList.remove('mm-node-multi-select');
                if (!n.isSelect) {
                    n.containEl.setAttribute('draggable', 'false');
                }
            }
        }
        this.selectNodes = [];
    }

    isInMultiSelect(node: INode): boolean {
        return !!node && this.selectNodes.indexOf(node) !== -1;
    }

    // Drop any node from `set` whose ancestor is also in `set`. Prevents a
    // descendant being reparented away from a parent that just moved.
    _pruneToTopAncestors(nodes: INode[]): INode[] {
        if (!nodes || nodes.length < 2) return nodes ? nodes.slice() : [];
        var setIds: {[k:string]: boolean} = {};
        for (var i = 0; i < nodes.length; i++) {
            setIds[nodes[i].getId()] = true;
        }
        var out: INode[] = [];
        for (var j = 0; j < nodes.length; j++) {
            var n = nodes[j];
            var p = n.parent;
            var hasAncestorSelected = false;
            while (p) {
                if (setIds[p.getId()]) { hasAncestorSelected = true; break; }
                p = p.parent;
            }
            if (!hasAncestorSelected) out.push(n);
        }
        return out;
    }

    // Convert viewport (clientX/Y) coords to canvas (appEl) element coords,
    // accounting for current scale and transform-origin.
    //
    // CRITICAL: read transform-origin from CSS via getComputedStyle, NOT from
    // the JS-cached `scalePointer` variable. appMouseMove updates scalePointer
    // on every mouse move without changing the CSS transform-origin, so the
    // two drift apart — using the cached value here would put the marquee
    // off by `ox*(1-s)/s` pixels at any non-100% zoom. See Lessons Learned #35
    // in the tech doc.
    _viewportToCanvas(clientX: number, clientY: number): {x:number, y:number} {
        var rect = this.containerEL.getBoundingClientRect();
        var vx = clientX - rect.left;
        var vy = clientY - rect.top;
        var s = this.mindScale / 100;
        var ox = 0, oy = 0;
        try {
            var win = (this.appEl.ownerDocument && this.appEl.ownerDocument.defaultView) || window;
            var to = win.getComputedStyle(this.appEl).transformOrigin || '0px 0px';
            var parts = to.split(' ');
            ox = parseFloat(parts[0]) || 0;
            oy = parseFloat(parts[1]) || 0;
        } catch (e) {
            ox = this.scalePointer.length ? this.scalePointer[0] : 0;
            oy = this.scalePointer.length ? this.scalePointer[1] : 0;
        }
        var sL = this.containerEL.scrollLeft;
        var sT = this.containerEL.scrollTop;
        return {
            x: (vx + sL - ox * (1 - s)) / s,
            y: (vy + sT - oy * (1 - s)) / s
        };
    }

    // Walk all nodes and collect any whose getBox() rect intersects the
    // canvas-space rectangle [x1,y1,x2,y2].
    _nodesInRect(x1:number, y1:number, x2:number, y2:number): INode[] {
        var minX = Math.min(x1, x2);
        var maxX = Math.max(x1, x2);
        var minY = Math.min(y1, y2);
        var maxY = Math.max(y1, y2);
        var hits: INode[] = [];
        this.traverseDF((n: INode) => {
            if (!n || n.data.isRoot) return;
            if (n.isHide) return;
            var box = n.getBox();
            if (!box) return;
            var nLeft = box.x;
            var nTop = box.y;
            var nRight = box.x + box.width;
            var nBottom = box.y + box.height;
            if (nRight < minX || nLeft > maxX || nBottom < minY || nTop > maxY) return;
            hits.push(n);
        });
        return hits;
    }

    _enterMarqueeMode(startCanvasX:number, startCanvasY:number) {
        this._marqueeMode = true;
        if (!this._marqueeDom) {
            this._marqueeDom = document.createElement('div');
            this._marqueeDom.classList.add('mm-marquee');
            this.contentEL.appendChild(this._marqueeDom);
        }
        this._marqueeDom.style.display = 'block';
        this._marqueeDom.style.left = `${startCanvasX}px`;
        this._marqueeDom.style.top = `${startCanvasY}px`;
        this._marqueeDom.style.width = '0px';
        this._marqueeDom.style.height = '0px';
        // Replace any prior multi-selection so the new marquee defines a fresh set.
        this.clearMultiSelect();
        if (this.containerEL) {
            this.containerEL.style.cursor = 'crosshair';
        }
        try { if ((navigator as any).vibrate) (navigator as any).vibrate(15); } catch(e) {}
    }

    _updateMarquee(currentCanvasX:number, currentCanvasY:number) {
        if (!this._marqueeMode || !this._marqueeDom) return;
        var x1 = this._marqueeStartCanvasX;
        var y1 = this._marqueeStartCanvasY;
        var x2 = currentCanvasX;
        var y2 = currentCanvasY;
        var left = Math.min(x1, x2);
        var top = Math.min(y1, y2);
        var w = Math.abs(x2 - x1);
        var h = Math.abs(y2 - y1);
        this._marqueeDom.style.left = `${left}px`;
        this._marqueeDom.style.top = `${top}px`;
        this._marqueeDom.style.width = `${w}px`;
        this._marqueeDom.style.height = `${h}px`;

        // Live highlight as the rectangle grows.
        var hits = this._nodesInRect(x1, y1, x2, y2);
        var hitIds: {[k:string]: boolean} = {};
        for (var i = 0; i < hits.length; i++) hitIds[hits[i].getId()] = true;
        // Remove nodes no longer in the rect.
        for (var j = this.selectNodes.length - 1; j >= 0; j--) {
            var n = this.selectNodes[j];
            if (!hitIds[n.getId()]) {
                if (n.containEl) n.containEl.classList.remove('mm-node-multi-select');
                this.selectNodes.splice(j, 1);
            }
        }
        // Add any new ones.
        for (var k = 0; k < hits.length; k++) this.addToMultiSelect(hits[k]);
    }

    _endMarqueeMode() {
        this._marqueeMode = false;
        if (this._marqueeDom) this._marqueeDom.style.display = 'none';
        if (this._marqueeTimer) { clearTimeout(this._marqueeTimer); this._marqueeTimer = null; }
        if (this.containerEL) this.containerEL.style.cursor = '';
    }

    // Find the nearest valid drop-target node within `threshold` pixels of the
    // (clientX, clientY) viewport point. Returns null if nothing's close enough.
    // Excludes the dragNode itself and any descendant of it (cycle prevention).
    // Mobile-friendly: lets the user activate the drop indicator before their
    // finger covers the target node.
    _findNearestDropCandidate(clientX: number, clientY: number, dragNode: INode, threshold: number): INode | null {
        if (!dragNode) return null;
        var best: INode | null = null;
        var bestDist = threshold;
        var self = this;
        this.traverseDF((n: INode) => {
            if (!n || n === dragNode) return;
            if (n.isHide) return;
            // Skip descendants of the drag node (would create a cycle).
            var p = n;
            while (p) {
                if (p === dragNode) return;
                p = p.parent;
            }
            var rect = n.containEl ? n.containEl.getBoundingClientRect() : null;
            if (!rect || rect.width === 0) return;
            // Distance from (clientX, clientY) to the nearest edge of rect.
            // Inside the rect → distance is 0.
            var dx = 0;
            if (clientX < rect.left) dx = rect.left - clientX;
            else if (clientX > rect.right) dx = clientX - rect.right;
            var dy = 0;
            if (clientY < rect.top) dy = rect.top - clientY;
            else if (clientY > rect.bottom) dy = clientY - rect.bottom;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = n;
            }
        });
        return best;
    }

    // Manage the dashed outline highlight on the candidate drop-target. Idempotent.
    _setDropHighlight(node: INode | null) {
        if (this._currentDropNode === node) return;
        if (this._currentDropNode && this._currentDropNode.containEl) {
            this._currentDropNode.containEl.classList.remove('mm-node-drop-target');
        }
        this._currentDropNode = node;
        if (node && node.containEl) {
            node.containEl.classList.add('mm-node-drop-target');
        }
    }

    _cancelMarqueeTimerIfPending() {
        if (this._marqueeTimer) {
            clearTimeout(this._marqueeTimer);
            this._marqueeTimer = null;
        }
    }

    getNodeById(id: string) {
        var snode: INode = null;
        this.traverseDF((n: INode) => {
            if (n.getId() == id) {
                snode = n;
            }
        });

        return snode;
    }

    clearSelectNode() {
        if (this.selectNode) {
            this.lastSelectedNode = this.selectNode;
            this.selectNode.unSelect();
            this.selectNode = null
        }
        if (this.editNode) {
            if(this.editNode.data.isEdit){
                this.editNode.cancelEdit();
            }
            this.editNode = null;
        }
        this.clearMultiSelect();

        // if(this.selectingNodes)
        // {// Add the node to the selectedNodes
        //     this.selectedNodes.push(this.selectNode);
        // }
        // else {
        //     this.selectedNodes = [];
        // }
        // console.log(this.selectedNodes.length+" selected: "+this.selectedNodes);

        // if (this.selectNode) {
        //     this.selectNode.unSelect();
        //     this.selectNode = null
        // }
        // if (this.editNode) {
        //     if(this.editNode.data.isEdit){
        //         this.editNode.cancelEdit();
        //     }
        //     this.editNode = null;
        // }
    }


    initEvent() {
        this.appEl.addEventListener('click', this.appClickFn);
        this.appEl.addEventListener('mouseover', this.appMouseOverFn);
        this.appEl.addEventListener('dblclick', this.appDblclickFn);
        this.appEl.addEventListener('dragstart', this.appDragstart);
        this.appEl.addEventListener('dragover', this.appDragover);
        this.appEl.addEventListener('dragend', this.appDragend);
        this.appEl.addEventListener('drop', this.appDrop);
        // Use the document that owns this view's DOM — for popout windows
        // ownerDocument is the popout's document, not the main window's.
        var doc = this.containerEL.ownerDocument || document;
        doc.addEventListener('keyup', this.appKeyup);
        doc.addEventListener('keydown', this.appKeydown);
        doc.addEventListener('compositionstart',this.compositionStart)
        doc.addEventListener('compositionend',this.compositionEnd)
        if(Platform.isDesktop){
            this.containerEL.addEventListener('wheel', this.appMousewheel, { passive: false });
            this.containerEL.addEventListener('wheel', this.appContainerWheel, { passive: false });
            this.appEl.addEventListener('mousedown', this.appMouseDown);
            this.appEl.addEventListener('mouseup', this.appMouseUp);
            this.appEl.addEventListener('mousemove', this.appMouseMove);
        } else {
            // Mobile: let iOS handle panning natively (smooth, hardware-accelerated).
            // Only intercept 2-finger pinch for custom zoom + long-press for edit.
            // touch-action: pan-x pan-y allows native scroll, blocks native pinch
            // so we can handle zoom in JS without fighting iOS.
            this.appEl.style.touchAction = 'pan-x pan-y';
            this.containerEL.style.touchAction = 'pan-x pan-y';
            this.appEl.style.willChange = 'transform';
            this.appEl.addEventListener('touchstart', this.appTouchStart, { passive: false });
            this.appEl.addEventListener('touchmove', this.appTouchMove, { passive: false });
            this.appEl.addEventListener('touchend', this.appTouchEnd);
            this.appEl.addEventListener('touchcancel', this.appTouchCancel);
        }

        this.containerEL.addEventListener('focusin', this.appFocusIn);
        this.containerEL.addEventListener('focusout', this.appFocusOut);
        //custom event
        this.on('initNode', this.initNode);
        this.on('renderEditNode', this.renderEditNode);
        this.on('mindMapChange', this.mindMapChange);

    }

    removeEvent() {
        this.appEl.removeEventListener('click', this.appClickFn);
        this.appEl.removeEventListener('dragstart', this.appDragstart);
        this.appEl.removeEventListener('dragover', this.appDragover);
        this.appEl.removeEventListener('dragend', this.appDragend);
        this.appEl.removeEventListener('dblclick', this.appDblclickFn);
        this.appEl.removeEventListener('mouseover', this.appMouseOverFn);
        this.appEl.removeEventListener('drop', this.appDrop);
        var doc = this.containerEL.ownerDocument || document;
        doc.removeEventListener('keyup', this.appKeyup);
        doc.removeEventListener('keydown', this.appKeydown);
        doc.removeEventListener('compositionstart',this.compositionStart)
        doc.removeEventListener('compositionend',this.compositionEnd)

        if(Platform.isDesktop){
            this.containerEL.removeEventListener('wheel', this.appMousewheel);
            this.containerEL.removeEventListener('wheel', this.appContainerWheel);
            this.appEl.removeEventListener('mousedown', this.appMouseDown);
            this.appEl.removeEventListener('mouseup', this.appMouseUp);
            this.appEl.removeEventListener('mousemove', this.appMouseMove);
        } else {
            this.appEl.removeEventListener('touchstart', this.appTouchStart);
            this.appEl.removeEventListener('touchmove', this.appTouchMove);
            this.appEl.removeEventListener('touchend', this.appTouchEnd);
            this.appEl.removeEventListener('touchcancel', this.appTouchCancel);
        }

        this.containerEL.removeEventListener('focusin', this.appFocusIn);
        this.containerEL.removeEventListener('focusout', this.appFocusOut);

        this.off('initNode', this.initNode);
        this.off('renderEditNode', this.renderEditNode);
        this.off('mindMapChange', this.mindMapChange);
    }

    initNode(evt: CustomEvent) {
        this._tempNum++;
        //console.log(this._nodeNum,this._tempNum);

        if (this._tempNum == this._nodeNum) {
            this.refresh();
            //this.center();
        }
    }

    renderEditNode(evt: CustomEvent) {
        var node = evt.detail.node || null;
        node?.clearCacheData();
        this.refresh();
    }

    mindMapChange() {
        //console.log(this.view)
        this.view?.mindMapChange();
    }
    appFocusIn(evt: FocusEvent){
        setTimeout(() => {
            if (this.containerEL.contains(evt.relatedTarget as Node)) return;
            this.isFocused = true;
        }, 100);
    }
    appFocusOut(evt: FocusEvent){
        if (this.containerEL.contains(evt.relatedTarget as Node)) return;
        this.isFocused = false;
    }
    appKeydown(e: KeyboardEvent) {
        if (!this.isFocused) {
            // Fallback: appFocusIn has a 100ms setTimeout before flipping
            // isFocused back to true. After cancelEdit briefly blurs
            // contentEl (the browser focuses <body> momentarily when
            // contentEditable is removed) and node.select() then re-focuses
            // containEl, isFocused stays false for ~100ms. Rapid second
            // keypresses (Enter/Tab to add a sibling/child immediately
            // after Enter/Tab to commit edit) fall inside that window and
            // are silently dropped at this guard.
            //
            // Check the live DOM focus state too: if focus is already
            // inside our container, treat as focused regardless of the
            // cached isFocused. Diagnosed via [PROF2] instrumentation
            // in v0.5.45 — confirmed every dropped second-press had
            // activeElement inside containerEL but isFocused=false.
            var doc = this.containerEL.ownerDocument || document;
            if (!this.containerEL.contains(doc.activeElement)) return;
        }
        var keyCode = e.keyCode || e.which || e.charCode;
        var ctrlKey = e.ctrlKey || e.metaKey;
        var shiftKey = e.shiftKey;
        var altKey = e.altKey;

        // Escape cancels marquee mode or clears an existing multi-selection.
        if (e.key === 'Escape') {
            if (this._marqueeMode) {
                this._endMarqueeMode();
                this.clearMultiSelect();
                if (!Platform.isDesktop) {
                    this.appEl.style.touchAction = 'pan-x pan-y';
                    this.containerEL.style.touchAction = 'pan-x pan-y';
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (this.selectNodes.length > 0) {
                this.clearMultiSelect();
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        // if (ctrlKey) {                         // Shift -> Selecting
        //     // ctrl -> selecting
        //     this.selectingNodes = true;
        // } else {
        //     this.selectingNodes = false;
        // }

        if (!ctrlKey && !shiftKey && !altKey) { // No special key
            // Delete / Backspace — delete node when not editing
            if (e.key == 'Delete' || e.key == 'Backspace') {
                var node = this.selectNode;
                if (node && !node.data.isRoot && !node.data.isEdit) {
                    e.preventDefault();
                    e.stopPropagation();
                    node.mindmap.execute("deleteNodeAndChild", { node });
                    this._menuDom.style.display='none';
                }
                // When isEdit is true, do nothing — let the key go to the text editor
            }

            // Enter — add sibling node or end editing
            if (e.key == 'Enter') {
                var node = this.selectNode;
                if (node) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!node.data.isEdit) {
                        if (!node.parent) return;
                        var newNode = node.mindmap.execute('addSiblingNode', {
                            parent: node.parent
                        });
                        this._menuDom.style.display='none';
                        this.moveNode(newNode, node, 'down', false);
                    } else {
                        this.clearSelectNode();
                        node.select();
                        this.editNode = null;
                    }
                }
            }

            // Tab — add child node or end editing
            if (e.key == 'Tab') {
                var node = this.selectNode;
                if (node) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!node.data.isEdit) {
                        if (!node.isExpand) {
                            node.expand();
                        }
                        node.mindmap.execute("addChildNode", { parent: node });
                        this._menuDom.style.display='none';
                    } else {
                        this.clearSelectNode();
                        node.select();
                        this.editNode = null;
                    }
                }
            }

            // // Space
            // if (keyCode == 32) {
            //     var node = this.selectNode;
            //     if (node && !node.data.isEdit) {
            //         e.preventDefault();
            //         e.stopPropagation();
            //         node.edit();
            //         this._menuDom.style.display = 'none';
            //     }
            // }


        }


        if (ctrlKey && !shiftKey && !altKey) {  // CTRL key
        //     //ctrl + y
        //     if (keyCode == 89) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //         this.redo();
        //     }

        //     //ctrl + z
        //     if (keyCode == 90) {
        //         e.preventDefault();
        //         e.stopPropagation();
        //         this.undo();
        //     }
        }

            // Shift + F2 : Edit as space does
        // if (!ctrlKey && shiftKey && !altKey) {  // SHIFT key
        //     if (keyCode == 113) {
        //     // if (keyCode == 45) {
        //         var node = this.selectNode;
        //         if (node && !node.data.isEdit) {
        //             e.preventDefault();
        //             e.stopPropagation();
        //             if (!node.isExpand) {
        //                 node.expand();
        //             }
        //             if (!node.parent) return;
        //             node.mindmap.execute('addSiblingNode', {
        //                 parent: node.parent
        //             });
        //             this._menuDom.style.display='none';
        //         }
        //     }
        // }
    }

     compositionStart(e: KeyboardEvent) {

        this.isComposing = true;
     }
     compositionEnd(e: KeyboardEvent) {

        this.isComposing = false;
     }

    appKeyup(e: KeyboardEvent) {
        if (!this.isFocused) return; // Check if Mindmap is in focus or not
        var keyCode = e.keyCode || e.which || e.charCode;
        var ctrlKey = e.ctrlKey || e.metaKey;
        var shiftKey = e.shiftKey;
        var altKey = e.altKey;

        // if (ctrlKey) {                         // Shift -> Selecting
        //     // Ctrl -> selecting
        //     this.selectingNodes = true;
        // } else {
        //     this.selectingNodes = false;
        // }

        if (!ctrlKey && !shiftKey && !altKey) { // NO SPECIAL KEY
            // Enter
            // if (keyCode == 13 || e.key =='Enter') {
            //     var node = this.selectNode;
            //     e.preventDefault();
            //     e.stopPropagation();
            //     if(node) {// A node is selected
            //         if (!node.data.isEdit) {// Not editing a node => Add sibling node
            //             if (!node.isExpand) {
            //                 node.expand();
            //             }
            //             if (!node.parent) return;
            //             node.mindmap.execute('addSiblingNode', {
            //                 parent: node.parent
            //             });
            //             this._menuDom.style.display='none';
            //         }
            //         else {// Editing mode => end edit mode
            //             //node.cancelEdit();

            //             this.clearSelectNode();
            //             node.select();
            //             node.mindmap.editNode=null;
            //             //this.selectNode.unSelect();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }

            //delete
            // if (keyCode == 46 || e.key == 'Delete' || e.key == 'Backspace') {
            //     var node = this.selectNode;
            //     if (node && !node.data.isRoot && !node.data.isEdit) {
            //         e.preventDefault();
            //         e.stopPropagation();
            //         node.mindmap.execute("deleteNodeAndChild", { node });
            //         this._menuDom.style.display='none';
            //     }
            //     //else: Deletion makes no sense
            // }


            // Tab / Insert
            // if (keyCode == 9 || keyCode == 45 || e.key == 'Tab') {
            //     e.preventDefault();
            //     e.stopPropagation();
            //     var node = this.selectNode;
            //     if(node) {
            //         if (!node.data.isEdit) {// Not editing
            //             if (!node.isExpand) {
            //                 node.expand();
            //             }
            //             node.mindmap.execute("addChildNode", { parent: node });
            //             this._menuDom.style.display='none';
            //         } else{
            //             // this.selectNode.unSelect();
            //             this.clearSelectNode();
            //             node.select();
            //             node.mindmap.editNode=null;
            //         }
            //     }
            //     //else: no node selected -> nothing to do
            // }

                // Escape
            if (keyCode == 27) {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && node.data.isEdit) {
                    node.select();
                    node.mindmap.editNode = null;
                    node.cancelEdit();
                    this.undo();
                    //this.selectNode.unSelect();
                }
            }

            // up
            if (keyCode == 38 || e.key == 'ArrowUp') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if( node && !node.data.isEdit )
                {
                    var l_selectedNode = node;
                    while(  (this.selectNode == node)       &&
                            (l_selectedNode != this.root)   )
                    {
                        this._selectNode(l_selectedNode, "up");
                        l_selectedNode = l_selectedNode.parent;
                    }
                }
            }

            if (keyCode == 40 || e.key == 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if( node && !node.data.isEdit )
                {
                    var l_selectedNode = node;
                    while(  (this.selectNode == node)       &&
                            (l_selectedNode != this.root)   )
                    {
                        this._selectNode(l_selectedNode, "down");
                        l_selectedNode = l_selectedNode.parent;
                    }
                }
            }

            if (keyCode == 39 || e.key == 'ArrowRight') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    var rootPos = this.root.getPosition();
                    var nodePos = node.getPosition();
                    if(rootPos.x > nodePos.x)
                    {// Node on left side of the mindmap
                        node.unSelect();
                        node.parent.select();
                    }
                    else
                    {
                        var node = this.selectNode;
                        node.mindmap.execute('expandNode', {
                            node
                        });
                        this._selectNode(node, "right");
                    }
                }
            }

            if (keyCode == 37 || e.key == 'ArrowLeft') {
                e.preventDefault();
                e.stopPropagation();

                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    var rootPos = this.root.getPosition();
                    var nodePos = node.getPosition();
                    if(rootPos.x < nodePos.x)
                    {// Node on right side of the mindmap
                        node.unSelect();
                        node.parent.select();
                    }
                    else
                    {
                        var node = this.selectNode;
                        node.mindmap.execute('expandNode', {
                            node
                        });
                        this._selectNode(node, "left");
                    }
                }
            }

            // Home : Select root node
            if (keyCode == 36) {
                e.preventDefault();
                e.stopPropagation();

                if( (!this.selectNode)          ||
                    (!this.selectNode.data.isEdit)   )
                {// No edition: select root node
                    if(this.selectNode)
                    { this.selectNode.unSelect(); }
                    this.root.select();
                    this.center();
                }
            }
        }


        if (ctrlKey && !shiftKey && !altKey) {  // CTRL KEY
            /*//ctr + /  (or Ctrl + NumpadDivide) toggle expand node
            // if ((keyCode == 191) || (keyCode == 111)) {
            //     var node = this.selectNode;
            //     this._toggleExpandNode(node);
            // }
            if ((keyCode == 191) || (keyCode == 111)) {
                var node = this.selectNode;
                if (node && !node.data.isEdit) {
                    if (node.isExpand) {
                        node.mindmap.execute('collapseNode', {
                            node
                        })
                    } else {
                        node.mindmap.execute('expandNode', {
                            node
                        })
                    }
                }
            }*/

            // Ctrl + B => Bold
            // if (keyCode == 66) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {
            //         var l_prefix_1 = "**";
            //         var l_prefix_2 = "__";
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }

            //         this.refresh();
            //         this.scale(this.mindScale);
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Ctrl + I => Italic
            // if (keyCode == 73) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in italics only the selected part
            //             node.setSelectedText_italic();
            //         }

            //         else
            //         {// Set in italics the whole node
            //             var text = node.data.text;
            //             if( (  ((text.substring(0,1)=="*") ||
            //                     (text.substring(0,1)=="_") )        &&
            //                 (text.substring(0,2)!="**")             &&
            //                 (text.substring(0,2)!="__")             )   ||
            //                 (text.substring(0,3)=="***")                ||
            //                 (text.substring(0,3)=="___")                )
            //             {// Already italic
            //                 text = text.substring(1); // Remove leading * / _

            //                 if( (text.substring(text.length-1)=="*") ||
            //                     (text.substring(text.length-1)=="_") )   {
            //                     // Remove trailing * / _
            //                     text = text.substring(0,text.length-1);
            //                 }
            //                 // else: no trailing *
            //             }
            //             else {// Not in italic
            //                 text = "*"+text+"*"; // Use "*" to allow bold/italic change in whatever order
            //             }

            //             // Set in node text
            //             node.data.oldText = node.data.text;
            //             node.setText(text);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }

            //         this.refresh();
            //         this.scale(this.mindScale);
            //     }
            //     //else: no node selected: nothing to do
            // }


            // ctrl + E  center mindmap view
            // if (keyCode == 69) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     //this.center();
            //     this.centerOnNode(this.selectNode);
            // }


            // ctrl + Up: Move one node above
            // if (keyCode == 38 || e.key == 'ArrowUp') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else if((!node.data.isEdit)  &&
            //             (!node.data.isRoot)  )
            //     {// The node can be moved
            //         var type='top';
            //         if(node.getIndex() == 0)
            //         {// First sibling: move BELOW "previous" (=last) node
            //             type='down';
            //         }
            //         //else: no special treatment
            //         this.moveNode(node, node.getPreviousSibling(), type);
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Down: Move one step below
            // if (keyCode == 40 || e.key == 'ArrowDown') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else if((!node.data.isEdit)  &&
            //             (!node.data.isRoot)  )
            //     {// The node can be moved
            //         var type='down';
            //         if(node.getIndex() == node.parent.children.length-1)
            //         {// Last sibling: move ABOVE "next" (=first) node
            //             type='top';
            //         }
            //         //else: no special treatment
            //         this.moveNode(node, node.getNextSibling(), type);
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Left
            // if (keyCode == 37 || e.key == 'ArrowLeft') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected: select root node
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else {// Move current node as parent/child depending on the position
            //         var rootPos = this.root.getPosition();
            //         var nodePos = node.getPosition();
            //         if(rootPos.x < nodePos.x)
            //         {
            //             this._moveAsParent(node);
            //         }
            //         else
            //         {
            //             this._moveAsChild(node, node.getPreviousSibling());
            //         }
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + Right
            // if (keyCode == 39 || e.key == 'ArrowRight') {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(!node)
            //     {// No node selected
            //         this.root.select();
            //         node = this.selectNode;
            //     }
            //     else {
            //         var rootPos = this.root.getPosition();
            //         var nodePos = node.getPosition();
            //         if(rootPos.x < nodePos.x)
            //         {
            //             // this.selectedNodes.forEach((n:INode) => {
            //             //     this._moveAsChild(n);
            //             // });
            //             this._moveAsChild(node, node.getPreviousSibling());
            //         }
            //         else
            //         {
            //             this._moveAsParent(node);
            //         }
            //     }
            //     this.centerOnNode(this.selectNode);
            // }


            // // Ctrl + J: Join with following node
            // if (keyCode == 74) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node)
            //     {  this.joinWithFollowingNode(node); }
            //     // else: No node selected: nothing to do
            // }



            // Ctrl + Home : Select root node
            if (keyCode == 36) {
                e.preventDefault();
                e.stopPropagation();

                if( (!this.selectNode)              ||
                    (!this.selectNode.data.isEdit)  )
                {// No edition: select root node
                    if(this.selectNode && !this.selectNode.data.isRoot)
                    {
                        this.selectNode.unSelect();
                        this.root.select();
                    }
                    this.center();
                }
            }
        }


        if (ctrlKey && shiftKey && !altKey) {   // CTRL + SHIFT key
            // //Shift + Ctrl + space: toggle expand node
            // if (keyCode == 32) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node)
            //     { this._toggleExpandNode(node); }
            // }


            // Ctrl + Shift + Z => Old text
            // if (keyCode == 90) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node) {
            //         // var text = (node.data.oldText as string);
            //         var text = (node.data.oldText);
            //         node.setText(text);
            //         e.preventDefault();
            //         e.stopPropagation();
            //         console.log(text+" / "+node.data.text);
            //     }
            // }


            // Ctrl + Shift + Home : Center map
            // if (keyCode == 36) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     this.center();
            // }

        }


        if (altKey && !ctrlKey && !shiftKey) {          // Alt key

            // Alt + H => Highlight
            // if (keyCode == 72) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {// There is a node selected: format
            //         var l_prefix_1 = "==";
            //         var l_prefix_2 = l_prefix_1;
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Alt + é => Strike through
            // if (keyCode == 50) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     if(this.selectNode) {// There is a node selected: format
            //         var l_prefix_1 = "~~";
            //         var l_prefix_2 = l_prefix_1;
            //         var node = this.selectNode;

            //         if(node.data.isEdit)
            //         {// A node is edited: set in bold only the selected part
            //             var l_check_prefix = true;
            //             node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix);
            //         }

            //         else
            //         {// Set in bold the whole node
            //             this._formatNode(node, l_prefix_1, l_prefix_2);
            //             e.preventDefault();
            //             e.stopPropagation();
            //         }
            //     }
            //     //else: no node selected: nothing to do
            // }


            // Alt + Home : Node info in console
            // if (keyCode == 36) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     var node = this.selectNode;
            //     if(node) {
            //         console.log("Node idx: "+node.getIndex());
            //         console.log("Previous node idx: "+node.getPreviousSibling().getIndex());
            //         console.log("Next node idx: "+node.getNextSibling().getIndex());
            //         console.log("Node pos: x="+node.getPosition().x+" / y="+node.getPosition().y);
            //         console.log("Node dim: x="+node.getDimensions().x+" / y="+node.getDimensions().y);
            //         console.log("Canvas: "+this.setting.canvasSize);
            //         console.log("Disp scroll: x="+this.containerEL.scrollLeft+" / y="+this.containerEL.scrollTop);
            //         console.log("Disp client: x="+this.containerEL.clientWidth+" / y="+this.containerEL.clientHeight);

            //         //node.setText
            //     }
            // }


            // // Alt + PageUp: collapse one level from max displayed level
            // if (keyCode == 33) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     node = this.selectNode;
            //     if( (node)                                                  &&
            //         (this.getMaxNodeDisplayedLevel(node)>node.getLevel())   )
            //     {// Collapse only if current selected node would not be hidden
            //         this.setChildrenDisplayedLevel(this.getMaxNodeDisplayedLevel(node)-1);
            //         this.refresh();
            //         this.scale(this.mindScale);
            //         this.selectNode.select();
            //     }
            // }


            // // Alt + PageDn: expand one level
            // if (keyCode == 34) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     node = this.selectNode;
            //     if(node) {
            //         this.setChildrenDisplayedLevel(this.getMaxNodeDisplayedLevel(node)+1);
            //         this.refresh();
            //         this.scale(this.mindScale);
            //         this.selectNode.select();
            //     }
            // }


        }


        if (altKey && !ctrlKey && shiftKey) {           // Alt + Shift key

            // Alt + Shift + PageUp: collapse one level from current node
            // if (keyCode == 33) {
            //     if(this.selectNode) {
            //         this.setDisplayedLevel(this.selectNode.getLevel()-1);
            //         this.refresh();
            //         this.selectNode.parent.select();
            //     }
            // }


            // Alt + PageDn: expand one level
            // if (keyCode == 34) {
            //     if(this.selectNode) {
            //         this.setDisplayedLevel(this.selectNode.getLevel()+1);
            //         this.refresh();
            //         this.selectNode.select();
            //     }
            // }

        }


        if (altKey && ctrlKey && !shiftKey) {           // Alt + Ctrl key
            // Alt + Ctrl + S: Select node's text
            // if (keyCode == 83) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     let node = this.selectNode;
            //     if(node) {
            //         node.edit();
            //         node.selectText();
            //     }
            // }


        }


        if (altKey && ctrlKey && shiftKey) {            // Alt + Ctrl+ Shift key
            // None
            // if (keyCode == xx) {
            //     e.preventDefault();
            //     e.stopPropagation();

            //     let node = this.selectNode;
            //     if(node) {
            //         TBD
            //     }
            // }
        }


    }
    _hierarchySelectNode(node: INode, direct: string){
        if (!node) {
            return;
        }
        var viewportWidth = this.containerEL.clientWidth;
        var viewportHeight = this.containerEL.clientHeight;
        var diagonalViewport = Math.sqrt(viewportWidth * viewportWidth + viewportHeight * viewportHeight);
        const MAX_PARENT_DISTANCE = diagonalViewport / 5;
        var waitNode: INode = null;
        var nodePos = node.getPosition();
        // var mind = this;
        var rootPos = this.root.getPosition();
        var rootDirect = rootPos.x > nodePos.x ? 'right' : 'left';

        if (node === this.root) {
            waitNode = this.__selectChildren(node,direct);
            if (waitNode) {
                this.clearSelectNode();
                waitNode.select();
                return;
            }
        };

        if(direct === 'up'){
            if(node.parent){
                var indexOfNode = node.parent.children.indexOf(node);
                if (indexOfNode === 0 ) {
                    var parentPos = node.parent.getPosition();
                    var dx = Math.abs(parentPos.x - nodePos.x);
                    var dy = Math.abs(parentPos.y - nodePos.y);
                    var dis = Math.sqrt(dx * dx + dy * dy);
                    if(dis > MAX_PARENT_DISTANCE){
                        this._selectNode(node,direct);
                        return;
                    }
                    waitNode = node.parent;
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }else if (indexOfNode > 0){
                    waitNode = node.parent.children[indexOfNode - 1];
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            this._selectNode(node,direct);
        }
        else if(direct === 'down'){
            if(node.parent){
                var indexOfNode = node.parent.children.indexOf(node);
                if (indexOfNode === (node.parent.children.length - 1) ) {
                    var parentPos = node.parent.getPosition();
                    var dx = Math.abs(parentPos.x - nodePos.x);
                    var dy = Math.abs(parentPos.y - nodePos.y);
                    var dis = Math.sqrt(dx * dx + dy * dy);
                    if(dis > MAX_PARENT_DISTANCE){
                        this._selectNode(node,direct);
                        return;
                    }
                    waitNode = node.parent;
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }else if (indexOfNode < (node.parent.children.length - 1)){
                    waitNode = node.parent.children[indexOfNode + 1];
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            this._selectNode(node,direct);
        }
        else if(direct === 'right') {
            if(rootDirect === 'right' && node.parent){
                waitNode = node.parent;
                this.clearSelectNode();
                waitNode.select();
                return;
            }else{
                waitNode = this.__selectChildren(node,direct);
                if (waitNode) {
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            // this._selectNode(node,direct);
        }
        else if(direct === 'left') {
            if(rootDirect === 'left' && node.parent){
                waitNode = node.parent;
                this.clearSelectNode();
                waitNode.select();
                return;
            }else{
                waitNode = this.__selectChildren(node,direct);
                if (waitNode) {
                    this.clearSelectNode();
                    waitNode.select();
                    return;
                }
            }
            // this._selectNode(node,direct);
        }
    }

    __selectChildren(node: INode, direct: string){
        if (!node) return;
        if (!node.isExpand) return;
        var minDis: number;
        var waitNode: INode = null;
        var pos = node.getPosition();
        if (node.children) {
            node.children.forEach(n => {
                var p = n.getPosition();
                var dx = Math.abs(p.x - pos.x);
                var dy = Math.abs(p.y - pos.y);
                var dis = Math.sqrt(dx * dx + dy * dy);
                var _helper = ()=>{
                    if (minDis) {
                        if (minDis > dis) {
                            minDis = dis;
                            waitNode = n;
                        }
                    } else {
                        minDis = dis;
                        waitNode = n;
                    }
                }
                switch (direct) {
                    case "right":
                        if (p.x > pos.x) _helper()
                        break;
                    case "left":
                        if (p.x < pos.x) _helper()
                        break;
                    case "up":
                        if (p.y < pos.y) _helper()
                        break;
                    case "down":
                        if (p.y > pos.y) _helper()
                        break;
                }
            });
        }
        return waitNode;
    }

    _formatNode(node: INode, i_prefix_1: string, i_prefix_2: string) {
        var text = node.data.text;

        if( (text.substring(0,2) == i_prefix_1)  ||
            (text.substring(0,2) == i_prefix_2)  )
        {// Prefix must be substracted, bold first
            text = text.substring(2); // Remove leading prefix

            if( (text.substring(text.length-2) == i_prefix_1)  ||
                (text.substring(text.length-2) == i_prefix_2)  )
            {// Suffix must be substracted
                text = text.substring(0,text.length-2);
            }
            // else: no trailing prefix
        }

        else if(    (text.substring(1,3) == i_prefix_1)  ||
                    (text.substring(1,3) == i_prefix_2)  )
        {// Prefix must be substracted, italic (?) first
            text = text[0] + text.substring(3); // Remove prefix

            if( (text.slice(-3, -1) == i_prefix_1)   ||
                (text.slice(-3, -1) == i_prefix_2)   )
            {// Suffix must be substracted
                text = text.substring(0,text.length-3) +
                text.slice(-1);
            }
            // else: no trailing prefix
        }

        else if(    (text.substring(2,4) == i_prefix_1)  ||
                    (text.substring(2,4) == i_prefix_2)  )
        {// Prefix must be substracted, highlight (?) first
            text = text.substring(0,2) + text.substring(4); // Remove prefix

            if( (text.slice(-4, -2) == i_prefix_1)   ||
                (text.slice(-4, -2) == i_prefix_2)   )
            {// Suffix must be substracted
                text = text.substring(0,text.length-4) +
                text.slice(-2);
            }
            // else: no trailing prefix
        }

        else {// No pre-/suf-fix: add it
            text = i_prefix_1+text+i_prefix_1;
        }

        // Set the text in the node
        node.mindmap.execute('changeNodeText',{
            node:node,
            text:text,
            oldText:node.data.text
        });
        // node.data.oldText = node.data.text;
        // node.setText(text);
        node.select();
    }


    _moveAsParent(node: INode) {
        if( (!node.data.isEdit)     &&
            (!node.data.isRoot)     &&
            (node.getLevel() > 1)   )
        {// The node can be moved
            this.moveNode(node, node.parent, 'down');
        }

        return;
    }


    _moveAsChild(movedNode: INode, newParentNode: INode) {
        if( (!movedNode.data.isEdit)  &&
            (!movedNode.data.isRoot)  )
        {// The node can be moved
            this.moveNode(movedNode, newParentNode, 'child-right');
        }


        return;
    }


    _toggleExpandNode(node: INode) {
        if (node && !node.data.isEdit) {
            if (node.isExpand) {
                node.mindmap.execute('collapseNode', {
                    node
                });
            }
            else {
                node.mindmap.execute('expandNode', {
                    node
                });
            }
        }

        return;
    }


    _selectNode(node: INode, direct: string) {
        if (!node) {
            return;
        }

        var minDis: number;
        var waitNode: INode = null;
        var pos = node.getPosition();
        var rootPos = this.root.getPosition();
        var level = node.getLevel();
        var mind = this;


        mind.traverseDF((n: INode) => {
            var p = n.getPosition();
            var l = n.getLevel();
            var dx = Math.abs(p.x - pos.x);
            var dy = Math.abs(p.y - pos.y);
            var dis = Math.sqrt(dx * dx + dy * dy);
            switch (direct) {
                case "right":
                    if( ((pos.x>this.root.getPosition().x)  &&
                         (l == level+1)                     )   ||
                        ((pos.x<this.root.getPosition().x)  &&
                         (l == level-1)                     )   ||
                        ((level == 0)                       &&
                         l==1)                                  )
                    {// The tested node is at the correct level
                        if( (n == node.parent) || (node == n.parent) )
                        {// Move only within same lineage
                            if (p.x > pos.x) {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "left":
                    if( ((pos.x>this.root.getPosition().x)  &&
                         (l == level-1)                     )   ||
                        ((pos.x<this.root.getPosition().x)  &&
                         (l == level+1)                     )   ||
                         ((level == 0)                      &&
                          l==1)                                 )
                    {// The tested node is at the correct level
                        if( (n == node.parent) || (node == n.parent) )
                        {// Move only within same lineage
                            if (p.x < pos.x) {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "up":
                    if( (n.isShow())                &&
                        (((pos.x<rootPos.x) &&
                          (p.x<rootPos.x)   )   ||
                         ((pos.x>rootPos.x) &&
                          (p.x>rootPos.x)   )   )   )
                    {// Move only on shown nodes + on the same side of the root
                        if (p.y < pos.y) {
                            if(level == l)
                            {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
                case "down":
                    if( (n.isShow())                &&
                        (((pos.x<rootPos.x) &&
                          (p.x<rootPos.x)   )   ||
                         ((pos.x>rootPos.x) &&
                          (p.x>rootPos.x)   )   )   )
                    {// Move only on shown nodes + on the same side of the root
                        if (p.y > pos.y) {
                            if(level == l)
                            {
                                if (minDis) {
                                    if (minDis > dis) {
                                        minDis = dis;
                                        waitNode = n;
                                    }
                                } else {
                                    minDis = dis;
                                    waitNode = n;
                                }
                            }
                        }
                    }
                    break;
            }
        });

        if (waitNode) {
            mind.clearSelectNode();
            waitNode.select();
        }
    }

    appClickFn(evt: MouseEvent) {
        var targetEl = evt.target as HTMLElement;

        // Eat the click that follows a marquee mouseup — otherwise the
        // "empty-space click → clearSelectNode" branch below wipes the fresh
        // multi-selection the user just made.
        if (this._suppressNextClick) {
            this._suppressNextClick = false;
            evt.preventDefault();
            evt.stopPropagation();
            return;
        }

        // Manual double-click detector (desktop). Native `dblclick` doesn't
        // fire reliably in Obsidian popout windows — likely because the 1st
        // click's `node.select()` triggers `containEl.focus()` and the
        // browser's auto-scroll-into-view shifts the node so the 2nd click
        // lands on a different element. The native `dblclick` listener on
        // `appEl` is kept as a fallback; this detector handles it first when
        // it fires.
        if (Platform.isDesktop && targetEl) {
            var nodeEl = targetEl.closest('.mm-node') as HTMLElement | null;
            if (nodeEl && !targetEl.closest('.mm-node-menu') && !targetEl.hasClass('mm-node-bar')) {
                var clickedId = nodeEl.getAttribute('data-id');
                var now = Date.now();
                if (this._lastClickNodeId === clickedId && now - this._lastClickTime < 500) {
                    var node = this.getNodeById(clickedId);
                    if (node && (!this.editNode || this.editNode !== node)) {
                        this.selectNode = node;
                        node.edit();
                        this.editNode = node;
                        this._menuDom.style.display = 'none';
                    }
                    this._lastClickTime = 0;
                    this._lastClickNodeId = '';
                    evt.preventDefault();
                    evt.stopPropagation();
                    return;
                }
                this._lastClickTime = now;
                this._lastClickNodeId = clickedId;
            } else {
                this._lastClickTime = 0;
                this._lastClickNodeId = '';
            }
        }

        if (targetEl) {

            if (targetEl.tagName == 'A' && targetEl.hasClass("internal-link")) {
                evt.preventDefault();
                var targetEl = evt.target as HTMLElement;
                var href = targetEl.getAttr("href");
                if(href){
                    this.view.app.workspace.openLinkText(
                        href,
                        this.view.file.path,
                        evt.ctrlKey || evt.metaKey
                    );
                }
            }

            if (targetEl.hasClass('mm-node-bar')) {
                evt.preventDefault();
                evt.stopPropagation();
                var id = targetEl.closest('.mm-node').getAttribute('data-id');
                var node = this.getNodeById(id);

                if (node.isExpand) {
                    node.mindmap.execute('collapseNode', {
                        node
                    });
                } else {
                    node.mindmap.execute('expandNode', {
                        node
                    });
                }
                return
            }

            if(targetEl.closest('.mm-node-menu')){
                 if(targetEl.closest('.mm-icon-add-node')){
                      var selectNode = this.selectNode;
                      if(selectNode){
                         // Expand a folded parent BEFORE adding a child — otherwise
                         // the new node's layout slot isn't computed (the subtree is
                         // collapsed) and it renders at canvas (0,0). Mirrors the
                         // keyboard Tab handler.
                         if (!selectNode.isExpand) {
                             selectNode.expand();
                         }
                         selectNode.mindmap.execute("addChildNode", { parent: selectNode });
                         this._menuDom.style.display='none';
                      }
                 }

                 if(targetEl.closest('.mm-icon-delete-node')){
                    var selectNode = this.selectNode;
                    if(selectNode && !selectNode.data.isRoot){
                       selectNode.mindmap.execute("deleteNodeAndChild", { node: selectNode });
                       this._menuDom.style.display='none';
                    }
                 }
                 return;
            }

            if (targetEl.closest('.mm-node')) {
                var id = targetEl.closest('.mm-node').getAttribute('data-id');
                var node = this.getNodeById(id);
                if (!node.isSelect) {
                    this.clearSelectNode();
                    this.selectNode = node;
                    this.selectNode?.select();
                    // Show the add/delete menu on mobile when a node is selected
                    if (!Platform.isDesktop) {
                        this._menuDom.style.display='block';
                        var box = this.selectNode.getBox();
                        // Position further right to avoid overlap with the fold dot
                        this._menuDom.style.left = `${box.x + box.width + 28}px`;
                        this._menuDom.style.top = `${box.y + box.height/2 - 20}px`;
                    } else {
                        this._menuDom.style.display='none';
                    }
                }
            } else {
                // Tapping outside: end edit mode if editing, then clear selection
                if (this.editNode) {
                    this.editNode.cancelEdit();
                    this.editNode = null;
                }
                this.clearSelectNode();
                this._menuDom.style.display='none';
            }
        }
    }

    appDragstart(evt: MouseEvent) {
        evt.stopPropagation();
        this.startX = evt.pageX;
        this.startY = evt.pageY;
        if (evt.target instanceof HTMLElement) {
            if (evt.target.closest('.mm-node')) {
                var id = evt.target.closest('.mm-node').getAttribute('data-id');
                this._dragNode = this.getNodeById(id);
                this.drag = true;
                // If the dragged node is part of the marquee selection, treat
                // this as a group drag. On drop we'll reparent all selected
                // roots in one batched history step.
                this._isGroupDrag = this.isInMultiSelect(this._dragNode) && this.selectNodes.length > 1;
            }
        }
    }

    appDragend(evt: MouseEvent) {
        this.drag = false;
        this._indicateDom.style.display = 'none'
        this._menuDom.style.display = 'none';
        this._setDropHighlight(null);
    }

    appDragover(evt: MouseEvent) {
        evt.preventDefault();
        evt.stopPropagation();
        var x = evt.pageX;
        var y = evt.pageY;

        if (this.drag) {
            this.dx = x - this.startX;
            this.dx = y - this.startY;
        }

        // Wider hit zone (24px on desktop) so the indicator activates as the
        // cursor approaches a node, not just when it's directly on top.
        // The cursor doesn't cover the node like a finger does, so the band
        // is narrower than mobile's 60px.
        var node: INode = this._dragNode ? this._findNearestDropCandidate(evt.clientX, evt.clientY, this._dragNode, 24) : null;
        this._setDropHighlight(node);

        if (node) {
            var box = node.getBox();
            this._dragType = this._getDragType(node, x, y);
            this._indicateDom.style.display = 'block';
            this._indicateDom.style.left = box.x + box.width / 2 - 40 / 2 + 'px';
            this._indicateDom.style.top = box.y - 90 + 'px';
            this._indicateDom.className = 'mm-node-layout-indicate';

            if( this._dragType == 'top') {
                this._indicateDom.classList.add('mm-arrow-top');
            } else if ( this._dragType == 'down') {
                this._indicateDom.classList.add('mm-arrow-down');
            } else if ( this._dragType == 'left') {
                this._indicateDom.classList.add('mm-arrow-left');
            } else if ( this._dragType == 'right') {
                this._indicateDom.classList.add('mm-arrow-right');
            } else {
                this._indicateDom.classList.add('drag-type');
                var arr = this._dragType.split('-');
                if (arr[1]) {
                    this._indicateDom.classList.add('mm-arrow-' + arr[1]);
                } else {
                    this._indicateDom.classList.add('mm-arrow-right');
                }
            }
        } else {
            this._indicateDom.style.display = 'none';
            this._dragType = '';
        }
    }

    _getDragType(node:INode, x:number, y:number) {
        if (!node) return;

        var box = node.contentEl.getBoundingClientRect();

        box.x = box.x
        box.y = box.y;

        var direct = node.direct;
        switch (direct) {
            case 'right':
                if (y < box.y + box.height / 2 && x < box.x + box.width / 4 * 3) {
                    return 'top'
                }
                if (y > box.y + box.height / 2 && x < box.x + box.width / 4 * 3) {
                    return 'down'
                }
                return 'child-right'
            case 'left':
                if (y < box.y + box.height / 2 && x > box.x + box.width / 4) {
                    return 'top'
                }
                if (y > box.y + box.height / 2 && x > box.x + box.width / 4) {
                    return 'down'
                }

                return 'child-left'

            case 'top':
            case 'up':

                if (x < box.x + box.width / 4) {
                    return 'left'
                }
                if (x > box.x + box.width / 4 * 3) {
                    return 'right'
                }

                return 'child-top'
            case 'down':
            case 'bottom':
                if (x < box.x + box.width / 4) {
                    return 'left'
                }
                if (x > box.x + box.width / 4 * 3) {
                    return 'right'
                }
                return 'child-down'
            default:
                return 'child';

        }
    }

    appDrop(evt: any) {
        // Internal-node move/copy only applies when this drop originated from
        // an internal dragstart (which set _dragNode). External file drops
        // (e.g. .xmind imported from Finder) leave _dragNode undefined — fall
        // through to the file-handling block below instead of crashing.
        if (this._dragNode) {
            // Prefer the cached drop target (the node the user saw highlighted)
            // but fall back to a fresh nearest-node search in case the cache
            // was cleared by a transient empty-dragover tick before release.
            var dropNode = this._currentDropNode;
            if (!dropNode) {
                dropNode = this._findNearestDropCandidate(evt.clientX, evt.clientY, this._dragNode, 24);
            }
            // Make sure the drag-type is still valid; recompute against the
            // resolved target if it was reset.
            if (dropNode && !this._dragType) {
                this._dragType = this._getDragType(dropNode, evt.pageX, evt.pageY);
            }
            if (dropNode && !this._dragNode.data.isRoot) {
                evt.preventDefault();
                if (evt.ctrlKey) {// Ctrl key pressed: copy the node
                    let copiedNode = this.copyNode(this._dragNode);
                    dropNode.select();
                    this.pasteNode(copiedNode);
                }
                else {// Move the node (single or group)
                    if (this._isGroupDrag) {
                        this.moveNodesGroup(this.selectNodes, dropNode, this._dragType);
                    } else {
                        this.moveNode(this._dragNode, dropNode,this._dragType);
                    }
                }
            }
        }

        var files = evt.dataTransfer.files;
            if(files.length){
                  var f = files[0];
                  if(f.name.toLowerCase().endsWith('.xmind')){
                   try{
                       var me = this;
                       var reader = new FileReader();
                       reader.onload=()=>{
                            jsZip.loadAsync(reader.result).then((e)=>{
                               var files = e.files;
                               for (var k in files) {
                                  if (k == "content.json") {
                                   files[k].async("text").then((res) => {
                                     var mindData = JSON.parse(res);
                                       var data:any = importXmind(mindData[0]);



                                       me.clearNode();
                                       me.data = data.basicData;
                                       me.init();
                                       setTimeout(()=>{
                                           me.center();
                                           me.mindMapChange();
                                       },100);
                                   });
                                 }
                               }
                            })
                       }
                       reader.readAsArrayBuffer(f);
                   }catch(err){
                      new Notice('Parse xmind error')
                   }
                  }


       }

        this._indicateDom.style.display = 'none'
        this._menuDom.style.display = 'none';
        this._setDropHighlight(null);
        this._isGroupDrag = false;
    }

    appMouseOverFn(evt: MouseEvent) {
        const targetEl = evt.target as HTMLElement;

        if (targetEl.tagName !== "A") return;

        if (targetEl.hasClass("internal-link")) {
            this.view.app.workspace.trigger("hover-link", {
                event: evt,
                source: frontMatterKey,
                hoverParent: this.view,
                targetEl,
                linktext: targetEl.getAttr("href"),
                sourcePath: this.view.file.path,
            });
        }
    }

    appMouseMove(evt: MouseEvent) {
        const targetEl = evt.target as HTMLElement;
        this.scalePointer = [];
        this.scalePointer.push(evt.offsetX, evt.offsetY);
        if (targetEl.closest('.mm-node')) {
            var id = targetEl.closest('.mm-node').getAttribute('data-id');
            var node = this.getNodeById(id);
            if (node) {
                var box = node.getBox();
                this.scalePointer = [];
                this.scalePointer.push(box.x + box.width / 2, box.y + box.height / 2);
            }
        }else{
            // Marquee active — update rectangle and live-highlight, suppress pan.
            if (this._marqueeMode) {
                var canvasPt = this._viewportToCanvas(evt.clientX, evt.clientY);
                this._updateMarquee(canvasPt.x, canvasPt.y);
                return;
            }
            // 2s-hold timer pending — cancel it on first real movement, then pan.
            if (this._marqueeTimer) {
                var dx = Math.abs(evt.pageX - this._marqueeStartPageX);
                var dy = Math.abs(evt.pageY - this._marqueeStartPageY);
                if (dx > 5 || dy > 5) {
                    this._cancelMarqueeTimerIfPending();
                }
            }
            if(this.drag){
                this.containerEL.scrollLeft = this._left - (evt.pageX - this.startX);
                this.containerEL.scrollTop = this._top - (evt.pageY - this.startY);
            }
        }
    }

    appMouseDown(evt:MouseEvent){
        const targetEl = evt.target as HTMLElement;
        if(!targetEl.closest('.mm-node')){
            this.drag = true;
            this.startX = evt.pageX;
            this.startY = evt.pageY;
            this._left = this.containerEL.scrollLeft;
            this._top = this.containerEL.scrollTop;

            // Start the 2s hold-still timer for marquee mode. If the cursor
            // moves > 5px before it fires, appMouseMove cancels it and the
            // existing pan path keeps working unchanged.
            this._marqueeStartPageX = evt.pageX;
            this._marqueeStartPageY = evt.pageY;
            this._marqueeStartClientX = evt.clientX;
            this._marqueeStartClientY = evt.clientY;
            this._cancelMarqueeTimerIfPending();
            var self = this;
            this._marqueeTimer = setTimeout(function() {
                self._marqueeTimer = null;
                // Compute canvas start point AT TIMER FIRE TIME so the inverse-
                // transform reads the current CSS transform-origin / scroll.
                // Earlier we tried computing at mousedown, but if anything
                // updated CSS transform-origin in the 1.5s wait, the marquee
                // would land in the wrong place.
                var freshPt = self._viewportToCanvas(self._marqueeStartClientX, self._marqueeStartClientY);
                self._marqueeStartCanvasX = freshPt.x;
                self._marqueeStartCanvasY = freshPt.y;
                // Stop the pan that started on mousedown so the marquee owns the gesture.
                self.drag = false;
                self._enterMarqueeMode(self._marqueeStartCanvasX, self._marqueeStartCanvasY);
            }, 1500);
        }
    }

    appMouseUp(evt:MouseEvent){
        if (this._marqueeMode) {
            // Finalize the marquee — selectNodes is already populated by _updateMarquee.
            // Suppress the click event that fires immediately after this mouseup —
            // otherwise appClickFn treats the empty-space target as a click and
            // wipes the freshly-built multi-selection.
            this._suppressNextClick = true;
            this._endMarqueeMode();
            this.drag = false;
            evt.preventDefault();
            evt.stopPropagation();
            return;
        }
        this._cancelMarqueeTimerIfPending();
        this.drag = false;
    }

    // --- Mobile touch handlers ---
    // Panning: 100% native iOS scrolling (smooth, 120Hz, hardware-accelerated).
    // Edit mode: manual double-tap detector (in appTouchStart) — more reliable
    //   than relying on iOS's synthesized dblclick which gets suppressed when
    //   touch listeners are non-passive.
    // Long-press (500ms hold): drag-to-reparent.
    // Pinch zoom: anchor transformOrigin to the finger midpoint at gesture start
    //   and keep it there for the whole gesture. Scale changes during the pinch
    //   automatically keep the focal point under the fingers (no scroll math
    //   needed during the gesture). Avoids both the diagonal-drift and the
    //   high-zoom drift bugs.
    _pinchStartDist: number = 0;
    _pinchStartScale: number = 100;
    _longPressTimer: any = null;
    _isTouchZooming: boolean = false;
    // Long-press drag-to-reparent state (mobile only)
    _isLongPressDragging: boolean = false;
    _dragLastClientX: number = 0;
    _dragLastClientY: number = 0;
    _dragStartClientX: number = 0;
    _dragStartClientY: number = 0;
    // Scroll position at drag start — used to keep the dragged ghost glued
    // to the finger even when auto-pan scrolls the canvas underneath.
    _dragStartScrollLeft: number = 0;
    _dragStartScrollTop: number = 0;
    // Manual double-tap detector (touch)
    _lastTapTime: number = 0;
    _lastTapNodeId: string = '';
    // Manual double-click detector (desktop) — native `dblclick` is unreliable
    // in Obsidian popout windows; manual detection in appClickFn makes the
    // edit-on-double-click flow work consistently across main window, fresh
    // popout, and dragged-out tab.
    _lastClickTime: number = 0;
    _lastClickNodeId: string = '';

    _getTouchDist(touches: TouchList): number {
        var dx = touches[0].pageX - touches[1].pageX;
        var dy = touches[0].pageY - touches[1].pageY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    appTouchStart(evt: TouchEvent) {
        if (evt.touches.length === 2) {
            evt.preventDefault();
            this._isTouchZooming = true;
            this._pinchStartDist = this._getTouchDist(evt.touches);
            this._pinchStartScale = this.mindScale;

            // Finger midpoint relative to containerEL (viewport)
            var containerRect = this.containerEL.getBoundingClientRect();
            var midX = (evt.touches[0].clientX + evt.touches[1].clientX) / 2 - containerRect.left;
            var midY = (evt.touches[0].clientY + evt.touches[1].clientY) / 2 - containerRect.top;

            // Anchor the transform origin to the element point under the finger
            // midpoint. While the gesture is active, scale changes naturally
            // keep that point fixed at the finger midpoint — no scroll math
            // needed during the pinch. This avoids both the diagonal drift
            // (caused by amplified scroll formulas) and the high-zoom drift
            // (caused by layout-bounded scroll being unable to follow large
            // scrolllLeft targets at high scale).
            var s = this.mindScale / 100;
            var ox = this.scalePointer.length ? this.scalePointer[0] : 0;
            var oy = this.scalePointer.length ? this.scalePointer[1] : 0;
            var scrollL = this.containerEL.scrollLeft;
            var scrollT = this.containerEL.scrollTop;

            // The element coord currently under the finger midpoint.
            // Inverting visible_x = ex*s + ox*(1-s) - scrollLeft = midX:
            var focalEx = (midX + scrollL - ox * (1 - s)) / s;
            var focalEy = (midY + scrollT - oy * (1 - s)) / s;

            // Move transformOrigin to focalE without visually shifting anything.
            // After: visible_x = ex*s + focalEx*(1-s) - newScrollLeft. For the
            // focal point ex=focalEx to stay at midX:
            //   focalEx*s + focalEx*(1-s) - newScrollLeft = midX
            //   focalEx - newScrollLeft = midX
            //   newScrollLeft = focalEx - midX
            var newScrollL = focalEx - midX;
            var newScrollT = focalEy - midY;

            this.scalePointer = [focalEx, focalEy];
            this.appEl.style.transformOrigin = `${focalEx}px ${focalEy}px`;
            this.appEl.style.transform = `scale(${s}) translate3d(0,0,0)`;
            this.containerEL.scrollLeft = newScrollL;
            this.containerEL.scrollTop = newScrollT;

            this._menuDom.style.display = 'none';
            return;
        }

        if (evt.touches.length === 1) {
            var targetEl = evt.target as HTMLElement;

            // Manual double-tap detector — robust on iOS where synthetic
            // dblclick is unreliable when non-passive touch listeners exist.
            // Tap-on-same-node within 350ms = edit.
            var nodeAncestor = targetEl.closest('.mm-node') as HTMLElement | null;
            if (nodeAncestor && !targetEl.hasClass('mm-node-bar')) {
                var nodeId = nodeAncestor.getAttribute('data-id');
                var now = Date.now();
                if (this._lastTapNodeId === nodeId && now - this._lastTapTime < 350) {
                    // Double-tap detected — enter edit mode
                    var dblNode = this.getNodeById(nodeId);
                    if (dblNode && !this.editNode) {
                        if (this.selectNode && this.selectNode !== dblNode) {
                            this.clearSelectNode();
                        }
                        this.selectNode = dblNode;
                        dblNode.edit();
                        this.editNode = dblNode;
                        this._menuDom.style.display = 'none';
                    }
                    // Reset so a third tap doesn't immediately re-edit
                    this._lastTapTime = 0;
                    this._lastTapNodeId = '';
                    return;
                }
                this._lastTapTime = now;
                this._lastTapNodeId = nodeId;
            } else {
                this._lastTapTime = 0;
                this._lastTapNodeId = '';
            }

            // Long-press (500ms hold) on a node = drag-to-reparent.
            if (nodeAncestor && !targetEl.hasClass('mm-node-bar')) {
                var holdNode = this.getNodeById(nodeAncestor.getAttribute('data-id'));
                this._dragStartClientX = evt.touches[0].clientX;
                this._dragStartClientY = evt.touches[0].clientY;
                this._dragLastClientX = evt.touches[0].clientX;
                this._dragLastClientY = evt.touches[0].clientY;
                this._longPressTimer = setTimeout(() => {
                    if (holdNode && !this.editNode && !holdNode.data.isRoot) {
                        this._dragNode = holdNode;
                        this.drag = true;
                        this._isLongPressDragging = true;
                        // Capture scroll baseline — needed in appTouchMove to
                        // compensate ghost translate for auto-pan scroll.
                        this._dragStartScrollLeft = this.containerEL.scrollLeft;
                        this._dragStartScrollTop = this.containerEL.scrollTop;
                        // If the held node is part of the marquee selection,
                        // drag the whole group.
                        this._isGroupDrag = this.isInMultiSelect(holdNode) && this.selectNodes.length > 1;
                        // Apply the "being dragged" visual to the OUTER .mm-node
                        // (containEl), not the inner text div, so the whole
                        // box — border, fold dot, and shadow — lifts and follows.
                        holdNode.containEl.classList.add('mm-node-dragging');
                        this._menuDom.style.display = 'none';
                        if ((navigator as any).vibrate) (navigator as any).vibrate(20);
                        // Disable native panning so the drag finger doesn't scroll
                        this.appEl.style.touchAction = 'none';
                        this.containerEL.style.touchAction = 'none';
                    }
                }, 500);
            } else if (!nodeAncestor) {
                // Empty-space tap: start the 2s hold-still timer for marquee mode.
                // If the finger moves >10px before it fires, appTouchMove cancels it
                // so native iOS panning continues uninterrupted.
                this._marqueeStartPageX = evt.touches[0].clientX;
                this._marqueeStartPageY = evt.touches[0].clientY;
                var startClientX = evt.touches[0].clientX;
                var startClientY = evt.touches[0].clientY;
                this._cancelMarqueeTimerIfPending();
                var self = this;
                this._marqueeTimer = setTimeout(function() {
                    self._marqueeTimer = null;
                    var pt = self._viewportToCanvas(startClientX, startClientY);
                    self._marqueeStartCanvasX = pt.x;
                    self._marqueeStartCanvasY = pt.y;
                    self._enterMarqueeMode(pt.x, pt.y);
                    // Take over the gesture: stop iOS native pan.
                    self.appEl.style.touchAction = 'none';
                    self.containerEL.style.touchAction = 'none';
                }, 1000);
            }
        }
    }

    appTouchMove(evt: TouchEvent) {
        // Cancel pending long-press if the finger has actually moved.
        // We don't cancel it once the drag has started — finger movement IS the drag.
        if (this._longPressTimer && !this._isLongPressDragging) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }

        // Marquee active — update rectangle and live-highlight, suppress native pan.
        if (this._marqueeMode && evt.touches.length === 1) {
            evt.preventDefault();
            var mPt = this._viewportToCanvas(evt.touches[0].clientX, evt.touches[0].clientY);
            this._updateMarquee(mPt.x, mPt.y);
            return;
        }
        // 2s-hold timer pending — cancel on first real finger movement so iOS
        // native scroll continues uninterrupted. Do NOT preventDefault here.
        if (this._marqueeTimer && evt.touches.length === 1) {
            var mdx = Math.abs(evt.touches[0].clientX - this._marqueeStartPageX);
            var mdy = Math.abs(evt.touches[0].clientY - this._marqueeStartPageY);
            if (mdx > 10 || mdy > 10) {
                this._cancelMarqueeTimerIfPending();
            }
        }

        // Drag-to-reparent in progress: track finger, position drop indicator,
        // visually translate the dragged node so the user can see it follow,
        // and auto-pan if near the viewport edge.
        if (this._isLongPressDragging && evt.touches.length === 1 && this._dragNode) {
            evt.preventDefault();
            var t = evt.touches[0];
            this._dragLastClientX = t.clientX;
            this._dragLastClientY = t.clientY;

            // Make the dragged node visually follow the finger.
            // Apply translate to the OUTER .mm-node (containEl), not the inner
            // text div — otherwise only the text moves and the surrounding
            // box (border, fold dot, dragging-shadow) stays glued in place,
            // making it impossible to see where you're about to drop.
            // The node's layout position stays the same; only the visual paint
            // shifts. Divide by current zoom so the visual delta matches the
            // finger delta (the parent appEl is scaled).
            //
            // Additional asymmetric shift so the dragged ghost sits offset
            // from the finger — primarily LEFT (so the user can see the
            // target node clearly to the left of the ghost), with a small
            // upward lift. The shift is in visible pixels, divided by zoom
            // so it stays constant on screen regardless of mindmap scale.
            var s = this.mindScale / 100;
            var DRAG_VISUAL_SHIFT_X = 55; // strong leftward shift
            var DRAG_VISUAL_SHIFT_Y = 15; // gentle upward shift
            var shiftX = DRAG_VISUAL_SHIFT_X / s;
            var shiftY = DRAG_VISUAL_SHIFT_Y / s;
            // Compose translate from BOTH finger displacement AND any canvas
            // scroll that's happened since drag start. Without the scroll term,
            // every auto-pan tick (below) drifts the ghost off the finger by
            // ~12 visual px because the canvas moves under a static translate.
            var fingerDx = t.clientX - this._dragStartClientX;
            var fingerDy = t.clientY - this._dragStartClientY;
            var scrollDx = this.containerEL.scrollLeft - this._dragStartScrollLeft;
            var scrollDy = this.containerEL.scrollTop - this._dragStartScrollTop;
            var dx = (fingerDx + scrollDx) / s;
            var dy = (fingerDy + scrollDy) / s;
            this._dragNode.containEl.style.transform = `translate(${dx - shiftX}px, ${dy - shiftY}px)`;

            // The user is dragging the GHOST (not the finger), so the hit-test
            // must happen at the ghost's position — finger minus visual shift —
            // not at the raw finger position. Otherwise the target indicator
            // lands on whatever's under the finger while the user is aiming
            // the ghost at a node further left.
            var hitX = t.clientX - DRAG_VISUAL_SHIFT_X;
            var hitY = t.clientY - DRAG_VISUAL_SHIFT_Y;

            // Wide hit zone (60px on mobile) so the indicator appears before
            // the ghost covers the target node. _findNearestDropCandidate
            // skips the drag node and its descendants automatically.
            var dropNode: INode = this._findNearestDropCandidate(hitX, hitY, this._dragNode, 60);
            this._setDropHighlight(dropNode);

            if (dropNode) {
                this._dragType = this._getDragType(dropNode, hitX, hitY);
                var box = dropNode.getBox();
                this._indicateDom.style.display = 'block';
                this._indicateDom.style.left = box.x + box.width / 2 - 40 / 2 + 'px';
                this._indicateDom.style.top = box.y - 90 + 'px';
                this._indicateDom.className = 'mm-node-layout-indicate';
                if (this._dragType === 'top') {
                    this._indicateDom.classList.add('mm-arrow-top');
                } else if (this._dragType === 'down') {
                    this._indicateDom.classList.add('mm-arrow-down');
                } else if (this._dragType === 'left') {
                    this._indicateDom.classList.add('mm-arrow-left');
                } else if (this._dragType === 'right') {
                    this._indicateDom.classList.add('mm-arrow-right');
                } else {
                    this._indicateDom.classList.add('drag-type');
                    var arr = this._dragType.split('-');
                    if (arr[1]) {
                        this._indicateDom.classList.add('mm-arrow-' + arr[1]);
                    } else {
                        this._indicateDom.classList.add('mm-arrow-right');
                    }
                }
            } else {
                this._indicateDom.style.display = 'none';
                this._dragType = '';
            }

            // Auto-pan when the finger nears the viewport edge.
            // Bottom zone is deeper than the others because the mobile action
            // bar + iOS home indicator together occupy ~110px at the bottom of
            // the viewport — without the extra reach, the auto-pan trigger
            // would sit behind UI the user's finger can't usefully cross into.
            var rect = this.containerEL.getBoundingClientRect();
            var EDGE = 48;
            var EDGE_BOTTOM = 110;
            var SPEED = 12;
            var panned = false;
            if (t.clientX - rect.left < EDGE) { this.containerEL.scrollLeft -= SPEED; panned = true; }
            else if (rect.right - t.clientX < EDGE) { this.containerEL.scrollLeft += SPEED; panned = true; }
            if (t.clientY - rect.top < EDGE) { this.containerEL.scrollTop -= SPEED; panned = true; }
            else if (rect.bottom - t.clientY < EDGE_BOTTOM) { this.containerEL.scrollTop += SPEED; panned = true; }
            if (panned) {
                // Re-apply translate after auto-pan changed scroll, so the
                // ghost stays glued to the finger instead of trailing by
                // SPEED pixels per touchmove tick.
                var scrollDx2 = this.containerEL.scrollLeft - this._dragStartScrollLeft;
                var scrollDy2 = this.containerEL.scrollTop - this._dragStartScrollTop;
                var dx2 = (fingerDx + scrollDx2) / s;
                var dy2 = (fingerDy + scrollDy2) / s;
                this._dragNode.containEl.style.transform = `translate(${dx2 - shiftX}px, ${dy2 - shiftY}px)`;
            }
            return;
        }

        // Pinch zoom: only update scale. Origin was anchored to the finger
        // midpoint at gesture start, so the focal point stays put for free —
        // no scroll changes during the gesture.
        if (evt.touches.length === 2 && this._isTouchZooming) {
            evt.preventDefault();
            var dist = this._getTouchDist(evt.touches);
            var ratio = dist / this._pinchStartDist;
            var newScale = this._pinchStartScale * ratio;
            newScale = Math.max(20, Math.min(300, newScale));
            this.mindScale = newScale;
            this.appEl.style.transform = `scale(${newScale / 100}) translate3d(0,0,0)`;
            return;
        }
    }

    appTouchEnd(evt: TouchEvent) {
        if (this._longPressTimer) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }
        if (this._marqueeTimer) {
            clearTimeout(this._marqueeTimer);
            this._marqueeTimer = null;
        }
        if (this._marqueeMode) {
            // Finalize the marquee — restore native panning.
            this._endMarqueeMode();
            this.appEl.style.touchAction = 'pan-x pan-y';
            this.containerEL.style.touchAction = 'pan-x pan-y';
            return;
        }

        // Drop the dragged node if a long-press drag was in progress.
        if (this._isLongPressDragging && this._dragNode) {
            var dragNode = this._dragNode;
            // Commit to whatever target was last shown to the user (with the
            // indicator arrow + dashed highlight). More reliable than a fresh
            // elementFromPoint check — the finger may have lifted slightly off
            // the visible target by the moment of touchend.
            var dropNode: INode = this._currentDropNode;
            if (dropNode && this._dragType) {
                if (this._isGroupDrag) {
                    this.moveNodesGroup(this.selectNodes, dropNode, this._dragType);
                } else {
                    this.moveNode(dragNode, dropNode, this._dragType);
                }
            }
            // Clean up — clear the visual translate transform first so the
            // node snaps back to its layout position before being repainted
            // (or, if reparented, repainted at its new layout position).
            if (dragNode.containEl) {
                dragNode.containEl.style.transform = '';
                dragNode.containEl.classList.remove('mm-node-dragging');
            }
            // Defensive: also clear any leftover state on contentEl from
            // older builds where the transform/class lived on the inner div.
            if (dragNode.contentEl) {
                dragNode.contentEl.style.transform = '';
                dragNode.contentEl.classList.remove('mm-node-dragging');
            }
            this._indicateDom.style.display = 'none';
            this._isLongPressDragging = false;
            this._isGroupDrag = false;
            this._dragNode = null;
            this._dragType = '';
            this.drag = false;
            // Restore native panning
            this.appEl.style.touchAction = 'pan-x pan-y';
            this.containerEL.style.touchAction = 'pan-x pan-y';
        }

        if (this._isTouchZooming && evt.touches.length < 2) {
            this._isTouchZooming = false;
            this.scale(this.mindScale);
        }
    }

    appTouchCancel(evt: TouchEvent) {
        if (this._longPressTimer) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
        }
        if (this._marqueeTimer) {
            clearTimeout(this._marqueeTimer);
            this._marqueeTimer = null;
        }
        if (this._marqueeMode) {
            this._endMarqueeMode();
            this.appEl.style.touchAction = 'pan-x pan-y';
            this.containerEL.style.touchAction = 'pan-x pan-y';
        }
        // Cancel any in-progress drag without applying the move.
        if (this._isLongPressDragging) {
            if (this._dragNode) {
                if (this._dragNode.containEl) {
                    this._dragNode.containEl.style.transform = '';
                    this._dragNode.containEl.classList.remove('mm-node-dragging');
                }
                if (this._dragNode.contentEl) {
                    this._dragNode.contentEl.style.transform = '';
                    this._dragNode.contentEl.classList.remove('mm-node-dragging');
                }
            }
            this._indicateDom.style.display = 'none';
            this._setDropHighlight(null);
            this._isLongPressDragging = false;
            this._isGroupDrag = false;
            this._dragNode = null;
            this._dragType = '';
            this.drag = false;
            this.appEl.style.touchAction = 'pan-x pan-y';
            this.containerEL.style.touchAction = 'pan-x pan-y';
        }
        if (this._isTouchZooming) {
            this._isTouchZooming = false;
            this.scale(this.mindScale);
        }
    }

    appDblclickFn(evt: MouseEvent) {
        if (evt.target instanceof HTMLElement) {

            if (evt.target.hasClass('mm-node-bar')) {
                evt.preventDefault();
                evt.stopPropagation();
                return;
            }
            if (evt.target.closest('.mm-node') instanceof HTMLElement) {
                var id = evt.target.closest('.mm-node').getAttribute('data-id');
                this.selectNode = this.getNodeById(id);
                if (!this.editNode || (this.editNode && this.editNode != this.selectNode)) {
                    this.selectNode?.edit();
                    this.editNode = this.selectNode;
                    this._menuDom.style.display='none';
                }
            }
        }
    }

    // Handle normal scrolling (non-zoom) — take over from native scroll
    // to eliminate macOS momentum/inertia that causes direction-change lag
    appContainerWheel(evt: WheelEvent) {
        var ctrlKey = evt.ctrlKey || evt.metaKey;
        if (ctrlKey) return; // Let zoom handler deal with Ctrl+scroll

        evt.preventDefault();
        this.containerEL.scrollLeft += evt.deltaX;
        this.containerEL.scrollTop += evt.deltaY;
    }

    _lastScrollDir: number = 0;
    _scrollAccum: number = 0;

    appMousewheel(evt: any) {
        var ctrlKey = evt.ctrlKey || evt.metaKey;
        if (!ctrlKey) return;

        evt.preventDefault();
        evt.stopPropagation();

        // Use deltaY for modern browsers (trackpad-friendly)
        var rawDelta = 0;
        if (evt.deltaY !== undefined) {
            rawDelta = -evt.deltaY;
        } else if (evt.wheelDelta) {
            rawDelta = evt.wheelDelta / 120;
        } else if (evt.detail) {
            rawDelta = -evt.detail / 3;
        }

        if (rawDelta === 0) return;

        // Detect direction change — reset accumulator to avoid stale inertia
        var newDir = rawDelta > 0 ? 1 : -1;
        if (newDir !== this._lastScrollDir) {
            this._scrollAccum = 0;
            this._lastScrollDir = newDir;
        }

        // Accumulate small scroll deltas; only zoom when we cross a threshold
        // This smooths out trackpad micro-events and prevents choppiness
        this._scrollAccum += rawDelta;
        var threshold = 2;
        if (Math.abs(this._scrollAccum) < threshold) return;

        // Consume the accumulated amount
        var steps = Math.floor(Math.abs(this._scrollAccum) / threshold);
        this._scrollAccum = this._scrollAccum % threshold;

        // Anchor at the cursor's container-relative coord BEFORE updating
        // mindScale. This eliminates the start-of-zoom jump that occurs when
        // scalePointer has gone stale (panning the view doesn't fire
        // appMouseMove, so scalePointer can be far off-screen).
        var containerRect = this.containerEL.getBoundingClientRect();
        this._anchorScaleAt(evt.clientX - containerRect.left, evt.clientY - containerRect.top);

        if (newDir > 0) {
            this.mindScale = Math.min(300, this.mindScale + steps);
        } else {
            this.mindScale = Math.max(20, this.mindScale - steps);
        }
        this.scale(this.mindScale);
    }

    clearNode() {
        //delete node
        this.traverseBF((n: INode) => {
            this.contentEL.removeChild(n.containEl);
        });

        //delete line
        if (this.mmLayout) {
            this.mmLayout.svgDom?.clear();
        }

    }

    clear() {
        this.clearNode();
        this.removeEvent();
        this.draw?.clear();
    }
    //get node list rect point
    getBoundingRect(list: INode[]) {
        var box = {
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            right: 0,
            bottom: 0
        };
        list.forEach((item, i) => {
            var b = item.getBox();
           // console.log(b.x,b.y);
            if (i == 0) {
                box.x = b.x;
                box.y = b.y;
                box.right = b.x + b.width;
                box.bottom = b.y + b.height;
            } else {
                if (b.x < box.x) {
                    box.x = b.x
                }
                if (b.y < box.y) {
                    box.y = b.y
                }
                if (b.x + b.width > box.right) {
                    box.right = b.x + b.width;
                }
                if (b.y + b.height > box.bottom) {
                    box.bottom = b.y + b.height;
                }
            }
        });

        box.width = box.right - box.x;
        box.height = box.bottom - box.y;

        return box;
    }

    moveNode(dragNode: INode, dropNode: INode, type:string, setInHistory: boolean = true) {

        if (dragNode == dropNode || dragNode.data.isRoot) {
            return
        }

        var flag = false;
        var p = dropNode.parent;
        while (p) {
            if (p == dragNode) {
                flag = true;
                break;
            }
            p = p.parent;
        }
        if (flag) {  //parent  can not change to child
            return;
        }

        dropNode.clearCacheData();
        dragNode.clearCacheData();

        if (type == 'right' || type == 'left'){
            if (!dropNode.isExpand) {
                dropNode.expand();
            }
        }

        if (type == 'top' || type == 'left' ||type == 'down' || type == 'right') {
            this.execute('moveNode', { type: 'siblings', node: dragNode, oldParent: dragNode.parent, dropNode, direct: type, inHistory: setInHistory})
        }
        else if (type.indexOf('child') > -1) {
            var typeArr = type.split('-');
            if (typeArr[1]) {
                this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode, direct: typeArr[1] })
            }
            else {
                this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode });
            }
        }

       // this.execute('moveNode', { type: 'child', node: dragNode, oldParent: dragNode.parent, parent: dropNode })
    }

    // Group reparent: move every selected node (pruned to top ancestors so a
    // descendant doesn't get moved away from a parent that just moved) under
    // dropNode/type, in a single history step.
    moveNodesGroup(nodes: INode[], dropNode: INode, type: string) {
        if (!nodes || nodes.length === 0 || !dropNode || !type) return;
        // 1. Prune descendants whose ancestor is also in the set.
        var roots = this._pruneToTopAncestors(nodes);
        // 2. Filter out invalid moves (root nodes, self-as-drop, would-create-cycle).
        var valid: INode[] = [];
        for (var i = 0; i < roots.length; i++) {
            var n = roots[i];
            if (n.data.isRoot) continue;
            if (n === dropNode) continue;
            // Cycle check: dropNode must not be a descendant of n.
            var p = dropNode.parent;
            var isCycle = false;
            while (p) { if (p === n) { isCycle = true; break; } p = p.parent; }
            if (isCycle) continue;
            valid.push(n);
        }
        if (valid.length === 0) return;
        // 3. Sibling drops anchor adjacent to dropNode. To preserve selection
        //    order in the resulting tree, iterate forward for "after"
        //    directions and reverse for "before" directions.
        var reverse = (type === 'top' || type === 'left');
        var ordered = reverse ? valid.slice().reverse() : valid.slice();
        // 4. Build the MoveNode-data array for the batched command.
        var builds: any[] = [];
        for (var j = 0; j < ordered.length; j++) {
            var node = ordered[j];
            if (type === 'top' || type === 'left' || type === 'down' || type === 'right') {
                builds.push({ type: 'siblings', node: node, oldParent: node.parent, dropNode: dropNode, direct: type });
            } else if (type.indexOf('child') > -1) {
                if (type === 'right' || type === 'left') {
                    if (!dropNode.isExpand) dropNode.expand();
                }
                var typeArr = type.split('-');
                if (typeArr[1]) {
                    builds.push({ type: 'child', node: node, oldParent: node.parent, parent: dropNode, direct: typeArr[1] });
                } else {
                    builds.push({ type: 'child', node: node, oldParent: node.parent, parent: dropNode });
                }
            }
            dropNode.clearCacheData();
            node.clearCacheData();
        }
        if (builds.length === 0) return;
        this.execute('groupMoveNode', { builds: builds, mind: this, selectAfter: valid[0] });
        // Re-apply multi-select highlight on the moved nodes so the user can
        // see what they just placed.
        this.clearMultiSelect();
        for (var k = 0; k < valid.length; k++) this.addToMultiSelect(valid[k]);
    }


    // Move all the current node's siblings as this node's children
    moveAllSiblingsAsChildren(node: INode) {
        var sibs = node.getSiblings();
        sibs.forEach((sib) => {
            this._moveAsChild(sib, node);
        })

        return;
    }


    // Move the current node's next siblings as this node's children
    moveNextSiblingsAsChildren(node: INode) {
        var sibs = node.getAllNextSiblings();
        sibs.forEach((sib) => {
            this._moveAsChild(sib, node);
        })

        return;
    }


    // Join the current node with the following node
    joinWithFollowingNode(node: INode, in_asCitation: Boolean) {
        let joinedNode = node.getNextSibling();

        // Set node's text, except for the starting emoticon and finishing link (if any)
        const emoticonRegex = /^[\u263a-\u27bf\u{1f300}-\u{1f9ff}]/u;
        // Regex to match links with the link pattern [🔗](...)
        // [🔗] is constant and (...) is any content inside parentheses.
        const linkRegex = /\[🔗\]\(.*\.pdf\)/g;
        const pageRegex = / \(p\. \d+\)$/;
        // Remove the emoticon and links from the text
        let node_text = (node.data.text)
            .replace(linkRegex, "")        // Remove all links of the form [🔗](...)
            .trimEnd()                     // Trim ending whitespace
            .replace(pageRegex, "")        // Remove last page of the form (p. ...)
        let joinedText = joinedNode.data.text
            .replace(emoticonRegex, "")    // Remove starting emoticon
            .trimStart();                  // Trim leading whitespace

        let l_middle_text = " "
        if (in_asCitation)
        { l_middle_text += "(…)"
        }
        l_middle_text += "<br>"
        node.setText(node_text + l_middle_text + joinedText);

        // let joinedText = joinedNode.data.text.replace(emoticonRegex, "").trimStart();
        // node.setText(node.data.text + " (…) " + joinedText);
        // node.setText(node.data.text + " (…) " + joinedNode.data.text);


        if(!joinedNode.isLeaf())
        {// The joined node has children: copy them to the current node
            joinedNode.children.forEach((n) => {
                //this._moveAsChild(n, node);
                let copiedNode = this.copyNode(n);
                this.selectNode.unSelect();
                node.select();
                this.pasteNode(copiedNode);
            });
        }

        // Delete joined node
        this.removeNode(joinedNode);

        this.clearSelectNode();
        this.refresh();
        this.scale(this.mindScale);
        node.select();
    }

    //execute cmd , store history
    execute(name: string, data?: any) {
        return this.exec.execute(name, data);
    }
    undo() {
        this.exec.undo();
    }

    redo() {
        this.exec.redo();
    }

    addNode(node: INode, parent?: INode, index = -1) {
        if (parent) {
            parent.addChild(node, index);
            if (parent.direct) {
                node.direct = parent.direct;
            }
            this._addNodeDom(node);
            node.clearCacheData();
        }
    }

    _addNodeDom(node: INode) {
        this.traverseBF((n: INode) => {
            if (!this.contentEL.contains(n.containEl)) {
                this.contentEL.appendChild(n.containEl);
            }
        }, node);
    }

    removeNode(node: INode) {
        if (node.parent) {
            var p = node.parent;
            var i = node.parent.removeChild(node);
            this._removeChildDom(node);
            p.clearCacheData();
            return i;
        } else {
            this._removeChildDom(node);
            return -1;
        }

    }

    _removeChildDom(node: INode) {
        this.traverseBF((n: INode) => {
            if (this.contentEL.contains(n.containEl)) {
                this.contentEL.removeChild(n.containEl);
            }
        }, node);
    }

    //layout
    layout() {
        if (!this.mmLayout) {
            this.mmLayout = new Layout(this.root, this.setting.layoutDirect||'mind map', this.colors);
            // Select and center on the mindmap's root when opening it
            this.root.select();
            this.centerOnNode(this.root);
            return;
        }

        this.mmLayout.layout(this.root, this.setting.layoutDirect || this.mmLayout.direct || 'mind map');

    }

    refresh() {
        this.layout();
    }

    emit(name: string, data?: any) {
        var evt = new CustomEvent(name, {
            detail: data || {}
        });
        this.appEl.dispatchEvent(evt);
    }

    on(name: string, fn: any) {
        this.appEl.addEventListener(name, fn);
    }

    off(name: string, fn: any) {
        if (name && fn) {
            this.appEl.removeEventListener(name, fn);
        }
    }

    center() {
        //console.log("Center mindmap")
        this._setMindScalePointer(this.root);
        var oldScale = this.mindScale;
        this.scale(100);

        var w = this.containerEL.clientWidth;
        var h = this.containerEL.clientHeight;
        this.containerEL.scrollTop = this.setting.canvasSize / 2 - h / 2 - 60;
        this.containerEL.scrollLeft = this.setting.canvasSize / 2 - w / 2 + 30;

        this.scale(oldScale);
    }


    centerOnNode(node: INode) {
        if(node == null)
        {//No node given as input argument
            this.center();
        } else {
            //console.log("Center mindmap on node "+node.getId())
            this._setMindScalePointer(node);
            var oldScale = this.mindScale;
            this.scale(100);

            var w = this.containerEL.clientWidth;
            var h = this.containerEL.clientHeight;
            let pos_x = node.getPosition().x;
            let pos_y = node.getPosition().y;
            let dim_x = node.getDimensions().x;
            let dim_y = node.getDimensions().y;
            //this.containerEL.scrollTop = this.setting.canvasSize / 2 - h / 2 - 60 ;
            //this.containerEL.scrollLeft = this.setting.canvasSize / 2 - w / 2 + 30 ;
            this.containerEL.scrollTop  = pos_y - (h/2 - dim_y/2) + 90;
            //this.containerEL.scrollLeft = pos_x - (w/2 - dim_x/2) + 40;
            this.containerEL.scrollLeft = pos_x - (w/2 - dim_x/2) + 200;

            this.scale(oldScale);
        }
    }


    _resetMaxDisplayedLevel() {
        this.dispLevel = 0;
        return;
    }


    _getMaxDisplayedLevel(node: INode)
    {// Returns the highest displayed level.
     // Use getMaxDisplayedLevel (without _).
        if( (node.getLevel() > tempDispLevel)   &&
            (node.isShow())                     )
        {// Displayed node with higher level
            tempDispLevel = node.getLevel();
        }

        if(!node.isLeaf())
        {// The node has children
            node.children.forEach((n) => {
                this._getMaxDisplayedLevel(n);
            });
        }

        return;
    }


    getMaxDisplayedLevel()
    {// Returns the highest displayed level.
        tempDispLevel = 0;
        this._getMaxDisplayedLevel(this.root);
        this.dispLevel = tempDispLevel;

        return this.dispLevel;
    }


    getMaxNodeDisplayedLevel(node: INode)
    {// Returns the highest displayed level.
        tempDispLevel = 0;
        this._getMaxDisplayedLevel(node);

        return tempDispLevel;
    }


    _setDisplayedLevel(node: INode, level:number)
    {// Display nodes whose level is <= number
        var currentLevel = 0;

        if( (node.getLevel()<level) )
        {// Current level is to be displayed
            node.expand();
            if(!node.isLeaf())
            {// The node has children
                node.children.forEach((n) => {
                    this._setDisplayedLevel(n, level);
                });
            }
        }
        else{
            node.collapse();
        }

        return;
    }


    setDisplayedLevel(level:number)
    {// Display nodes whose level is <= number
        var currentLevel = 0;

        if(level>0) {
            var minLevel = 0;

            this.root.expand();
            this.root.children.forEach((n) => {
                this._setDisplayedLevel(n, level);
            });
        }
        else
        {
            this.root.collapse();
        }

        return;
    }


    setChildrenDisplayedLevel(level:number)
    {// Display children nodes whose level is <= number
        var currentLevel = 0;
        let node = this.selectNode;

        if(level>0 && node) {
            var minLevel = 0;

            if(node.getLevel() == level)
            {// Max required displayed level is node level
                node.mindmap.execute('collapseNode', {
                    node
                });
            }
            else
            {// Expand to required level
                node.expand();
                node.children.forEach((n) => {
                    this._setDisplayedLevel(n, level);
                });
            }
        }
        else
        {
            this.root.collapse();
        }

        this.scale(this.mindScale);

        return;
    }

    _setMindScalePointer(node: INode) {
        this.scalePointer = [];
        // var root = this.root;
        if (node) {
            var rbox = node.getBox();
            this.scalePointer.push(rbox.x + rbox.width / 2, rbox.y + rbox.height / 2);
            if(!node.isSelect){
                this.clearSelectNode();
                node.select();
            }
        }
    }

    getMarkdown() {
        var md = '';
        var level = this.setting.headLevel;
        // Only emit fold-state ^id markers when persistence is set to 'markdown'.
        // 'plugin-data' and 'none' modes keep markdown clean.
        var emitFoldIds = (this.setting as any).foldStatePersistence !== 'plugin-data'
            && (this.setting as any).foldStatePersistence !== 'none';
        this.traverseDF((n: INode) => {
            var l = n.getLevel() + 1;
            var hPrefix = '', space = '';
            if (l > 1) {
                hPrefix = '\n';
            }
            const ending = (n.isExpand || !emitFoldIds) ? '' : ` ^${n.getId()}`
            if (n.getLevel() < level) {
                for (let i = 0; i < l; i++) {
                    hPrefix += '#';
                }
                md += (hPrefix + ' ');
                md += n.getData().text.trim() + ending + '\n';

            } else {
                for (var i = 0; i < n.getLevel() - level; i++) {
                    space += '\t';
                }
                var text = n.getData().text.trim();
                // Task checkbox prefix (bullet branch only; headings drop it).
                // For multi-line text, only the first emitted line carries
                // the prefix — matches how Obsidian renders task lists.
                var taskState = (n.getData() as any).taskState;
                var taskPrefix = '';
                if (taskState === 'todo') taskPrefix = '[ ] ';
                else if (taskState === 'done') taskPrefix = '[x] ';
                if (text) {
                    var textArr = text.split('\n');
                    var lineLength = textArr.length;
                    if (lineLength == 1) {
                        md += `${space}- ${taskPrefix}${text}${ending}\n`;
                    } else if (lineLength > 1) {
                        //code
                        if (text.startsWith('```')) {
                            md+='\n'
                            md += `${space}-\n`;
                            textArr.forEach((t: string, i: number) => {
                                md += `${space}  ${t.trim()}${i === textArr.length - 1 ? ending : '' }\n`
                            });
                            md+='\n'
                        } else {
                            // Each line becomes its own bullet at the same level
                            // (first line only carries the task prefix).
                            var firstEmitted = true;
                            textArr.forEach((t: string, i: number) => {
                                var contentText = t.trim();
                                if (contentText.length > 0) {
                                    var prefix = firstEmitted ? taskPrefix : '';
                                    firstEmitted = false;
                                    md += `${space}- ${prefix}${contentText}${i === textArr.length - 1 ? ending : '' }\n`;
                                }
                            });
                        }

                    }
                } else {
                    for (var i = 0; i < n.getLevel() - level; i++) {
                        space += '   ';
                    }
                    md += `${space}-\n`;
                }
            }
        }, this.root, true);
        return md.trim();
    }

    // Open the floating highlight palette near the given node. Lazily
    // instantiates the palette on first use; the same instance is reused
    // for subsequent calls.
    openHighlightPalette(node: INode) {
        if (!this.highlightPalette) {
            this.highlightPalette = new HighlightPalette(this);
        }
        this.highlightPalette.openForNode(node);
    }

    scale(num: number) {
        if (num < 20) {
            num = 20;
        }
        if (num > 300) {
            num = 300;
        }
        this.mindScale = num;
        // translate3d(0,0,0) forces GPU compositing on iOS — eliminates jank
        var scaleVal = this.mindScale / 100;
        if (this.scalePointer.length) {
            this.appEl.style.transformOrigin = `${this.scalePointer[0]}px ${this.scalePointer[1]}px`;
            this.appEl.style.transform = `scale(${scaleVal}) translate3d(0,0,0)`;
        } else {
            this.appEl.style.transform = `scale(${scaleVal}) translate3d(0,0,0)`;
        }

        // Keep menu and fold dots at constant visual size regardless of zoom
        // Target size: as if zoom is 120%
        var inverseScale = 120 / this.mindScale;
        this._menuDom.style.transform = `scale(${inverseScale})`;
        this._menuDom.style.transformOrigin = 'left center';

        // Keep fold dot tap area constant size regardless of zoom
        // The dot scales visually with zoom, but the ::after tap target
        // is scaled inversely to stay the same physical size
        var tapSize = Math.round(20 * (100 / this.mindScale));
        this.appEl.style.setProperty('--dot-tap-size', `${tapSize}px`);
        this.appEl.style.setProperty('--dot-tap-offset', `${Math.round(tapSize / 2)}px`);
    }

    // Anchor the next scale operation at the given container viewport coord.
    // Computes the canvas element coord currently under (midX, midY), then
    // updates scalePointer + CSS transform-origin + scroll so that point
    // stays at (midX, midY) after the upcoming scale change.
    //
    // CRITICAL: reads the ACTUAL CSS transform-origin (via getComputedStyle),
    // NOT scalePointer. They can desync because appMouseMove updates
    // scalePointer on every cursor move without touching CSS (and shouldn't —
    // changing CSS origin mid-cursor-move at non-1 scale would itself cause
    // visual jumps). Using stale scalePointer as ox produced massive jumps
    // at low zoom due to the (1-s)/s amplification factor.
    //
    // (midX, midY) are in containerEL viewport coords. Mirrors the v0.5.1
    // mobile pinch-zoom gesture-start math (see iOS Touch Saga §5).
    _anchorScaleAt(midX: number, midY: number) {
        var s = this.mindScale / 100;
        // Read the actual CSS transform-origin (source of truth for the
        // currently-rendered visual). getComputedStyle returns absolute px.
        var originStr = getComputedStyle(this.appEl).transformOrigin;
        var ox = 0, oy = 0;
        if (originStr) {
            var parts = originStr.split(/\s+/);
            if (parts.length >= 1) ox = parseFloat(parts[0]) || 0;
            if (parts.length >= 2) oy = parseFloat(parts[1]) || 0;
        }
        var focalEx = (midX + this.containerEL.scrollLeft - ox * (1 - s)) / s;
        var focalEy = (midY + this.containerEL.scrollTop  - oy * (1 - s)) / s;
        this.scalePointer = [focalEx, focalEy];
        // Sync CSS transform-origin to the new focal point in the same
        // sync block as the scroll change, so the browser never sees an
        // intermediate "old origin, new scroll" state.
        this.appEl.style.transformOrigin = `${focalEx}px ${focalEy}px`;
        this.containerEL.scrollLeft = focalEx - midX;
        this.containerEL.scrollTop  = focalEy - midY;
    }

    setScale(type: string) {
        if (type == "up") {
            var n = this.mindScale + 10;
        } else {
            var n = this.mindScale - 10;
        }
        // Anchor at viewport center so the keyboard zoom doesn't jump
        // when scalePointer is stale (e.g. after panning).
        this._anchorScaleAt(this.containerEL.clientWidth / 2, this.containerEL.clientHeight / 2);
        this.scale(n);
    }

    copyNode(node?:any){
        var n = node||this.selectNode;
        if(n){
           var data:any = [];
           function copyNode(n:INode, pid:any) {
                  var d = n.getData();
                  d.id = uuid();
                  d.pid = pid;
                  data.push({
                      id:d.id,
                      text:d.text,
                      pid:pid,
                      isExpand:d.isExpand,
                      note:d.note
                  });
                  n.children.forEach((c) => {
                     copyNode(c, d.id);
                  });
          }

           copyNode(n,null)

           var _data = {
               type:'copyNode',
               text:data
           };

           return JSON.stringify(_data);

        }else{
            return ''
        }
  }

  pasteNode(text:string){
        var node = this.selectNode;
        if(text){
            try{
                  var json =JSON.parse(text);
                  if(json.type&&json.type=='copyNode'){
                    var data = json.text;
                    if(!node.isExpand){
                       node.expand();
                       node.clearCacheData();
                    }
                   this.execute('pasteNode',{
                       node:node,
                       data:data
                   })

                   navigator.clipboard.writeText('');
                  }
            }catch(err){
                console.error('Mindsidian: clipboard write failed', err);
            }
        }

  }

}
