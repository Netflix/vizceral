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
  each, has, map, min
} from 'lodash';

const minimumLength = 1;

function longestPathRanking (graph) {
  const visited = {};

  function dfs (nodeName) {
    const node = graph.getNode(nodeName);
    if (!node) { return undefined; }
    if (!has(visited, nodeName)) {
      visited[nodeName] = true;

      let rank = min(map(graph.outgoingEdges(nodeName), edge => dfs(edge.target) - minimumLength));
      if (rank === undefined) {
        rank = 0;
      }
      node.rank = rank;
    }
    return node.rank;
  }

  each(graph.entryNodes(), dfs);
}

function normalizeRanks (graph) {
  let i;
  let lowestRank = Infinity;
  // First make the ranks positive
  for (i = 0; i < graph.nodes.length; i++) {
    if (graph.nodes[i].rank < lowestRank) {
      lowestRank = graph.nodes[i].rank;
    }
  }
  for (i = 0; i < graph.nodes.length; i++) {
    graph.nodes[i].rank -= lowestRank;
  }
}

function forcePrimaryRankPromotions (graph, entryNodeName = 'INTERNET') {
  let entryNodes = graph.entryNodes();
  if (entryNodes.includes(entryNodeName)) {
    entryNodes = [entryNodeName];
  }
  for (let i = 0; i < entryNodes.length; i++) {
    const entryNode = graph.getNode(entryNodes[i]);
    entryNode.rank = 0;
  }
}

function forceSecondaryRankPromotions (graph, entryNodeName = 'INTERNET') {
  let entryNodes = graph.entryNodes();
  if (entryNodes.includes(entryNodeName)) {
    entryNodes = [entryNodeName];
  }
  for (let i = 0; i < entryNodes.length; i++) {
    const outgoingNodes = graph.outgoingNodes(entryNodes[i]);
    for (let j = 0; j < outgoingNodes.length; j++) {
      const node = graph.getNode(outgoingNodes[j]);
      if (graph.incomingNodes(node.name).length === 1) {
        node.rank = 1;
      } else {
        node.rank = 2;
      }
    }
  }
}

module.exports = {
  longestPathRanking: longestPathRanking,
  normalizeRanks: normalizeRanks,
  forcePrimaryRankPromotions: forcePrimaryRankPromotions,
  forceSecondaryRankPromotions: forceSecondaryRankPromotions
};
