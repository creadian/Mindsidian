import {
  HoverParent,
  HoverPopover,
  Menu,
  TextFileView,
  WorkspaceLeaf,
  TFile,
  Notice,
  Platform
} from "obsidian";

import MindMapPlugin from './main'
import { FRONT_MATTER_REGEX } from './constants'
import MindMap from "./mindmap/mindmap";
import { INodeData } from './mindmap/INode'
import { Transformer } from './markmapLib/markmap-lib';
import randomColor from "randomcolor";
import { t } from './lang/helpers'

// import domtoimage from './domtoimage.js'
import domtoimage from './dom-to-image-more.js'

export function uuid(): string {
  function S4() {
    return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
  }
  return (S4() + S4() + '-' + S4() + '-' + S4());
}
const transformer = new Transformer();


export const mindmapViewType = "mindmapView";
export const mindmapIcon = "blocks";

export class MindMapView extends TextFileView implements HoverParent {
  plugin: MindMapPlugin;
  hoverPopover: HoverPopover | null;
  id: string = (this.leaf as any).id;
  mindmap: MindMap | null;
  colors: string[] = [];
  timeOut: any = null;
  fileCache: any;
  firstInit: boolean = true;
  yamlString:string=''

  getViewType() {
    return mindmapViewType;
  }
  getIcon() {
    return mindmapIcon;
  }

  getDisplayText() {
    return this.file?.basename || "mindmap";
  }

  setColors() {
    var colors:any[] = []
    try{
      if( this.plugin.settings.strokeArray){
         colors = this.plugin.settings.strokeArray;
      }
    }catch(err){
       console.error('Mindsidian: stroke array parse error', err);
    }

    this.colors = this.colors.concat(colors);

    // Curated color palette — distinct but flowing
    // Each color is clearly different from its neighbors,
    // cycling through the spectrum in a designed sequence
    var palette = [
      '#6366f1', // indigo (matches root)
      '#3b82f6', // blue
      '#06b6d4', // cyan
      '#14b8a6', // teal
      '#22c55e', // green
      '#84cc16', // lime
      '#eab308', // yellow
      '#f97316', // orange
      '#ef4444', // red
      '#ec4899', // pink
      '#d946ef', // fuchsia
      '#a855f7', // purple
      '#8b5cf6', // violet
      '#0ea5e9', // sky blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#f43f5e', // rose
      '#7c3aed', // deep violet
      '#2563eb', // royal blue
      '#059669', // sea green
    ];
    // Repeat the palette to cover up to 60+ branches
    for (var i = 0; i < 60; i++) {
      this.colors.push(palette[i % palette.length]);
    }
  }

  exportToSvg(){
    if(!this.mindmap){
      return;
    }

   // this.mindmap.contentEL.style.visibility='hidden';
    var nodes:any[] = [];
    this.mindmap.traverseDF((n:any)=>{
       if(n.isShow()){
         nodes.push(n)
       }
    });



    var oldScrollLeft = this.mindmap.containerEL.scrollLeft;
    var oldScrollTop = this.mindmap.containerEL.scrollTop;

    var box  = this.mindmap.getBoundingRect(nodes);
    var rootBox = this.mindmap.root.getPosition();

    var disX =0,disY=0;
    if(box.x>60){
      disX = box.x - 60;
    }

    if(box.y>60){
       disY = box.y - 60;
    }

    this.mindmap.root.setPosition(rootBox.x-disX,rootBox.y-disY);
    this.mindmap.refresh();

    var w = box.width + 120;
    var h = box.height + 120;

    this.mindmap.contentEL.style.width=w+'px';
    this.mindmap.contentEL.style.height=h+'px';

    setTimeout(()=>{
      domtoimage.toPng(this.mindmap.contentEL,{}).then(dataUrl=>{
        var img = new Image()
        img.src = dataUrl;
        var str = img.outerHTML;

         var p= this.mindmap.path.substr(0,this.mindmap.path.length-2);
        try{
          new Notice(p+'html');
          this.app.vault.adapter.write(p+'html', str);
          this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
        }catch(err){
          this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
          new Notice(err);
        }

      }).catch(err=>{
        this.restoreMindmap(rootBox,oldScrollLeft,oldScrollTop)
        new Notice(err);
      })
    },200);

  }

