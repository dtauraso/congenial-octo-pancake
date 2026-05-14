import ReactFlow, { Background, Controls, MiniMap, SelectionMode } from "reactflow";
import { CompareToolbar } from "../CompareToolbar";
import { LegendPanel } from "../LegendPanel";
import { MarkerDefs } from "../MarkerDefs";
import { NodePalette } from "../NodePalette";
import { spec } from "../../state";
import { AlignGuides } from "./AlignGuides";
import { EdgeContextMenu } from "./EdgeContextMenu";
import { EDGE_TYPES, RF_NODE_TYPES } from "./_constants";
import type { AppViewProps } from "./_app-view-props";

export function AppView(p: AppViewProps) {
  return (
    <div
      ref={p.paneRef}
      className={p.ghostFront ? "ghost-front" : undefined}
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
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
      <AlignGuides guides={p.guides} />
      <MarkerDefs />
      <LegendPanel rows={spec.legend ?? []} />
      <NodePalette />
      <CompareToolbar
        mode={p.compareMode}
        label={p.comparisonLabel}
        error={p.compareError}
        onSetMode={p.setCompareMode}
        onClose={p.closeCompare}
      />
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
