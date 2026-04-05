# Mindsidian

An interactive mind map plugin for Obsidian. Turn any markdown file into a visual mind map and edit it directly.

## How it works

Add this frontmatter to any `.md` file:

```yaml
---
mindmap-plugin: basic
---
```

Then toggle between markdown and mind map view with `Ctrl/Cmd+Alt+M`.

Headings (`##`) become branch nodes. Bullet points (`-`) become leaves. Edit nodes by double-clicking (desktop) or long-pressing (mobile).

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Toggle markdown/mindmap | Ctrl/Cmd+Alt+M |
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

Touch panning, pinch-to-zoom, long-press to edit, and a floating recenter button. The add/delete menu appears automatically when selecting a node.

## Content safety

The plugin normalizes non-standard markdown formatting so nothing gets silently dropped:

- Bare text lines (no bullet) → converted to bullets
- `#tags` → preserved as node text, not mistaken for headings
- Indented bullets with no parent → un-indented to correct level
- Space-based indentation → normalized to tabs
- Horizontal rules → converted to nodes

Principle: **everything gets assimilated into the mindmap, nothing gets deleted.**

## Installation

### Manual
1. Copy the `claude-mindmap` folder to `<vault>/.obsidian/plugins/`
2. Enable it in Settings → Community Plugins
3. Restart Obsidian

## Credits

Forked from [obsidian-enhancing-mindmap](https://github.com/MarkMindCkm/obsidian-enhancing-mindmap) by MarkMindCkm, used under the MIT License.

## License

MIT — see [LICENSE.md](LICENSE.md)
