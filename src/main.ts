import {
  Plugin,
  WorkspaceLeaf,
  TFile,
  TFolder,
  ViewState,
  MarkdownView,
  Notice
} from 'obsidian';
// import DEFAULT_SETTINGS from './setting'
import { around } from 'monkey-around'
import { MindMapSettings } from './settings';
import { MindMapSettingsTab } from './settingTab'

import { MindMapView, mindmapViewType } from "./MindMapView";
import { frontMatterKey, basicFrontmatter } from './constants';
import { t } from './lang/helpers'


export default class MindMapPlugin extends Plugin {
  settings: MindMapSettings;
  mindmapFileModes: { [file: string]: string } = {};
  _loaded: boolean = false;
  timeOut: any = null;

  async onload() {

    await this.loadSettings();

    this.addCommand({
      id: 'Create New MindMap',
      name: `${t('Create new mindmap')}`,
      checkCallback: (checking: boolean) => {
        // Per Obsidian guidelines, prefer getActiveFile()/getActiveViewOfType()
        // over the deprecated workspace.activeLeaf direct access.
        var activeFile = this.app.workspace.getActiveFile();
        if (!activeFile && !this.app.workspace.getLeaf(false)) {
          return false;
        }
        if (!checking) {
          const targetFolder = this.app.fileManager.getNewFileParent(
            activeFile?.path || ""
          );
          if (targetFolder) {
            this.newMindMap(targetFolder);
          }
        }
        return true;
      }
    });

     this.addCommand({
      id: 'Toggle to markdown or mindmap',
      name: `${t('Toggle markdown/mindmap')}`,
      mobileOnly: false,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if(mindmapView!=null){
          this.mindmapFileModes[(mindmapView.leaf as any).id || mindmapView.file.path] = 'markdown';
          this.setMarkdownView(mindmapView.leaf);
        }else if(markdownView!=null){
          this.mindmapFileModes[(markdownView.leaf as any).id || markdownView.file.path] = mindmapViewType;
          this.setMarkdownView(markdownView.leaf);
        }
      }
    });

