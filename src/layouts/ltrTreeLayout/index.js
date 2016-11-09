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
import _ from 'lodash';

import LayoutWorker from 'worker?inline!./ltrTreeLayoutWorker'; // eslint-disable-line import/no-extraneous-dependencies, import/extensions

class LTRTreeLayout {
  run (graph, dimensions, layoutComplete) {
    const layoutWorker = LayoutWorker();
    const layoutWorkerComplete = (event) => {
      graph.nodes.forEach(node => {
        if (event.data[node.name]) {
          node.updatePosition(event.data[node.name]);
        }
      });
      layoutComplete();
      layoutWorker.removeEventListener('message', layoutWorkerComplete);
    };
    layoutWorker.addEventListener('message', layoutWorkerComplete);

    const workerGraph = {
      nodes: _.map(graph.nodes, node => ({ name: node.getName(), position: node.position, size: node.size, weight: node.depth, metadata: node.metadata })),
      edges: _.map(graph.connections, connection => ({ source: connection.source.getName(), target: connection.target.getName() }))
    };

    layoutWorker.postMessage({ graph: workerGraph, dimensions: dimensions, entryNode: 'INTERNET' });
  }
}

export default LTRTreeLayout;
