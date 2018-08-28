/**
 *
 *  Copyright 2016 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */
import {
  each, keyBy, map, max, min
} from 'lodash';

function updatePosition (node, nodeCount, nodeIndex, orbitSize) {
  const rotationAdjustment = nodeCount % 2 === 0 ? Math.PI / 4 : (5 / 6) * Math.PI;
  const adjustment = (((2 * Math.PI) * nodeIndex) / nodeCount) + rotationAdjustment;
  node.updatePosition({
    x: ((orbitSize / 2) * Math.cos(adjustment)),
    y: ((orbitSize / 2) * Math.sin(adjustment))
  });
}

function positionNodes (nodes, orbitSize) {
  let nodeIndex = 0;
  const nodeCount = Object.keys(nodes).length - 1;

  const sortedNodeNames = map(nodes, 'name');
  sortedNodeNames.sort();

  // Layout the nodes with the entry node in the middle
  const nodeMap = keyBy(nodes, 'name');
  each(sortedNodeNames, (nodeName) => {
    const node = nodeMap[nodeName];
    if (!node.isEntryNode() && nodeCount > 0) {
      nodeIndex++;
      updatePosition(node, nodeCount, nodeIndex, orbitSize);
    } else {
      node.updatePosition({ x: 0, y: 0 });
    }
  });
}

function centerNodesVertically (nodes) {
  // Center the nodes vertically on the canvas
  const yPositions = map(nodes, n => n.position.y);
  const yOffset = Math.abs(Math.abs(max(yPositions)) - Math.abs(min(yPositions))) / 2;
  each(nodes, (n) => {
    n.position.y += yOffset;
  });
}

function recalculateOrbitSize (nodes, orbitSize, nodeSize) {
  const yPositions = map(nodes, n => n.position.y);
  const yDistance = max(yPositions) - min(yPositions);
  const totalHeight = (nodeSize * 2.25) + yDistance;
  const newOrbitSize = orbitSize - Math.max(totalHeight - orbitSize, 0);

  return newOrbitSize;
}

class RingCenterLayout {
  run (graph, dimensions, layoutComplete) {
    const maxDimension = Math.min(dimensions.width, dimensions.height);
    let orbitSize = maxDimension;
    const nodeSize = min(map(graph.nodes, 'size'));

    if (Object.keys(graph.nodes).length > 0) {
      // Position the nodes based on the current orbitSize
      positionNodes(graph.nodes, orbitSize);
      // Now that the nodes are positioned, adjust orbit size accordingly so the nodes all fit
      orbitSize = recalculateOrbitSize(graph.nodes, maxDimension, nodeSize);
      // Position again with the proper orbitSize
      positionNodes(graph.nodes, orbitSize);
      centerNodesVertically(graph.nodes);
    }

    layoutComplete();
  }
}

export default RingCenterLayout;
