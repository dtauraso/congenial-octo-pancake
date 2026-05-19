import ReactFlow, { Background, Controls, SelectionMode } from "reactflow";
import { MarkerDefs } from "../MarkerDefs";
import { NodePalette } from "../panels/NodePalette";
import { AlignGuides } from "./AlignGuides";
import { EdgeContextMenu } from "./EdgeContextMenu";
import { EDGE_TYPES, RF_NODE_TYPES } from "./_constants";
import type { AppViewProps } from "./_app-view-props";

export function AppView(p: AppViewProps) {
  return (
    <div
      ref={p.paneRef}
      style={{ position: "absolute", inset: 0 }}
      onDragOver={p.onDragOver}
      onDrop={p.onDrop}
    >
      <ReactFlow
        nodes={p.styledNodes}
        edges={p.styledEdges}
        onNodesChange={p.onNodesChange}
        onEdgesChange={p.onEdgesChange}
        onMoveEnd={p.onMoveEnd}
        onSelectionChange={p.onSelectionChange}
        onNodeDoubleClick={p.onNodeDoubleClick}
        onNodeContextMenu={p.onNodeContextMenu}
        onSelectionContextMenu={p.onSelectionContextMenu}
        onNodeDrag={p.onNodeDrag}
        onNodeDragStop={p.onNodeDragStop}
        onNodesDelete={p.onNodesDelete}
        onEdgesDelete={p.onEdgesDelete}
        onConnect={p.onConnect}
        isValidConnection={p.isValidConnection}
        onEdgeUpdate={p.onReconnect}
        onEdgeUpdateStart={p.onReconnectStart}
        onEdgeUpdateEnd={p.onReconnectEnd}
        onEdgeContextMenu={p.onEdgeContextMenu}
        onPaneClick={p.closeEdgeMenu}
        minZoom={0.1}
        maxZoom={4}
        zoomOnDoubleClick={false}
        fitView
        deleteKeyCode={["Delete", "Backspace"]}
        nodesConnectable={true}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag={true}
        panOnDrag={[1]}
        panOnScroll={true}
        edgeTypes={EDGE_TYPES}
        nodeTypes={RF_NODE_TYPES}
      >
        <Background gap={24} />
        <Controls position="bottom-left" />
      </ReactFlow>
      <AlignGuides guides={p.guides} />
      <MarkerDefs />
      <NodePalette />
      {p.edgeMenu && (
        <EdgeContextMenu
          x={p.edgeMenu.x}
          y={p.edgeMenu.y}
          edgeId={p.edgeMenu.edgeId}
          onPick={p.setEdgeKind}
        />
      )}
    </div>
  );
}
