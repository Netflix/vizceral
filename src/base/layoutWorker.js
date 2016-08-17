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

self.jrlayouter = new JRLayouter();

self.layoutCache = {};
self.layoutElements = {
  nodes: {},
  edges: {}
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
    // run the layout
    nodePositions = self.jrlayouter.layout(graph.nodes, graph.edges, dimensions);

    // adjust the layout since our coordinates are center origin
    const halfWidth = dimensions.width / 2;
    const halfHeight = dimensions.height / 2;
    let nodeName;
    for (nodeName in nodePositions) {
      if ({}.hasOwnProperty.call(nodePositions, nodeName)) {
        nodePositions[nodeName].x -= halfWidth;
        nodePositions[nodeName].y -= halfHeight;
      }
    }

    self.layoutCache[key] = nodePositions;
  }

  self.postMessage(nodePositions);
};

self.addEventListener('message', event => {
  self.layout(event.data);
});
