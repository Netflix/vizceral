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

function hasOwnPropF(o, p) {
  return Object.prototype.hasOwnProperty.call(o, p);
}
self.customLayoutFixed = function(nodes, edges, dimensions) {
  var right = {};
  var left = {};
  var remaining = {};
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    var nodeName = node.name;
    remaining[nodeName] = 1;
  }
  var array = [
    "jms/capAccountInquery",
    "jms/cimSecurityItems",
    "jms/cimOll",
    "jms/cimLoanPaymentInq"
  ];
  for (var nodeName in remaining) {
    if (!hasOwnPropF(remaining, nodeName)) {
      continue;
    }
    if (0 <= nodeName.lastIndexOf("jdbc/", 0) ||
        0 <= nodeName.lastIndexOf("jms/", 0)) {
      right[nodeName] = 1;
      delete remaining[nodeName];
    }
  }

  console.log("RIGHT", right);
  var baseLayout = self.jrlayouter.layout(nodes, edges, dimensions);
  baseLayout['UAM']
  return baseLayout;
};

self.customLayoutRings = function(nodes, edges, dimensions) {
  var baseLayout = self.jrlayouter.layout(nodes, edges, dimensions);

  var angleBetweenNodes = (Math.PI * 2) / nodes.length;
  var hw = dimensions.width * 0.5;
  var hh = dimensions.height * 0.5;
  for (var i = 0; i < nodes.length; i++) {
    var pos = baseLayout[nodes[i].name];
    if (!pos) console.error("Invalid nodename: " + nodes[i].name);
    else {
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
    if (1 === 1) {
        // run the layout
        nodePositions = self.customLayoutRings(graph.nodes, graph.edges, dimensions);
        // adjust the layout since our coordinates are center origin
        // const halfWidth = dimensions.width / 2;
        // const halfHeight = dimensions.height / 2;
        // let nodeName;
        // for (nodeName in nodePositions) {
        //   if ({}.hasOwnProperty.call(nodePositions, nodeName)) {
        //     nodePositions[nodeName].x -= halfWidth;
        //     nodePositions[nodeName].y -= halfHeight;
        //   }
        // }
        //
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

    }
    self.layoutCache[key] = nodePositions;
  }
  self.postMessage(nodePositions);
};

self.addEventListener('message', event => {
  self.layout(event.data);
});