     this.addCommand({
      id: 'Set to mindmap view',
      name: `${t('Set to mindmap mode')}`,
      mobileOnly: false,
      callback: () => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if(markdownView!=null)
        {
          this.mindmapFileModes[(markdownView.leaf as any).id || markdownView.file.path] = mindmapViewType;
          this.setMarkdownView(markdownView.leaf);
        }
      }
    });

     this.addCommand({
      id: 'Set to markdown view',
      name: `${t('Set to markdown mode')}`,
      mobileOnly: false,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView!=null){
          this.mindmapFileModes[(mindmapView.leaf as any).id || mindmapView.file.path] = 'markdown';
          this.setMarkdownView(mindmapView.leaf);
        }
      }
    });

    // Alt + Shift + C
    this.addCommand({
      id: 'Copy Node',
      name: `${t('Copy node')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'C',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        navigator.clipboard.writeText('');
        var node = mindmap.selectNode;
        if(node){
          var text = mindmap.copyNode(node);
          navigator.clipboard.writeText(text);
        }
        return true;
      }
    });

    // Alt + Shift + X
    this.addCommand({
      id: 'Cut Node',
      name: `${t('Cut node')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'X',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        navigator.clipboard.writeText('');
        var node = mindmap.selectNode;
        if(node){
          var text = mindmap.copyNode(node);
          navigator.clipboard.writeText(text);
          if (!node.data.isRoot && !node.data.isEdit) {
            node.mindmap.execute("deleteNodeAndChild", { node });
            mindmap._menuDom.style.display='none';
          }
        }
        return true;
      }
    });

    // Alt + Shift + V
    this.addCommand({
      id: 'Paste Node',
      name: `${t('Paste node')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'V',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        navigator.clipboard.readText().then(text=>{
            mindmap.pasteNode(text);
            // Copy once more so that the node can be copied once more
            navigator.clipboard.writeText(text);
        });
        return true;
      }
    });





    // Undo (Cmd+Z or Alt+Shift+Z)
    this.addCommand({
      id: 'Undo',
      name: `${t('Undo')}`,
      hotkeys: [
        {
          modifiers: ['Mod'],
          key: 'Z',
        },
        {
          modifiers: ['Alt', 'Shift'],
          key: 'Z',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.undo();
        return true;
      }
    });

    // Redo (Cmd+Shift+Z or Cmd+Y or Alt+Shift+Y)
    this.addCommand({
      id: 'Redo',
      name: `${t('Redo')}`,
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'Z',
        },
        {
          modifiers: ['Mod'],
          key: 'Y',
        },
        {
          modifiers: ['Alt', 'Shift'],
          key: 'Y',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.redo();
        return true;
      }
    });

    // Alt + Ctrl + Shift + Z
    this.addCommand({
      id: 'Replace by the previous text',
      name: `${t('Replace by the previous text')}`,
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (!mindmapView) return false;
        if (checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if (node) {
          var text = (node.data.oldText);
          node.setText(text);
        }
        return true;
      }
    });

    // Shift + F2
    this.addCommand({
      id: 'Edit node',
      name: `${t('Edit node')}`,
      hotkeys: [
        {
          modifiers: ['Shift'],
          key: 'F2',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if (node && !node.data.isEdit) {
          node.edit();
          mindmap._menuDom.style.display = 'none';
        }
        return true;
      }
    });

    // Enter and Tab are handled in the mindmap's internal keydown handler
    // (mindmap.ts) to avoid intercepting these keys in markdown mode.
    // Alt+Shift+Enter and Shift+Insert kept as command palette fallbacks.
    this.addCommand({
      id: 'Add sibling/end editing',
      name: `${t('Add sibling/end editing')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'Enter',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node) {
          if (!node.data.isEdit) {
            if (!node.parent) return true;
            var newNode = node.mindmap.execute('addSiblingNode', {
              parent: node.parent
            });
            mindmap._menuDom.style.display='none';
            mindmap.moveNode(newNode, node, 'down', false);
          } else {
            mindmap.clearSelectNode();
            node.select();
            node.mindmap.editNode=null;
          }
        }
        return true;
      }
    });

    this.addCommand({
      id: 'Insert child',
      name: `${t('Insert child')}`,
      hotkeys: [
        {
          modifiers: ['Shift'],
          key: 'Insert',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node) {
          if (!node.data.isEdit) {
            if (!node.isExpand) {
              node.expand();
            }
            node.mindmap.execute("addChildNode", { parent: node });
            mindmap._menuDom.style.display='none';
          } else {
            mindmap.clearSelectNode();
            node.select();
            node.mindmap.editNode=null;
          }
        }
        return true;
      }
    });

    // Shift + Delete (command palette fallback for delete)
    this.addCommand({
      id: 'Delete node & child',
      name: `${t('Delete node & child')}`,
      hotkeys: [
        {
          modifiers: ['Shift'],
          key: 'Delete',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if (node && !node.data.isRoot && !node.data.isEdit) {
          node.mindmap.execute("deleteNodeAndChild", { node });
          mindmap._menuDom.style.display='none';
        }
        return true;
      }
    });

    // Alt + Shift + S
    this.addCommand({
      id: 'Select the node\'s text',
      name: `${t('Select the node\'s text')}`,
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (!mindmapView) return false;
        if (checking) return true;
        var mindmap = mindmapView.mindmap;
        let node = mindmap.selectNode;
        if (node) {
          node.edit();
          node.selectText();
        }
        return true;
      }
    });

    // Alt + Shift + B
    this.addCommand({
      id: 'Bold the node\'s text',
      name: `${t('Bold the node\'s text')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'B',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        if(mindmap.selectNode) {
          var l_prefix_1 = "**"; // Applied prefix
          var l_prefix_2 = "__"; // Alternate prefix to look for
          var node = mindmap.selectNode;

          if(node.data.isEdit)
          {// A node is edited: set in bold only the selected part
            var l_check_prefix = true;
            var l_set_as_suffix = true;
            node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix, l_set_as_suffix, true);
          }

          else
          {// Set in bold the whole node
            mindmap._formatNode(node, l_prefix_1, l_prefix_2);
          }

          mindmap.refresh();
          mindmap.scale(mindmap.mindScale);
        }
        //else: no node selected: nothing to do
        return true;
      }
    });

    // Alt + Shift + I
    this.addCommand({
      id: 'Italicize the node\'s text',
      name: `${t('Italicize the node\'s text')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'I',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        if(mindmap.selectNode) {
          var node = mindmap.selectNode;

          if(node.data.isEdit)
          {// A node is edited: set in italics only the selected part
            node.setSelectedText_italic();
          }

          else
          {// Set in italics the whole node
            var text = node.data.text;
            if( (   ( (text.substring(0,1)=="*")  ||
                      (text.substring(0,1)=="_")  )   &&
                  (text.substring(0,2)!="**")         &&
                  (text.substring(0,2)!="__")         )   ||
                (text.substring(0,3)=="***")              ||
                (text.substring(0,3)=="_**")              ||
                (text.substring(0,3)=="__*")              ||
                (text.substring(0,3)=="___")              ||
                (text.substring(0,3)=="**_")              ||
                (text.substring(0,3)=="*__")              )
            {// Already italic
              if(text.slice(0, 3).includes("_")) {
                // Replace only the first "_" in the first 3 chars (that make the italic)
                text = text.slice(0, 3).replace('_', '') + text.slice(3);
                // Replace only the first "_" in the LAST 3 chars (that make the italic)
                text = text.slice(0, -3) + text.slice(-3).replace('_', '');
              }
              else{// A "*" is making the italic
                text = text.slice(0, 3).replace('*', '') + text.slice(3);
                text = text.slice(0, -3) + text.slice(-3).replace('*', '');
              }
            }
            else {// Not in italic
              text = "_"+text+"_";
              // Used to use "*" to allow bold/italic change in whatever order
              // However "***" is not displayed as bold + italic, so use _ for italic and * for bold
            }

            // Set node text
            node.mindmap.execute('changeNodeText',{
                node:node,
                text:text,
                oldText:node.data.text
            });
            // node.data.oldText = node.data.text;
            // node.setText(text);
          }

          mindmap.refresh();
          mindmap.scale(mindmap.mindScale);
        }
        //else: no node selected: nothing to do
        return true;
      }
    });

    // Alt + Shift + H
    this.addCommand({
      id: 'Highlight the node\'s text',
      name: `${t('Highlight the node\'s text')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'H',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        if(mindmap.selectNode) {// There is a node selected: format
          var l_prefix_1 = "==";
          var l_prefix_2 = l_prefix_1;
          var node = mindmap.selectNode;

          if(node.data.isEdit)
          {// A node is edited: set in bold only the selected part
            var l_check_prefix = true;
            var l_set_as_suffix = true;
            node.setSelectedText(l_prefix_1, l_prefix_2, l_check_prefix, l_set_as_suffix, true);
          }

          else
          {// Set in bold the whole node
            mindmap._formatNode(node, l_prefix_1, l_prefix_2);
          }
        }
        //else: no node selected: nothing to do
        return true;
      }
    });

    // Alt + Shift + 2
    this.addCommand({
      id: 'Strike through the node\'s text',
      name: `${t('Strike through the node\'s text')}`,
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (!mindmapView) return false;
        if (checking) return true;
        var mindmap = mindmapView.mindmap;
        if (mindmap.selectNode) {
          var l_prefix_1 = "~~";
          var l_prefix_2 = l_prefix_1;
          var node = mindmap.selectNode;
          if (node.data.isEdit) {
            node.setSelectedText(l_prefix_1, l_prefix_2, true, true, true);
          } else {
            mindmap._formatNode(node, l_prefix_1, l_prefix_2);
          }
        }
        return true;
      }
    });

    // Alt + Shift + T
    this.addCommand({
      id: 'Add tabulation',
      name: `${t('Add tabulation')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 't',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        let node = mindmap.selectNode;
        if(node) {
          if(node.data.isEdit)
            {// A node is edited: set in bold only the selected part

            }
          node.insertText('    ');
        }
        //else: no node selected
        return true;
      }
    });

    // Alt + Ctrl + Shift + L
    this.addCommand({
      id: 'Add line break (<br>)',
      name: `${t('Add line break (<br>)')}`,
      hotkeys: [
        {
          modifiers: ['Alt','Ctrl', 'Shift'],
          key: 'l',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        let node = mindmap.selectNode;
        if(node) {
          if(node.data.isEdit)
            {// A node is edited: set in bold only the selected part

            }
          node.setSelectedText('<br>', '<br>', false, false, false);
        }
        //else: no node selected
        return true;
      }
    });

    // Alt + Shift + L
    this.addCommand({
      id: 'Remove line breaks (<br>)',
      name: `${t('Remove line breaks (<br>)')}`,
      hotkeys: [
        {
          modifiers: ['Alt','Shift'],
          key: 'l',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        let node = mindmap.selectNode;
        if(node) {
          node.removeLineBreak();
        }
        //else: no node selected
        return true;
      }
    });

    // (Shift +) Escape
    this.addCommand({
      id: 'Cancel edit',
      name: `${t('Cancel edit')}`,
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (!mindmapView) return false;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if (!node || !node.data.isEdit) return false;
        if (checking) return true;
        node.select();
        node.mindmap.editNode = null;
        node.cancelEdit();
        mindmap.undo();
        return true;
      }
    });

    // Alt + Dn
    this.addCommand({
      id: 'Expand one level',
      name: `${t('Expand one level')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'ArrowDown',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        if(mindmap.selectNode) {
          mindmap.setDisplayedLevel(mindmap.selectNode.getLevel()+1);
          mindmap.refresh();
          mindmap._selectNode(mindmap.selectNode, "right");
        }
        return true;
      }
    });

    // Alt + PgDn
    this.addCommand({
      id: 'Expand one level from the max. displayed level',
      name: `${t('Expand one level from the max. displayed level')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'PageDown',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        {// Expand
          mindmap.setChildrenDisplayedLevel(mindmap.getMaxNodeDisplayedLevel(node)+1);
          mindmap.refresh();
          //mindmap.scale(mindmap.mindScale);
          mindmap.selectNode.select();
        }
        return true;
      }
    });

    // Alt + Up
    this.addCommand({
      id: 'Collapse one level',
      name: `${t('Collapse one level')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'ArrowUp',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        if(mindmap.selectNode) {
          mindmap.setDisplayedLevel(mindmap.selectNode.getLevel()-1);
          mindmap.refresh();
          mindmap.selectNode.parent.select();
        }
        return true;
      }
    });

    // Alt + PgUp:
      this.addCommand({
        id: 'Collapse one level from the max. displayed level',
        name: `${t('Collapse one level from the max. displayed level')}`,
        hotkeys: [
          {
            modifiers: ['Alt'],
            key: 'PageUp',
          },
        ],
          checkCallback: (checking: boolean) => {
          const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
          if(!mindmapView) return false;
          if(checking) return true;
          var mindmap = mindmapView.mindmap;
          var node = mindmap.selectNode;
          if( (node)                                                  &&
              (mindmap.getMaxNodeDisplayedLevel(node)>node.getLevel())   )
          {// Collapse only if current selected node would not be hidden
            mindmap.setChildrenDisplayedLevel(mindmap.getMaxNodeDisplayedLevel(node)-1);
            mindmap.refresh();
            mindmap.scale(mindmap.mindScale);
            mindmap.selectNode.select();
          }
          return true;
        }
      });

    // Ctrl + Shift + Space
    this.addCommand({
      id: 'Toggle expand/collapse node',
      name: `${t('Toggle expand/collapse node')}`,
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'Space',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        { mindmap._toggleExpandNode(node); }
        return true;
      }
    });

    // Alt + Shift + Up
    this.addCommand({
      id: 'Move the current node above',
      name: `${t('Move the current node above')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'ArrowUp',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(!node)
        {// No node selected: select root node
          mindmap.root.select();
          node = mindmap.selectNode;
        }
        else if((!node.data.isEdit)  &&
                (!node.data.isRoot)  )
        {// The node can be moved
          var type='top';
          if(node.getIndex() == 0)
          {// First sibling: move BELOW "previous" (=last) node
            type='down';
          }
          //else: no special treatment
          mindmap.moveNode(node, node.getPreviousSibling(), type);
        }
        if ((this.settings.focusOnMove == true))
        {
          mindmap.centerOnNode(mindmap.selectNode);
        }
        return true;
      }
    });

    // Alt + Shift + Down
    this.addCommand({
      id: 'Move the current node below',
      name: `${t('Move the current node below')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'ArrowDown',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(!node)
        {// No node selected: select root node
          mindmap.root.select();
          node = mindmap.selectNode;
        }
        else if((!node.data.isEdit)  &&
                (!node.data.isRoot)  )
        {// The node can be moved
          var type='down';
          if(node.getIndex() == node.parent.children.length-1)
          {// Last sibling: move ABOVE "next" (=first) node
              type='top';
          }
          //else: no special treatment
          mindmap.moveNode(node, node.getNextSibling(), type);
        }
        if((this.settings.focusOnMove == true))
        {
          mindmap.centerOnNode(mindmap.selectNode);
        }
        return true;
      }
    });

    // Alt + Shift + Left
    this.addCommand({
      id: 'Move the current node left',
      name: `${t('Move the current node left')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'ArrowLeft',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(!node)
        {// No node selected: select root node
          mindmap.root.select();
          node = mindmap.selectNode;
        }
        else {// Move current node as parent/child depending on the position
          var rootPos = mindmap.root.getPosition();
          var nodePos = node.getPosition();
          if(rootPos.x < nodePos.x)
          {
            mindmap._moveAsParent(node);
          }
          else
          {
            mindmap._moveAsChild(node, node.getPreviousSibling());
          }
        }
        if((this.settings.focusOnMove == true))
        {
          mindmap.centerOnNode(mindmap.selectNode);
        }
        return true;
      }
    });

    // Alt + Shift + Right
    this.addCommand({
      id: 'Move the current node right',
      name: `${t('Move the current node right')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'ArrowRight',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(!node)
        {// No node selected
          mindmap.root.select();
          node = mindmap.selectNode;
        }
        else {
          var rootPos = mindmap.root.getPosition();
          var nodePos = node.getPosition();
          if(rootPos.x < nodePos.x)
          {
            // mindmap.selectedNodes.forEach((n:INode) => {
            //     mindmap._moveAsChild(n);
            // });
            mindmap._moveAsChild(node, node.getPreviousSibling());
          }
          else
          {
            mindmap._moveAsParent(node);
          }
        }
        if((this.settings.focusOnMove == true))
        {
          mindmap.centerOnNode(mindmap.selectNode);
        }
        return true;
      }
    });


    // Alt + Shift + D
    this.addCommand({
      id: 'Move next siblings as children',
      name: `${t('Move next siblings as children')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'D',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        {  mindmap.moveNextSiblingsAsChildren(node); }
        // else: No node selected: nothing to do
        return true;
      }
    });


    this.addCommand({
      id: 'Move all siblings as children',
      name: `${t('Move all siblings as children')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Ctrl', 'Shift'],
          key: 'D',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        {  mindmap.moveAllSiblingsAsChildren(node); }
        // else: No node selected: nothing to do
        return true;
      }
    });


    // Alt + Shift + J
    this.addCommand({
      id: 'Join with the node below',
      name: `${t('Join with the node below')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift'],
          key: 'J',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        {  mindmap.joinWithFollowingNode(node, false); }
        // else: No node selected: nothing to do
        return true;
      }
    });

    // Alt + Shift + Ctrl + J
    this.addCommand({
      id: 'Join as citation with the node below',
      name: `${t('Join as citation with the node below')}`,
      hotkeys: [
        {
          modifiers: ['Alt', 'Shift', 'Ctrl'],
          key: 'J',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node)
        {  mindmap.joinWithFollowingNode(node, true); }
        // else: No node selected: nothing to do
        return true;
      }
    });

    // Alt + E
    this.addCommand({
      id: 'Center mindmap view on the current node',
      name: `${t('Center mindmap view on the current node')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: 'E',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.centerOnNode(mindmap.selectNode);
        return true;
      }
    });

    // Alt + Shift + E
    this.addCommand({
      id: 'Center mindmap view',
      name: `${t('Center mindmap view')}`,
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (!mindmapView) return false;
        if (checking) return true;
        mindmapView.mindmap.center();
        return true;
      }
    });

    // Zoom in (Alt + =)
    this.addCommand({
      id: 'Zoom in',
      name: `${t('Zoom in')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: '=',
        },
        {
          modifiers: ['Mod'],
          key: '=',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.setScale("up");
        return true;
      }
    });

    // Zoom out (Alt + - or Cmd/Ctrl + -)
    this.addCommand({
      id: 'Zoom out',
      name: `${t('Zoom out')}`,
      hotkeys: [
        {
          modifiers: ['Alt'],
          key: '-',
        },
        {
          modifiers: ['Mod'],
          key: '-',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.setScale("down");
        return true;
      }
    });

    // Zoom reset (Cmd/Ctrl + 0)
    this.addCommand({
      id: 'Zoom reset',
      name: 'Reset zoom to 100%',
      hotkeys: [
        {
          modifiers: ['Mod'],
          key: '0',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.scale(100);
        return true;
      }
    });

    // Fold/Unfold selected node (Cmd/Ctrl + .)
    this.addCommand({
      id: 'Toggle fold node',
      name: 'Toggle fold/unfold selected node',
      hotkeys: [
        {
          modifiers: ['Mod'],
          key: '.',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        var node = mindmap.selectNode;
        if(node && !node.data.isEdit && !node.data.isRoot) {
          mindmap._toggleExpandNode(node);
        }
        return true;
      }
    });

    // Fold all nodes (Cmd/Ctrl + Shift + -)
    this.addCommand({
      id: 'Fold all',
      name: 'Fold all branches',
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: '-',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.setDisplayedLevel(1);
        mindmap.refresh();
        mindmap.scale(mindmap.mindScale);
        new Notice('All branches folded');
        return true;
      }
    });

    // Unfold all nodes (Cmd/Ctrl + Shift + =)
    this.addCommand({
      id: 'Unfold all',
      name: 'Unfold all branches',
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: '=',
        },
      ],
      checkCallback: (checking: boolean) => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(!mindmapView) return false;
        if(checking) return true;
        var mindmap = mindmapView.mindmap;
        mindmap.setDisplayedLevel(99);
        mindmap.refresh();
        mindmap.scale(mindmap.mindScale);
        new Notice('All branches unfolded');
        return true;
      }
    });

    this.addCommand({
      id: 'Display the node\'s info in console',
      name: `${t('Display the node\'s info in console')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView){
          var mindmap = mindmapView.mindmap;
          var node = mindmap.selectNode;
          if(node) {
            console.log("Node idx: "+node.getIndex());
            console.log("Previous node idx: "+node.getPreviousSibling().getIndex());
            console.log("Next node idx: "+node.getNextSibling().getIndex());
            console.log("Node pos: x="+node.getPosition().x+" / y="+node.getPosition().y);
            console.log("Node dim: x="+node.getDimensions().x+" / y="+node.getDimensions().y);
            console.log("Canvas: "+mindmap.setting.canvasSize);
            console.log("Disp scroll: x="+mindmap.containerEL.scrollLeft+" / y="+mindmap.containerEL.scrollTop);
            console.log("Disp client: x="+mindmap.containerEL.clientWidth+" / y="+mindmap.containerEL.clientHeight);
            //node.setText
          }
        }
      }
    });



    this.addCommand({
      id: 'Export to html',
      name: `${t('Export to html')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView){
            mindmapView.exportToSvg();
        }
      }
    });


    this.addCommand({
      id: 'Export to JPEG (LQ)',
      name: `${t('Export to JPEG (LQ)')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (mindmapView) {
          mindmapView.exportToJpeg(1);
        }
      }
    });

    this.addCommand({
      id: 'Export to PNG (LQ)',
      name: `${t('Export to PNG (LQ)')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView){
            mindmapView.exportToPng(1);
        }
      }
    });


    this.addCommand({
      id: 'Export to JPEG',
      name: `${t('Export to JPEG')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (mindmapView) {
          mindmapView.exportToJpeg(2);
        }
      }
    });

    this.addCommand({
      id: 'Export to PNG',
      name: `${t('Export to PNG')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView){
            mindmapView.exportToPng(2);
        }
      }
    });


    this.addCommand({
      id: 'Export to JPEG (HQ)',
      name: `${t('Export to JPEG (HQ)')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if (mindmapView) {
          mindmapView.exportToJpeg(4);
        }
      }
    });

    this.addCommand({
      id: 'Export to PNG (HQ)',
      name: `${t('Export to PNG (HQ)')}`,
      callback: () => {
        const mindmapView = this.app.workspace.getActiveViewOfType(MindMapView);
        if(mindmapView){
            mindmapView.exportToPng(4);
        }
      }
    });


    this.registerView(mindmapViewType, (leaf) => new MindMapView(leaf, this));
    this.registerEvents();
    this.registerMonkeyAround();


    this.addSettingTab(new MindMapSettingsTab(this.app, this));

  }

  onunload() {
    // Per Obsidian guidelines, do NOT detach leaves on unload — when the user
    // updates the plugin, open mindmap leaves should re-initialize at their
    // existing positions. Letting Obsidian handle leaf lifecycle is correct.
  }

  async newMindMap(folder?: TFolder) {
    const targetFolder = folder
      ? folder
      : this.app.fileManager.getNewFileParent(
        this.app.workspace.getActiveFile()?.path || ""
      );

    try {
      // @ts-ignore
      const mindmap: TFile = await this.app.fileManager.createNewMarkdownFile(
        targetFolder,
        `${t('Untitled mindmap')}`
      );

      await this.app.vault.modify(mindmap, basicFrontmatter);
       setTimeout(async ()=>{
          await this.app.workspace.getLeaf().setViewState({
            type: mindmapViewType,
            state: { file: mindmap.path },
          });
       },100);
    } catch (e) {
      console.error("Error creating mindmap board:", e);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({
      canvasSize: 8000,
      headLevel: 2,
      fontSize: 16,
      background: 'transparent',
      layout: 'mindmap',
      layoutDirect: 'mindmap',
      foldStatePersistence: 'markdown',
      foldStateByFile: {},
    }, await this.loadData());
    if (!this.settings.foldStateByFile) {
      this.settings.foldStateByFile = {};
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Fold state persistence in plugin-data mode.
  // Keys are file paths; values are arrays of text-paths like
  // ["Root > Section A > Item 3", "Root > Section B"]
  // identifying collapsed nodes structurally (survives most edits).
  getCollapsedPathsForFile(filePath: string): string[] {
    if (!filePath) return [];
    return (this.settings.foldStateByFile && this.settings.foldStateByFile[filePath]) || [];
  }

  async setCollapsedPathsForFile(filePath: string, paths: string[]) {
    if (!filePath) return;
    if (!this.settings.foldStateByFile) this.settings.foldStateByFile = {};
    if (paths.length === 0) {
      delete this.settings.foldStateByFile[filePath];
    } else {
      this.settings.foldStateByFile[filePath] = paths;
    }
    await this.saveData(this.settings);
  }

  async setMarkdownView(leaf: WorkspaceLeaf) {
    await leaf.setViewState(
      {
        type: "markdown",
        state: leaf.view.getState(),
        popstate: true,
      } as ViewState,
      { focus: true }
    );
  }

  async setMindMapView(leaf: WorkspaceLeaf) {
    await leaf.setViewState({
      type: mindmapViewType,
      state: leaf.view.getState(),
      popstate: true,
    } as ViewState);
  }

  registerEvents() {
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file: TFile,source:string,leaf?:WorkspaceLeaf) => {
        // Add a menu item to the folder context menu to create a board
        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item
              .setTitle(`${t('New mindmap board')}`)
              .setIcon('document')
              .onClick(() => this.newMindMap(file));
          });
        }

        //add markdown view menu  open as mind map view

        if(leaf&&this.mindmapFileModes[leaf.id||file.path] == 'markdown'){
             const cache = this.app.metadataCache.getFileCache(file);
             if(cache?.frontmatter && cache.frontmatter[frontMatterKey]){
                  menu.addItem((item) => {
                   item
                   .setTitle(`${t('Open as mindmap board')}`)
                   .setIcon("document")
                   .onClick(() => {
                     this.mindmapFileModes[leaf.id || file.path] = mindmapViewType;
                     this.setMindMapView(leaf);
                   });
                 }).addSeparator();
            }
        }
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.app.workspace.getLeavesOfType(mindmapViewType).forEach((leaf) => {
          const view = leaf.view as MindMapView;
          view.onFileMetadataChange(file);
        });
      })
    );

    // @ts-ignore
    // this.app.workspace.registerHoverLinkSource(frontMatterKey, {
    //   display: mindmapViewType,
    //   defaultMod: true,
    // });
  }

  registerMonkeyAround() {
    const self = this;

    this.register(
      around(WorkspaceLeaf.prototype, {
        // Kanbans can be viewed as markdown or kanban, and we keep track of the mode
        // while the file is open. When the file closes, we no longer need to keep track of it.
        detach(next) {
          return function () {
            const state = this.view?.getState();

            if (state?.file && self.mindmapFileModes[this.id || state.file]) {
              delete self.mindmapFileModes[this.id || state.file];
            }

            return next.apply(this);
          };
        },

        setViewState(next) {

          return function (state: ViewState, ...rest: any[]) {
            // new Notice( state.type);
            if (
              self._loaded &&
              state.type === "markdown" &&
              state.state?.file &&
              // And the current mode of the file is not set to markdown
              self.mindmapFileModes[this.id || state.state.file] !== "markdown"
            ) {
              // Then check for the kanban frontMatterKey
              const cache = self.app.metadataCache.getCache(state.state.file);

              //   new Notice(cache.frontmatter[frontMatterKey]);

              if (cache?.frontmatter && cache.frontmatter[frontMatterKey]) {
                // If we have it, force the view type to kanban
                const newState = {
                  ...state,
                  type: mindmapViewType,
                };

                self.mindmapFileModes[state.state.file] = mindmapViewType;

                return next.apply(this, [newState, ...rest]);
              }
            }

            return next.apply(this, [state, ...rest]);
          };
        },
      })
    );



    // this.register(
    //   around(MarkdownView.prototype, {
    //     onMoreOptionsMenu(next) {
    //       return function (menu: Menu) {
    //         const file = this.file;
    //         const cache = file
    //           ? self.app.metadataCache.getFileCache(file)
    //           : null;

    //         if (
    //           !file ||
    //           !cache?.frontmatter ||
    //           !cache.frontmatter[frontMatterKey]
    //         ) {
    //           return next.call(this, menu);
    //         }



    //         menu
    //           .addItem((item) => {
    //             item
    //               .setTitle(`${t('Open as mindmap board')}`)
    //               .setIcon("document")
    //               .onClick(() => {
    //                 self.mindmapFileModes[this.leaf.id || file.path] =
    //                   mindmapViewType;
    //                 self.setMindMapView(this.leaf);
    //               });
    //           })
    //           .addSeparator();

    //         next.call(this, menu);
    //       };
    //     },
    //   })
    // );


  }


}
