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
}