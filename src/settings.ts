export type FoldStatePersistence = 'markdown' | 'plugin-data' | 'none';

export class MindMapSettings {
    theme:string = 'dark';
    canvasSize:number = 8000;
    background:string = 'transparent';
    fontSize:number = 16;
    headLevel:number = 2;
    layout:string="mindmap";
    layoutDirect:string = 'mindmap'
    color?:string;
    exportMdModel?:string;
    //strokeArray?:string=''
    strokeArray?:any[];
    focusOnMove:boolean;
    // How fold/collapse state of nodes is persisted across reloads.
    // 'markdown' (default for back-compat): adds ^id markers to collapsed
    //   headings in the file. Portable but pollutes content.
    // 'plugin-data': stored in plugin data keyed by file path. Clean.
    // 'none': fold state is not persisted; everything starts expanded.
    foldStatePersistence: FoldStatePersistence = 'markdown';
    // Map of file path → array of collapsed node IDs (used when
    // foldStatePersistence is 'plugin-data'). Persisted via saveData().
    foldStateByFile?: { [filePath: string]: string[] };
    // Default zoom (%) used when a mindmap file has no `mindmap-zoom`
    // value in its frontmatter. Per-file zoom is saved on view close.
    defaultZoom: number = 100;
    // Mobile-only action bar (sibling / child / trash / recenter at bottom).
    // Size = button diameter in px (24-100). Opacity = idle opacity (10-100 %).
    // Offset settings (px) tune the bar's vertical position relative to its
    // resting anchor: noKeyboard is added to safe-area-inset-bottom, and
    // withKeyboard is added to the keyboard-top offset (negative values
    // allowed if the user wants the bar to overlap the predictive bar).
    mobileActionBarSize: number = 56;
    mobileActionBarOpacity: number = 65;
    mobileBarOffsetNoKeyboard: number = 24;
    // Range 0-200 only. Negative values would place the bar behind the iOS
    // keyboard which the WebView clips to invisible, so we don't allow them.
    // 0 = bar at keyboard top (lowest visible); 200 = 200px above keyboard.
    mobileBarOffsetWithKeyboard: number = 100;
    // Max width (px) of a node before its text wraps to a new line. Separate
    // values for desktop and mobile since screen real estate differs a lot.
    // Applied via CSS var --mm-node-max-width on each view's contentEl.
    nodeMaxWidthDesktop: number = 800;
    nodeMaxWidthMobile: number = 300;
}