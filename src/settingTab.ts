import {
    App,
    PluginSettingTab,
    Setting,
} from 'obsidian';
import MindMap from './main';
import { t } from './lang/helpers'
import { MindMapView, mindmapViewType } from './MindMapView';
import MyNode from './mindmap/INode';

export class MindMapSettingsTab extends PluginSettingTab {
    plugin: MindMap;
    constructor(app: App, plugin: MindMap) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName(`${t('Canvas size')}`)
            .setDesc(`${t('Canvas size desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('4000', '4000')
                    .addOption('6000', '6000')
                    .addOption('8000', '8000')
                    .addOption('10000', '10000')
                    .addOption('12000', '12000')
                    .addOption('16000', '16000')
                    .addOption('20000', '20000')
                    .addOption('30000', '30000')
                    .addOption('36000', '36000')
                    .setValue(this.plugin.settings.canvasSize.toString() || '8000')
                    .onChange((value: string) => {
                        var _v = Number.parseInt(value)
                        this.plugin.settings.canvasSize = _v;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.canvasSize = _v;
                            v.mindmap.setAppSetting();
                            var box = v.mindmap.root.getBox();
                            v.mindmap.root.setPosition(_v / 2 - box.width / 2, _v / 2 - box.height / 2);
                            v.mindmap.refresh();
                            v.mindmap.center();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Canvas background')}`)
            .setDesc(`${t('Canvas background desc')}`)
            .addText(text =>
                text
                    .setValue(this.plugin.settings.background || 'transparent')
                    .setPlaceholder('Example: black|white|#ccc')
                    .onChange((value: string) => {
                        this.plugin.settings.background = value;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.background = this.plugin.settings.background;
                            v.mindmap.setAppSetting();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Max level of node to markdown head')}`)
            .setDesc(`${t('Max level of node to markdown head desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('0', '0')
                    .addOption('1', '1')
                    .addOption('2', '2')
                    .addOption('3', '3')
                    .addOption('4', '4')
                    .addOption('5', '5')
                    .addOption('6', '6')
                    .setValue(this.plugin.settings.headLevel.toString() || '2')
                    .onChange((value: string) => {
                        this.plugin.settings.headLevel = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.headLevel = this.plugin.settings.headLevel;
                        });
                    }));



        new Setting(containerEl)
            .setName(`${t('Font size')}`)
            .setDesc(`${t('Font size desc')}`)
            .addText(text =>
                text
                    .setValue(this.plugin.settings.fontSize?.toString() || '16')
                    .setPlaceholder('Example: 16')
                    .onChange((value: string) => {
                        this.plugin.settings.fontSize = Number.parseInt(value);
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.fontSize = this.plugin.settings.fontSize;
                            v.mindmap.setAppSetting();
                            v.mindmap.traverseBF((n: MyNode) => {
                                n.boundingRect = null;
                                n.refreshBox();
                            })
                            v.mindmap.refresh();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Mind map layout direct')}`)
            .setDesc(`${t('Mind map layout direct desc')}`)
            .addDropdown(dropDown =>
                dropDown
                    .addOption('mind map', t('Centered'))
                    .addOption('right', t('Right'))
                    .addOption('left', t('Left'))
                    .addOption('clockwise', t('Clockwise'))
                    .setValue(this.plugin.settings.layoutDirect.toString() || 'mind map')
                    .onChange((value: string) => {
                        this.plugin.settings.layoutDirect = value;
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            v.mindmap.setting.layoutDirect = this.plugin.settings.layoutDirect;
                            v.mindmap.refresh();
                        });
                    }));

        new Setting(containerEl)
            .setName(`${t('Stroke Array')}`)
            .setDesc(`${t('Stroke Array Desc')}`)
            .addText(text =>
                text
                    .setValue(this.plugin.settings.strokeArray?.toString() || '')
                    .setPlaceholder('Example: red,orange,blue ...')
                    .onChange((value: string) => {
                        //this.plugin.settings.strokeArray = value
                        this.plugin.settings.strokeArray = value.split(',');
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);

                        mindmapLeaves.forEach((leaf) => {
                            var v = leaf.view as MindMapView;
                            //v.mindmap.setting.strokeArray = this.plugin.settings.strokeArray.split(',');
                            v.mindmap.setting.strokeArray = this.plugin.settings.strokeArray;
                            if( v.mindmap.mmLayout){
                                v.mindmap.mmLayout.colors=v.mindmap.setting.strokeArray;
                            }

                            v.mindmap.traverseBF((n: MyNode) => {
                                n.boundingRect = null;
                                n.refreshBox();
                            })
                            v.mindmap.refresh();
                        });
                    }));