  exportToPng(i_scale: number) {
    if (!this.mindmap) {
      return;
    }

    const { rootBox, oldScrollLeft, oldScrollTop } = this.prepareForExport();

    setTimeout(() => {
      domtoimage.toPng(this.mindmap.contentEL, { scale: i_scale }).then(async (dataUrl: string) => {
        var img = new Image();
        img.src = dataUrl;

        const fileName = this.mindmap.path.replace(/\.md$/, '.png');
        const arrayBuffer = await this.dataURLtoBlob(dataUrl).arrayBuffer();
        this.app.vault.adapter.writeBinary(fileName, arrayBuffer)
          .then(() => {
            new Notice(`Mindmap exported as PNG: ${fileName}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          })
          .catch(err => {
            console.error('Failed to save PNG file:', err);
            new Notice(`Failed to export mindmap as PNG: ${err}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          });

      }).catch(err => {
        this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
        new Notice(`Failed to export mindmap as PNG: ${err}`);
      });
    }, 200);
  }

  exportToJpeg(i_scale: number) {
    if (!this.mindmap) {
      return;
    }

    const { rootBox, oldScrollLeft, oldScrollTop } = this.prepareForExport();

    setTimeout(() => {
      domtoimage.toJpeg(this.mindmap.contentEL, { quality: 1.0, scale: i_scale }).then(async (dataUrl: string) => {
        var img = new Image();
        img.src = dataUrl;

        const fileName = this.mindmap.path.replace(/\.md$/, '.jpeg');
        const arrayBuffer = await this.dataURLtoBlob(dataUrl).arrayBuffer();
        this.app.vault.adapter.writeBinary(fileName, arrayBuffer)
          .then(() => {
            new Notice(`Mindmap exported as JPEG: ${fileName}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          })
          .catch(err => {
            console.error('Failed to save JPEG file:', err);
            new Notice(`Failed to export mindmap as JPEG: ${err}`);
            this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
          });

      }).catch(err => {
        this.restoreMindmap(rootBox, oldScrollLeft, oldScrollTop);
        new Notice(`Failed to export mindmap as JPEG: ${err}`);
      });
    }, 200);
  }

  prepareForExport() {
    if (!this.mindmap) {
      return { rootBox: null, oldScrollLeft: 0, oldScrollTop: 0 };
    }

    var nodes: any[] = [];
    this.mindmap.traverseDF((n: any) => {
      if (n.isShow()) {
        nodes.push(n);
      }
    });

    var oldScrollLeft = this.mindmap.containerEL.scrollLeft;
    var oldScrollTop = this.mindmap.containerEL.scrollTop;

    var box = this.mindmap.getBoundingRect(nodes);
    var rootBox = this.mindmap.root.getPosition();

    var disX = 0, disY = 0;
    if (box.x > 60) {
      disX = box.x - 60;
    }

    if (box.y > 60) {
      disY = box.y - 60;
    }

    this.mindmap.root.setPosition(rootBox.x - disX, rootBox.y - disY);
    this.mindmap.refresh();

    var w = box.width + 120;
    var h = box.height + 120;

    this.mindmap.contentEL.style.width = w + 'px';
    this.mindmap.contentEL.style.height = h + 'px';

    return { rootBox, oldScrollLeft, oldScrollTop };
  }

  restoreMindmap(rootBox: any, left: number, top: number) {
    if (!this.mindmap) {
      return;
    }

    var size = this.plugin.settings.canvasSize;
    this.mindmap.contentEL.style.width = size + 'px';
    this.mindmap.contentEL.style.height = size + 'px';
    this.mindmap.containerEL.scrollTop = top;
    this.mindmap.containerEL.scrollLeft = left;
    this.mindmap.root.setPosition(rootBox.x, rootBox.y);
    this.mindmap.refresh();
  }

  dataURLtoBlob(dataUrl: string) {
    var arr = dataUrl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Build a structural text-path key like "Root > Section A > Item 3"
  // for each node. Used in plugin-data fold mode (IDs aren't stable when
  // ^id markers are absent from the markdown).
  private nodeTextPath(parts: string[]): string {
    return parts.join(' > ');
  }

  // Walk an INodeData tree and set expanded:false on any node whose
  // text-path matches one of `savedPaths`. Mutates mindData in place.
  applyCollapsedPaths(mindData: INodeData, savedPaths: string[]) {
    var pathSet = new Set(savedPaths);
    var visit = (node: any, parents: string[]) => {
      var path = this.nodeTextPath([...parents, (node.text || '').trim()]);
      if (pathSet.has(path)) {
        node.expanded = false;
      }
      if (node.children && node.children.length) {
        node.children.forEach((c: any) => visit(c, [...parents, (node.text || '').trim()]));
      }
    };
    visit(mindData, []);
  }

  // Walk the live mindmap and collect text-paths of every collapsed node.
  collectCollapsedPaths(): string[] {
    var out: string[] = [];
    if (!this.mindmap) return out;
    var visit = (node: any, parents: string[]) => {
      var path = this.nodeTextPath([...parents, (node.data?.text || '').trim()]);
      if (!node.isExpand && node.children && node.children.length) {
        out.push(path);
      }
      if (node.children) {
        node.children.forEach((c: any) => visit(c, [...parents, (node.data?.text || '').trim()]));
      }
    };
    visit(this.mindmap.root, []);
    return out;
  }

  mindMapChange() {
    if (this.mindmap) {
      var md = this.mindmap.getMarkdown();

      // Plugin-data fold mode: persist collapsed paths to plugin data
      // (debounced via the existing requestSave path; we save immediately
      // here since plugin data writes are cheap).
      if (this.plugin.settings.foldStatePersistence === 'plugin-data' && this.file) {
        var paths = this.collectCollapsedPaths();
        this.plugin.setCollapsedPathsForFile(this.file.path, paths);
      }

    //  var matchArray: string[] = []
      // var collapsedIds: string[] = []
      // const idRegexMultiline = /.+ \^([a-z0-9\-]+)$/gim
      // while ((matchArray = idRegexMultiline.exec(md)) != null) {
      //   collapsedIds = [...collapsedIds, ...matchArray.slice(1, 2)];
      // }
      // this.fileCache.frontmatter.collapsedIds='';
      // if (collapsedIds.length > 0) {
      //   this.fileCache.frontmatter.collapsedIds = collapsedIds;
      // }
      //var frontMatter = this.getFrontMatter();
      this.data = this.yamlString + md;
      // console.log(this.mindmap.path);
     // this.app.vault.adapter.write(this.mindmap.path, this.data);
       try{
        this.requestSave();
       }catch(err){
        console.error('Mindsidian: save failed', err);
        new Notice(`${t("Save fail")}`)
      }
    }
  }

  getFrontMatter() {
    var frontMatter = '---\n\n';
    // Defensive: fileCache can be null when metadata isn't ready yet
    // (e.g. cold-start before the cache is built). frontmatterPosition
    // can also be missing for files without frontmatter.
    if (this.fileCache && this.fileCache.frontmatter && this.fileCache.frontmatterPosition?.end) {
      var end = this.fileCache.frontmatterPosition.end.offset;
      frontMatter = this.data.substr(0, end);
    }
    frontMatter += '\n\n';
    return frontMatter;
  }

  constructor(leaf: WorkspaceLeaf, plugin: MindMapPlugin) {
    super(leaf);
    this.plugin = plugin;
    this.setColors();

    this.fileCache = {
      'frontmatter': {
        'mindmap-plugin': 'basic'
      }
    }

  }


  // Read the saved zoom for this file from frontmatter, falling back to
  // the plugin's defaultZoom setting. Clamped to the same 20-300 range
  // used elsewhere in the plugin.
  private getInitialZoom(): number {
    var raw: any = null;
    if (this.file) {
      var fm = this.app.metadataCache.getFileCache(this.file)?.frontmatter;
      raw = fm?.['mindmap-zoom'];
    }
    var zoom: number;
    if (typeof raw === 'number' && !isNaN(raw)) {
      zoom = raw;
    } else {
      var def = this.plugin.settings.defaultZoom;
      zoom = (typeof def === 'number' && !isNaN(def)) ? def : 100;
    }
    return Math.max(20, Math.min(300, Math.round(zoom)));
  }

  // Write the current zoom to the file's frontmatter. Fire-and-forget;
  // called on view close/unload before mindScale is reset. Safe to call
  // synchronously — failures are logged but don't throw.
  private saveZoomToFrontmatter(zoom: number): void {
    if (!this.file) return;
    if (typeof zoom !== 'number' || isNaN(zoom)) return;
    var clamped = Math.max(20, Math.min(300, Math.round(zoom)));
    this.app.fileManager.processFrontMatter(this.file, (fm: any) => {
      fm['mindmap-zoom'] = clamped;
    }).catch((err: any) => {
      console.error('Mindsidian: failed to save mindmap-zoom to frontmatter', err);
    });
  }

  // --- Mobile bottom action bar ---------------------------------------------
  // Holds "+ sibling" (↩), "+ child" (→), and recenter (⌖) buttons. Built once
  // per view (Platform.isMobile only). Stays above the keyboard via
  // visualViewport tracking. Sibling button is hidden when the root is
  // selected; sibling+child are hidden when no node is selected.

  private _mobileActionBar: HTMLElement | null = null;
  private _mobileSiblingBtn: HTMLButtonElement | null = null;
  private _mobileChildBtn: HTMLButtonElement | null = null;
  private _mobileRecenterBtn: HTMLButtonElement | null = null;
  private _mobileVVListener: (() => void) | null = null;
  private _mobileSelectionPoller: any = null;
  // Resting distance from screen bottom in px (safe area + extra clearance).
  // Measured once on init via a probe element so we can do positioning math
  // in JS without re-reading env() at every keyboard event.
  private _mobileBarBaseBottom: number = 24;

  private initMobileActionBar() {
    var bar = document.createElement('div');
    bar.classList.add('mm-mobile-action-bar');

    // Sibling button (↩ = adds at same level)
    var siblingBtn = document.createElement('button');
    siblingBtn.classList.add('mm-mobile-action-btn', 'mm-mobile-action-sibling');
    siblingBtn.innerHTML = '↩';
    siblingBtn.setAttribute('aria-label', 'New sibling');

    // Child button (→ = adds one level deeper)
    var childBtn = document.createElement('button');
    childBtn.classList.add('mm-mobile-action-btn', 'mm-mobile-action-child');
    childBtn.innerHTML = '→';
    childBtn.setAttribute('aria-label', 'New child');

    // Recenter button (small, always visible)
    var recenterBtn = document.createElement('button');
    recenterBtn.classList.add('mm-mobile-action-btn', 'mm-mobile-action-recenter');
    recenterBtn.innerHTML = '⌖';
    recenterBtn.setAttribute('aria-label', 'Center mindmap');

    bar.appendChild(siblingBtn);
    bar.appendChild(childBtn);
    bar.appendChild(recenterBtn);

    // Prevent focus transfer from the editing contentEditable on desktop
    // mousedown. NOT on touchstart — iOS uses touchstart→touchend to
    // synthesize click, and preventDefault on touchstart cancels the click
    // entirely (which is exactly why the buttons stopped firing in v0.5.12).
    // On iOS the cost is a brief keyboard flicker on chained add during edit
    // — acceptable for now; if it becomes a problem we'll switch to manual
    // touchend handling.
    var keepFocus = (e: Event) => { e.preventDefault(); };
    siblingBtn.addEventListener('mousedown', keepFocus);
    childBtn.addEventListener('mousedown', keepFocus);

    siblingBtn.addEventListener('click', () => this.handleMobileAddNode('sibling'));
    childBtn.addEventListener('click', () => this.handleMobileAddNode('child'));
    recenterBtn.addEventListener('click', () => {
      if (this.mindmap) this.mindmap.center();
    });

    this.contentEl.appendChild(bar);

    this._mobileActionBar = bar;
    this._mobileSiblingBtn = siblingBtn;
    this._mobileChildBtn = childBtn;
    this._mobileRecenterBtn = recenterBtn;

    // Measure safe-area-inset-bottom once (via a hidden probe) and add a
    // ~24px clearance on top. This is the bar's resting bottom edge.
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;bottom:0;left:0;width:0;height:0;padding-bottom:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none;';
    document.body.appendChild(probe);
    var safeArea = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
    this._mobileBarBaseBottom = safeArea + 24;
    bar.style.bottom = `${this._mobileBarBaseBottom}px`;

    // Keyboard adaptation via visualViewport: set bar's bottom to
    // max(baseBottom, keyboardOffset) so it sits just above the keyboard
    // when shown and at its resting position when not.
    this.attachVisualViewportListener();

    // Selection-state poller: cheap (every 250ms, single class write when
    // state changes). Catches every code path that mutates selectNode
    // without us needing to hook each one.
    var lastSig = '';
    this._mobileSelectionPoller = setInterval(() => {
      if (!this.mindmap || !this._mobileActionBar) return;
      var sel = this.mindmap.selectNode;
      var sig = sel ? (sel.getId() + ':' + (sel.data.isRoot ? '1' : '0')) : '';
      if (sig !== lastSig) {
        lastSig = sig;
        this.updateMobileActionBarVisibility();
      }
    }, 250);
  }

  private attachVisualViewportListener() {
    var vv: any = (window as any).visualViewport;
    if (!vv || !this._mobileActionBar) return;
    var bar = this._mobileActionBar;
    var update = () => {
      var keyboardOffset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // No CSS transition on bottom — visualViewport.resize fires at ~60fps
      // during the keyboard animation, so direct bottom updates track it
      // smoothly. A transition would cumulatively lag behind each event.
      bar.style.bottom = `${Math.max(this._mobileBarBaseBottom, keyboardOffset)}px`;
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    this._mobileVVListener = () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }

  applyMobileActionBarStyle() {
    if (!this._mobileActionBar) return;
    var size = Math.max(24, Math.min(100, this.plugin.settings.mobileActionBarSize ?? 56));
    var opacityPct = Math.max(10, Math.min(100, this.plugin.settings.mobileActionBarOpacity ?? 65));
    this._mobileActionBar.style.setProperty('--mm-action-btn-size', `${size}px`);
    this._mobileActionBar.style.setProperty('--mm-action-btn-opacity', `${opacityPct / 100}`);
  }

  private updateMobileActionBarVisibility() {
    if (!this._mobileActionBar) return;
    var sel = this.mindmap?.selectNode;
    // Sibling: visible only when a non-root node is selected.
    if (this._mobileSiblingBtn) {
      this._mobileSiblingBtn.style.display = (sel && !sel.data.isRoot) ? '' : 'none';
    }
    // Child: visible whenever any node is selected.
    if (this._mobileChildBtn) {
      this._mobileChildBtn.style.display = sel ? '' : 'none';
    }
    // Recenter is always visible (no display toggle needed).
  }

  private handleMobileAddNode(kind: 'sibling' | 'child') {
    if (!this.mindmap) return;
    var sel = this.mindmap.selectNode;
    if (!sel) return;

    // If currently editing, commit the text first so it doesn't get lost.
    if (this.mindmap.editNode) {
      this.mindmap.editNode.cancelEdit();
      this.mindmap.editNode = null;
    }

    var parent;
    if (kind === 'child') {
      parent = sel;
      // Expand a folded parent before adding (same fix as v0.5.11).
      if (!sel.isExpand) {
        sel.expand();
      }
    } else {
      parent = sel.parent;
      if (!parent) return; // root has no parent → no sibling possible
    }

    var newNode = this.mindmap.execute(
      kind === 'child' ? 'addChildNode' : 'addSiblingNode',
      { parent }
    );

    this.mindmap.refresh();

    if (newNode) {
      newNode.select();
      // Enter edit mode synchronously in the same user-gesture so iOS
      // accepts the focus transfer and the keyboard stays up.
      newNode.edit();
    }
  }

  private teardownMobileActionBar() {
    if (this._mobileSelectionPoller) {
      clearInterval(this._mobileSelectionPoller);
      this._mobileSelectionPoller = null;
    }
    if (this._mobileVVListener) {
      this._mobileVVListener();
      this._mobileVVListener = null;
    }
    if (this._mobileActionBar && this._mobileActionBar.parentNode) {
      this._mobileActionBar.parentNode.removeChild(this._mobileActionBar);
    }
    this._mobileActionBar = null;
    this._mobileSiblingBtn = null;
    this._mobileChildBtn = null;
    this._mobileRecenterBtn = null;
  }

  async onClose() {
    // Persist current zoom to frontmatter BEFORE resetting it.
    if (this.mindmap) {
      this.saveZoomToFrontmatter(this.mindmap.mindScale);
    }
    this.teardownMobileActionBar();
    // Reset zoom/touch state before clearing — guards against state leaking
    // into the next instance if the same file is reopened (Cmd+W bug).
    if (this.mindmap) {
      this.mindmap.mindScale = 100;
      this.mindmap.scalePointer = [];
      this.mindmap._isTouchZooming = false;
      this.mindmap.clear();
      this.contentEl.empty();
      this.mindmap = null;
    }
  }

  clear() {

  }

  getViewData() {
    return this.data;
  }

  setViewData(data: string) {

    if (this.mindmap) {
      this.mindmap.mindScale = 100;
      this.mindmap.scalePointer = [];
      this.mindmap._isTouchZooming = false;
      this.mindmap.clear();
      this.contentEl.empty();
    }

    this.data = data;

    var mdText = this.getMdText(this.data);
    var mindData = this.mdToData(mdText);
    mindData.isRoot = true;

    // If fold-state is persisted in plugin-data, apply saved collapsed
    // paths to the parsed tree before the mindmap initializes.
    if (this.plugin.settings.foldStatePersistence === 'plugin-data' && this.file) {
      var savedPaths = this.plugin.getCollapsedPathsForFile(this.file.path);
      if (savedPaths.length > 0) {
        this.applyCollapsedPaths(mindData, savedPaths);
      }
    }

    // const frontmatterContentRegExResult = /^---$(.+?)^---$.+?/mis.exec(data)

    // if (frontmatterContentRegExResult != null && frontmatterContentRegExResult[1]) {
    //   frontmatterContentRegExResult[1].split('\n').forEach((frontmatterLine) => {
    //     const keyValue = frontmatterLine.split(': ')
    //     if (keyValue.length === 2) {
    //       const value = /^[{\[].+[}\]]$/.test(keyValue[1]) ? JSON.parse(keyValue[1]) : keyValue[1]
    //       this.fileCache.frontmatter[keyValue[0]] = value
    //     }
    //   });
    // }

    this.mindmap = new MindMap(mindData, this.contentEl, this.plugin.settings);
    this.mindmap.colors = this.colors;

    // Add floating recenter button (desktop only — on mobile it lives
    // inside the bottom action bar created below).
    if (!this.contentEl.querySelector('.mm-recenter-btn')) {
      var recenterBtn = document.createElement('button');
      recenterBtn.classList.add('mm-recenter-btn');
      recenterBtn.innerHTML = '⌖';
      recenterBtn.setAttribute('aria-label', 'Center mindmap');
      recenterBtn.addEventListener('click', () => {
        if (this.mindmap) {
          this.mindmap.center();
        }
      });
      this.contentEl.appendChild(recenterBtn);
    }

    // Mobile-only bottom action bar with "+ sibling" (↩), "+ child" (→),
    // and recenter (⌖). Visibility is managed in initMobileActionBar().
    if (Platform.isMobile && !this.contentEl.querySelector('.mm-mobile-action-bar')) {
      this.initMobileActionBar();
    }
    this.applyMobileActionBarStyle();
    if (this.firstInit) {

      setTimeout(() => {
        var leaf = this.leaf;
        if (leaf) {
          var view = leaf.view as MindMapView;

          this.mindmap.path = view?.file.path;
          if (view.file) {
            // Preserve the default fileCache if the metadata cache isn't ready yet
            var cache = this.app.metadataCache.getFileCache(view.file);
            if (cache) this.fileCache = cache;
            this.yamlString = this.getFrontMatter();
          }
        }
        this.mindmap.init();
        this.mindmap.refresh();
        this.mindmap.view = this;
        // Apply the saved or default zoom AFTER init/refresh have laid out
        // the canvas. There may be a brief frame at 100% before the scale
        // applies — acceptable for v0.5.7.
        this.mindmap.scale(this.getInitialZoom());
        this.firstInit = false;
      }, 100);
    } else {
      var view = this.leaf.view as MindMapView;
      var cache = this.app.metadataCache.getFileCache(view.file);
      if (cache) this.fileCache = cache;
      this.yamlString = this.getFrontMatter();

      this.mindmap.path = view?.file.path;
      this.mindmap.init();
      this.mindmap.refresh();
      this.mindmap.view = this;
      this.mindmap.scale(this.getInitialZoom());
    }
  }

  onunload() {
    this.app.workspace.offref("quick-preview");
    this.app.workspace.offref("resize");

    // Persist current zoom to frontmatter BEFORE resetting it. If onClose
    // already ran, this.mindmap is null and this is a no-op.
    if (this.mindmap) {
      this.saveZoomToFrontmatter(this.mindmap.mindScale);
    }
    this.teardownMobileActionBar();

    if (this.mindmap) {
      this.mindmap.mindScale = 100;
      this.mindmap.scalePointer = [];
      this.mindmap._isTouchZooming = false;
      this.mindmap.clear();
      this.contentEl.empty();
      this.mindmap = null;
    }

    this.plugin.setMarkdownView(this.leaf);
  }

  onload() {
    super.onload();
    this.registerEvent(
      this.app.workspace.on("quick-preview", () => this.onQuickPreview, this)
    );
//    this.registerEvent(
//      this.app.workspace.on('resize', () => this.updateMindMap(), this)
//    );
  }

  onQuickPreview(file: TFile, data: string) {
    if (file === this.file && data !== this.data) {
      this.setViewData(data);
      var cache = this.app.metadataCache.getFileCache(file);
      if (cache) this.fileCache = cache;
    }
  }

  updateMindMap() {
    if (this.mindmap) {
      if(Platform.isDesktopApp){
        this.mindmap.center();
      }
    }
  }

  async onFileMetadataChange(file: TFile) {
    // Bail early if this metadata change isn't for the file this view is showing.
    // Otherwise every metadata change in the vault triggers N disk reads
    // (one per open mindmap view).
    if (!this.file || file.path !== this.file.path) return;
    let md = await this.app.vault.adapter.read(file.path);
    this.onQuickPreview(file, md);
  }

  getMdText(str: string) {
    var md = str.trim().replace(FRONT_MATTER_REGEX, '');
    return md.trim();
  }

  // Normalize markdown so the markmap parser never silently drops content.
  // Principle: assimilate everything into the mindmap structure. No data loss.
  //
  // Handles: bare text, #tags, orphaned indentation, spaces-as-tabs,
  //          horizontal rules, and any other non-standard formatting.
  normalizeBullets(str: string): string {
    var lines = str.split('\n');
    var result: string[] = [];
    var inFence = false;
    // Track the current valid indentation depth (in tab-equivalents)
    // -1 means we're right after a heading (no bullets yet)
    var maxIndent = -1;

    // Auto-detect space indent size by finding the smallest non-zero
    // space indentation used in the file (commonly 2 or 4)
    var spaceIndent = 2; // default
    for (var s = 0; s < lines.length; s++) {
      var spaceMatch = lines[s].match(/^( +)[-*+]\s/);
      if (spaceMatch) {
        var len = spaceMatch[1].length;
        if (len > 0) {
          spaceIndent = len;
          break;
        }
      }
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      // Track code fence state — pass through untouched
      if (trimmed.startsWith('```')) {
        inFence = !inFence;
        result.push(line);
        continue;
      }
      if (inFence) {
        result.push(line);
        continue;
      }

      // Empty lines — pass through
      if (trimmed === '') {
        result.push(line);
        continue;
      }

      // Real headings: must have "# " (hash + space). Reset indent context.
      // This distinguishes "## Heading" from "#tag" or "###no-space"
      if (/^#{1,6}\s/.test(trimmed)) {
        maxIndent = -1;
        result.push(line);
        continue;
      }

      // Blockquotes — pass through
      if (trimmed.startsWith('>')) {
        result.push(line);
        continue;
      }

      // Count indentation: convert spaces to tab-equivalents
      var rawIndent = line.match(/^(\s*)/)[1];
      var indent = 0;
      for (var c = 0; c < rawIndent.length; c++) {
        if (rawIndent[c] === '\t') {
          indent++;
        } else {
          // Count spaces using auto-detected indent size
          var spaceRun = 0;
          while (c < rawIndent.length && rawIndent[c] === ' ') {
            spaceRun++;
            c++;
          }
          c--; // compensate for loop increment
          indent += Math.floor(spaceRun / spaceIndent);
        }
      }

      // Handle bullet lines (-, *, +, or numbered)
      var isBullet = /^\s*[-*+]\s/.test(line) || /^\s*\d+\.\s/.test(line);

      // Horizontal rules (---, ***, ___) — convert to a bullet with the text
      if (/^[-*_]{3,}\s*$/.test(trimmed)) {
        isBullet = false; // treat as bare text, will become "- ---"
      }

      if (isBullet) {
        // Strip chained "- " prefixes (e.g. "- - X" → "- X", "- - - X" → "- X").
        // CommonMark would parse "- - X" as an empty outer bullet containing
        // a nested "X" — that creates an empty intermediate node in the mindmap
        // and pollutes the file with "Sub title" on save. Collapsing to one
        // bullet at this line's original indent gives a single clean node.
        while (/^- - /.test(trimmed)) {
          trimmed = trimmed.replace(/^- /, '');
        }

        // Fix orphaned indentation
        if (maxIndent === -1) {
          // First bullet after a heading — force to indent 0
          result.push(trimmed);
          maxIndent = 0;
        } else if (indent > maxIndent + 1) {
          // Orphaned: indented too deep — clamp to maxIndent + 1
          var fixedIndent = '\t'.repeat(maxIndent + 1);
          result.push(fixedIndent + trimmed);
          maxIndent = maxIndent + 1;
        } else {
          // Valid indentation — normalize to tabs
          var tabIndent = '\t'.repeat(indent);
          result.push(tabIndent + trimmed);
          maxIndent = indent;
        }
        continue;
      }

      // Everything else (bare text, #tags, horizontal rules, etc.)
      // → convert to a bullet, respecting its indentation
      if (maxIndent === -1) {
        result.push('- ' + trimmed);
        maxIndent = 0;
      } else if (indent > maxIndent + 1) {
        var fixedIndent = '\t'.repeat(maxIndent + 1);
        result.push(fixedIndent + '- ' + trimmed);
        maxIndent = maxIndent + 1;
      } else {
        var tabIndent = '\t'.repeat(indent);
        result.push(tabIndent + '- ' + trimmed);
        maxIndent = indent;
      }
    }

    return result.join('\n');
  }

  mdToData(str: string) {
    function transformData(mapData: any) {
      var flag = true;
      if (mapData.t == 'blockquote') {
        mapData = mapData.c[0];
        flag = false;
        mapData.v = '> ' + mapData.v;
      }
      const regexResult = /^.+ \^([a-z0-9\-]+)$/gim.exec(mapData.v);
      const id = regexResult != null ? regexResult[1] : null

     // console.log(id);

      var map: INodeData = {
        id: id || uuid(),
        text: id ? mapData.v.replace(` ^${id}`, '') : mapData.v,
        children: [],
        expanded: id ? false:true
      };

      if (flag && mapData.c && mapData.c.length) {
        mapData.c.forEach((data: any) => {
          map.children.push(transformData(data));
        });
      }

      return map;
    }

    if (str) {
      str = this.normalizeBullets(str);
      const { root } = transformer.transform(str);
      const data = transformData(root);
      return data;

    } else {
      return {
        id: uuid(),
        text: this.app.workspace.getActiveFile()?.basename || `${t('Untitled mindmap')}`
      }
    }
  }


  onMoreOptionsMenu(menu: Menu) {
    // Add a menu item to force the board to markdown view
    menu
      .addItem((item) => {
        item
          .setTitle(`${t("Open as markdown")}`)
          .setIcon("document")
          .onClick(() => {
            this.plugin.mindmapFileModes[this.id || this.file.path] = "markdown";
            this.plugin.setMarkdownView(this.leaf);
          });
      });

    // .addItem((item)=>{
    //    item
    //    .setTitle(`${t("Export to opml")}`)
    //    .setIcon('image-file')
    //    .onClick(()=>{
    //       const targetFolder = this.plugin.app.fileManager.getNewFileParent(
    //        this.plugin.app.workspace.getActiveFile()?.path || ""
    //       );
    //       if(targetFolder){
    //         console.log(targetFolder,this.plugin.app.fileManager);

    //       }
    //    })

    // })

    super.onPaneMenu(menu,'more-options');
  }

}
