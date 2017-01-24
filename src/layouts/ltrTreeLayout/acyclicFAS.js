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

function dfsFas (graph) {
  const fas = [];
  const stack = {};
  const visited = {};

  function dfs (node) {
    if (_.has(visited, node.name)) {
      return;
    }
    visited[node.name] = true;
    stack[node.name] = true;
    _.each(graph.outgoingEdges(node.name), (edge) => {
      if (_.has(stack, edge.target)) {
        fas.push(edge);
      } else {
        dfs(graph.getNode(edge.target));
      }
    });
    delete stack[node.name];
  }

  _.each(graph.nodes, dfs);
  return fas;
}

function remove (graph) {
  const fas = dfsFas(graph);
  _.each(fas, (edge) => {
    graph.reverseEdge(edge);
  });
}

function restore (graph) {
  _.each(graph.edges, (edge) => {
    if (edge.reversed) {
      graph.reverseEdge(edge);
    }
  });
}

module.exports = {
  remove: remove,
  restore: restore
};