        new Setting(containerEl)
            .setName('Display moved on current node')
            .setDesc(
                'If enabled, the mindmap view is centered on the current node when moving it',
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.settings.focusOnMove).onChange((value) => {
                        this.plugin.settings.focusOnMove = value;
                        this.plugin.saveData(this.plugin.settings);

                }),
            );

        new Setting(containerEl)
            .setName('Default zoom on open (%)')
            .setDesc(
                'Zoom level applied when opening a mindmap that has no `mindmap-zoom` value ' +
                'in its frontmatter. After you close the mindmap, the current zoom is saved ' +
                'back to that file\'s frontmatter, so each file remembers its own zoom.',
            )
            .addText(text =>
                text
                    .setValue((this.plugin.settings.defaultZoom ?? 100).toString())
                    .setPlaceholder('Example: 80')
                    .onChange((value: string) => {
                        var n = Number.parseInt(value);
                        if (isNaN(n)) return;
                        this.plugin.settings.defaultZoom = Math.max(20, Math.min(300, n));
                        this.plugin.saveData(this.plugin.settings);
                    }));

        new Setting(containerEl)
            .setName('Mobile action bar — button size (px)')
            .setDesc(
                'Diameter in px of the "+ Sibling" and "+ Child" buttons at the bottom ' +
                'of the screen on mobile. The recenter button stays a fixed small size.',
            )
            .addText(text =>
                text
                    .setValue((this.plugin.settings.mobileActionBarSize ?? 56).toString())
                    .setPlaceholder('Example: 56')
                    .onChange((value: string) => {
                        var n = Number.parseInt(value);
                        if (isNaN(n)) return;
                        this.plugin.settings.mobileActionBarSize = Math.max(24, Math.min(100, n));
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            (leaf.view as MindMapView).applyMobileActionBarStyle?.();
                        });
                    }));

        new Setting(containerEl)
            .setName('Mobile action bar — idle opacity (%)')
            .setDesc(
                'Idle opacity (10-100) of the mobile action bar buttons. They become fully ' +
                'opaque when pressed.',
            )
            .addText(text =>
                text
                    .setValue((this.plugin.settings.mobileActionBarOpacity ?? 65).toString())
                    .setPlaceholder('Example: 65')
                    .onChange((value: string) => {
                        var n = Number.parseInt(value);
                        if (isNaN(n)) return;
                        this.plugin.settings.mobileActionBarOpacity = Math.max(10, Math.min(100, n));
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            (leaf.view as MindMapView).applyMobileActionBarStyle?.();
                        });
                    }));

        new Setting(containerEl)
            .setName('Mobile action bar — vertical offset, no keyboard (px)')
            .setDesc(
                'Extra px above the safe-area at the bottom of the screen when the keyboard ' +
                'is NOT shown. 0-200; default 24.',
            )
            .addText(text =>
                text
                    .setValue((this.plugin.settings.mobileBarOffsetNoKeyboard ?? 24).toString())
                    .setPlaceholder('Example: 24')
                    .onChange((value: string) => {
                        var n = Number.parseInt(value);
                        if (isNaN(n)) return;
                        this.plugin.settings.mobileBarOffsetNoKeyboard = Math.max(0, Math.min(200, n));
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            (leaf.view as MindMapView).updateMobileBarPosition?.();
                        });
                    }));

        new Setting(containerEl)
            .setName('Mobile action bar — vertical offset, keyboard visible (px)')
            .setDesc(
                'Position when the keyboard is shown. 100 is the comfortable default; dial ' +
                'up toward 200 for more clearance above the keys, down toward 0 to push the ' +
                'bar lower. Each step is roughly 1mm of visible movement. Very low values ' +
                'may put the bar partially behind the keyboard chrome.',
            )
            .addText(text =>
                text
                    .setValue((this.plugin.settings.mobileBarOffsetWithKeyboard ?? 100).toString())
                    .setPlaceholder('Example: 100')
                    .onChange((value: string) => {
                        var n = Number.parseInt(value);
                        if (isNaN(n)) return;
                        this.plugin.settings.mobileBarOffsetWithKeyboard = Math.max(0, Math.min(200, n));
                        this.plugin.saveData(this.plugin.settings);
                        const mindmapLeaves = this.app.workspace.getLeavesOfType(mindmapViewType);
                        mindmapLeaves.forEach((leaf) => {
                            (leaf.view as MindMapView).updateMobileBarPosition?.();
                        });
                    }));

        new Setting(containerEl)
            .setName('Fold state persistence')
            .setDesc(
                'How to remember which branches you collapsed across reloads. ' +
                'Markdown: writes "^id" markers in the file (portable but pollutes content). ' +
                'Plugin data: stored separately, keeps your markdown clean. ' +
                'Don\'t persist: every reload starts fully expanded.',
            )
            .addDropdown(dropDown =>
                dropDown
                    .addOption('markdown', 'In the markdown file (^id markers)')
                    .addOption('plugin-data', 'In plugin data (clean markdown)')
                    .addOption('none', 'Don\'t persist')
                    .setValue(this.plugin.settings.foldStatePersistence || 'markdown')
                    .onChange((value: string) => {
                        this.plugin.settings.foldStatePersistence = value as ('markdown' | 'plugin-data' | 'none');
                        this.plugin.saveData(this.plugin.settings);
                    }));
    }
}
