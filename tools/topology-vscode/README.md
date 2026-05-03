# Topology Editor (VS Code extension)

Custom editor for `topology.json`. Drag nodes around; saves write back through `WorkspaceEdit` and re-run `go run ./cmd/topogen`.

## Dev loop

```sh
cd tools/topology-vscode
npm install
npm run build
```

Then open this folder in VS Code and press **F5**. A second VS Code window opens (Extension Development Host); inside it, open the repo and double-click `topology.json` — the custom editor takes over. Edits hot-reload via `npm run watch`; reload the dev host with Cmd+R after a rebuild.

## Architecture

- `src/extension.ts` — `CustomTextEditorProvider` for the `topology.editor` viewType, registered against `topology.json`. Streams document text into the webview, applies webview saves via `WorkspaceEdit`, kicks off `topogen`.
- `src/webview/main.ts` — renders nodes/edges from the JSON spec into inline SVG, handles pointer drag with `setPointerCapture` + `getScreenCTM().inverse()`, debounced save back to the host.
- `src/schema.ts` — ported verbatim from `tools/topology-editor/src/schema.ts`. Node-type registry / edge-kind colors.

## Package

```sh
npm run package   # → topology-vscode-0.0.1.vsix
code --install-extension topology-vscode-0.0.1.vsix
```
