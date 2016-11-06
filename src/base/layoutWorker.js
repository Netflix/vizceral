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
/* eslint-env worker */
/* eslint no-restricted-syntax: 0 */
const JRLayouter = require('./jrlayouter/jrlayouter.js');

const Console = console;

self.jrlayouter = new JRLayouter();

self.layoutCache = {};
self.layoutElements = {
  nodes: {},
  edges: {}
};

self.customLayoutRings = function (nodes, edges, dimensions) {
  const baseLayout = self.jrlayouter.layout(nodes, edges, dimensions);

  const angleBetweenNodes = (Math.PI * 2) / nodes.length;
  const hw = dimensions.width * 0.5;
  const hh = dimensions.height * 0.5;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const metadataLayout = node.metadata && node.metadata.layout;
    let explicitPos;
    if (metadataLayout) {
      const posX = metadataLayout.positionX;
      const posY = metadataLayout.positionY;
      if (typeof posX === 'number' && isFinite(posX) && typeof posY === 'number' && isFinite(posY)) {
        explicitPos = { x: posX, y: posY };
      }
    }
    const pos = baseLayout[node.name];
    if (!pos) Console.error('Invalid nodename: ', node.name);
    else if (explicitPos) {
      pos.x = explicitPos.x;
      pos.y = explicitPos.y;
    } else {
      pos.x = Math.cos(i * angleBetweenNodes) * hw;
      pos.y = Math.sin(i * angleBetweenNodes) * hh;
    }
  }
  return baseLayout;
};

self.layout = function (options) {
  const graph = options.graph;
  const dimensions = options.dimensions;

  graph.nodes = graph.nodes.filter(node => node.visible);

  graph.edges = graph.edges.filter(edge => edge.visible);

  let key = graph.edges.map(edge => edge.source + edge.target).sort().toString();
  if (key === '') {
    key = `nodes: ${graph.nodes.map(node => node.name).sort().toString()}`;
  }
  let nodePositions;
  if (self.layoutCache[key]) {
    nodePositions = self.layoutCache[key];
  } else {
    nodePositions = self.customLayoutRings(graph.nodes, graph.edges, dimensions);

    self.layoutCache[key] = nodePositions;
  }
  self.postMessage(nodePositions);
  self.close();
};

self.addEventListener('message', (event) => {
  self.layout(event.data);
});
