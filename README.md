# Mindsidian

An interactive mind map plugin for Obsidian. Turn any markdown file into a visual mind map and edit it directly.

## How it works

Add this frontmatter to any `.md` file:

```yaml
---
mindmap-plugin: basic
---
```

Then toggle between markdown and mind map view via the command palette: **Toggle markdown/mindmap** (or **Set to mindmap mode** / **Set to markdown mode**). Bind a hotkey of your choice via **Settings → Hotkeys**.

Headings (`##`) become branch nodes. Bullet points (`-`) become leaves. Edit nodes by double-clicking (desktop) or double-tapping (mobile).

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle markdown/mindmap | (no default — bind in Hotkeys) |
| Add sibling node | Enter |
| Add child node | Tab |
| Delete node | Delete / Backspace |
| Edit node | Double-click / Shift+F2 |
| Undo / Redo | Cmd+Z / Cmd+Shift+Z |
| Zoom in/out | Cmd+= / Cmd+- |
| Reset zoom | Cmd+0 |
| Fold/unfold node | Cmd+. |
| Copy/Cut/Paste node | Alt+Shift+C / X / V |
| Bold/Italic/Highlight | Alt+Shift+B / I / H |

All shortcuts are scoped to mindmap view only — they won't interfere with normal markdown editing.

## Mobile support

- **Pan**: native iOS scroll (smooth, hardware-accelerated)
- **Pinch-to-zoom**: focal point under your fingers stays fixed throughout the gesture
- **Double-tap**: edit a node
- **Long-press (500ms)**: drag the node to a new parent — it visibly follows your finger, drop indicators show where it will attach, auto-pans near viewport edges
- **Recenter button**: floating button in the bottom-right gets you back to the root if you pan too far

The add/delete menu appears automatically when you select a node.

## Content safety

The plugin normalizes non-standard markdown formatting so nothing gets silently dropped:

- Bare text lines (no bullet) → converted to bullets
- `#tags` → preserved as node text, not mistaken for headings
- Indented bullets with no parent → un-indented to correct level
- Space-based indentation → normalized to tabs
- Horizontal rules → converted to nodes

Principle: **everything gets assimilated into the mindmap, nothing gets deleted.**

## Installation

### Via BRAT (recommended for beta builds)
1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. In BRAT settings, **Add Beta plugin** → enter `creadian/Mindsidian`
3. Enable **Mindsidian** in Settings → Community Plugins

### Manual
1. Copy the `mindsidian` folder (containing `main.js`, `manifest.json`, `styles.css`) to `<vault>/.obsidian/plugins/`
2. Enable it in Settings → Community Plugins
3. Restart Obsidian

## Credits

Forked from [obsidian-enhancing-mindmap](https://github.com/MarkMindCkm/obsidian-enhancing-mindmap) by MarkMindCkm, used under the MIT License.

## License

MIT — see [LICENSE.md](LICENSE.md)
