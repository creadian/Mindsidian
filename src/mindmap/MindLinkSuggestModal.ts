import { App, FuzzySuggestModal, TFile } from 'obsidian';

// Fuzzy file picker for "Insert internal link" command. Lists all markdown
// files in the vault. The chosen file is passed to onPick, which inserts a
// [[basename]] wikilink into the active mindmap node.
export class MindLinkSuggestModal extends FuzzySuggestModal<TFile> {
    private onPick: (file: TFile) => void;

    constructor(app: App, onPick: (file: TFile) => void) {
        super(app);
        this.onPick = onPick;
        this.setPlaceholder('Type to search notes…');
    }

    getItems(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    getItemText(file: TFile): string {
        // Concatenating basename + path makes fuzzy matching hit both,
        // mirroring Obsidian's own link picker.
        return `${file.basename} ${file.path}`;
    }

    onChooseItem(file: TFile, _evt: MouseEvent | KeyboardEvent): void {
        this.onPick(file);
    }
}
