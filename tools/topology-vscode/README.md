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

See [ARCHITECTURE.md](ARCHITECTURE.md) for the file map (extension side,
webview side, message protocol, spec-vs-viewer split).

## Package

```sh
npm run package   # → topology-vscode-0.0.1.vsix
code --install-extension topology-vscode-0.0.1.vsix
```
