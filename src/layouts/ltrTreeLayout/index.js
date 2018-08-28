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
import { map } from 'lodash';

import LayoutWorker from 'worker-loader?inline!./ltrTreeLayoutWorker'; // eslint-disable-line import/no-extraneous-dependencies, import/extensions

class LTRTreeLayout {
  constructor () {
    this.cache = [];
  }

  findPositions (nodeKey, edgeKey) {
    return this.cache.find((layout) => {
      // If there are more nodes or edges than are in the layout, then we know it doesn't match
      if (nodeKey.length > layout.nodeKey.length || edgeKey.length > layout.edgeKey.length) {
        return false;
      }

      // If there are new nodes that are not in this layout, bail
      const nodeKeyMatch = nodeKey.every(node => layout.nodeKey.indexOf(node) !== -1);
      if (!nodeKeyMatch) {
        return false;
      }

      // If there are new edges that are not in this layout, bail
      const edgeKeyMatch = edgeKey.every(edge => layout.edgeKey.indexOf(edge) !== -1);
      if (!edgeKeyMatch) {
        return false;
      }

      return true;
    });
  }

  cachePositions (nodeKey, edgeKey, positions) {
    this.cache.push({
      nodeKey: nodeKey,
      edgeKey: edgeKey,
      positions: positions
    });
  }

  layoutPositions (graph, positions) {
    graph.nodes.forEach((node) => {
      if (positions[node.name]) {
        node.updatePosition(positions[node.name]);
      }
    });
  }

  run (graph, dimensions, layoutComplete) {
    const workerGraph = {
      nodes: map(graph.nodes, node => ({
        name: node.getName(), position: node.position, size: node.size, weight: node.depth, metadata: node.metadata
      })),
      edges: map(graph.connections, connection => ({ source: connection.source.getName(), target: connection.target.getName() }))
    };

    const edgeKey = workerGraph.edges.map(edge => edge.source + edge.target).sort();
    const nodeKey = workerGraph.nodes.map(node => node.name).sort();

    const existingPositions = this.findPositions(nodeKey, edgeKey);
    if (existingPositions) {
      this.layoutPositions(graph, existingPositions);
      layoutComplete();
    } else {
      const layoutWorker = LayoutWorker();
      const layoutWorkerComplete = (event) => {
        this.cachePositions(nodeKey, edgeKey, event.data);
        this.layoutPositions(graph, event.data);
        layoutComplete();
        layoutWorker.removeEventListener('message', layoutWorkerComplete);
      };
      layoutWorker.addEventListener('message', layoutWorkerComplete);

      layoutWorker.postMessage({
        graph: workerGraph, dimensions: dimensions, entryNode: graph.entryNode, options: graph.options
      });
    }
  }
}

export default LTRTreeLayout;
