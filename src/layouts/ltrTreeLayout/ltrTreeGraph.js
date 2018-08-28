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
/* eslint no-underscore-dangle: 0, no-restricted-syntax: 0 */
import {
  each, find, remove, without
} from 'lodash';

const Console = console;

function Graph (nodes, edges) {
  this.validateData(nodes, edges);


  this.nodes = nodes;
  this.edges = edges;

  this._entryNodeMap = this.nodes.reduce((val, node) => {
    val[node.name] = true;
    return val;
  }, {});
  this._incomingNodes = {};
  this._outgoingNodes = {};

  this._outgoingEdges = {};

  each(edges, (edge) => {
    // Add the connection to the incoming connections object
    this._incomingNodes[edge.target] = this._incomingNodes[edge.target] || {};
    this._incomingNodes[edge.target][edge.source] = true;

    // Add the connection to the outgoing connections object
    this._outgoingNodes[edge.source] = this._outgoingNodes[edge.source] || {};
    this._outgoingNodes[edge.source][edge.target] = true;

    // Add the edge to the outgoing edges map
    this._outgoingEdges[edge.source] = this._outgoingEdges[edge.source] || [];
    this._outgoingEdges[edge.source].push(edge);
  });

  // In the rare case of entry nodes that have circular connections, we need to make sure we do not remove
  // the node from the entry node list.
  each(this._incomingNodes, (targetNodes, sourceNodeName) => {
    const incomingNodeNames = Object.keys(targetNodes);
    const outgoingNodeNames = Object.keys(this._outgoingNodes[sourceNodeName] || {});
    const incomingWithoutOutgoing = without(incomingNodeNames, ...outgoingNodeNames);
    if (incomingWithoutOutgoing.length !== 0) {
      delete this._entryNodeMap[sourceNodeName];
    }
  });
}

Graph.prototype.validateData = function (nodes, edges) {
  const nodeMap = nodes.reduce((val, node) => {
    val[node.name] = node;
    return val;
  }, {});

  // Warn if connection connects to a node that doesnt exist
  for (let i = edges.length - 1; i >= 0; i--) {
    if (nodeMap[edges[i].source] === undefined) {
      Console.warn(`Attempted to layout a connection with non-existent source node: ${edges[i].source}.`);
      edges.splice(i, 1);
    } else {
      nodeMap[edges[i].source].connected = true;
    }
    if (nodeMap[edges[i].target] === undefined) {
      Console.warn(`Attempted to layout a connection with non-existent target node: ${edges[i].target}.`);
      edges.splice(i, 1);
    } else {
      nodeMap[edges[i].target].connected = true;
    }
  }

  if (nodes.length > 1) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (!nodeMap[nodes[i].name] || !nodeMap[nodes[i].name].connected) {
        nodes.splice(i, 1);
      }
    }
  }
};

Graph.prototype.outgoingNodes = function (nodeName) {
  if (this._outgoingNodes[nodeName] !== undefined) {
    return Object.keys(this._outgoingNodes[nodeName]);
  }
  return [];
};

Graph.prototype.incomingNodes = function (nodeName) {
  if (this._incomingNodes[nodeName] !== undefined) {
    return Object.keys(this._incomingNodes[nodeName]);
  }
  return [];
};

Graph.prototype.outgoingEdges = function (nodeName) {
  return this._outgoingEdges[nodeName] || [];
};

Graph.prototype.entryNodes = function () {
  if (this._entryNodeMap !== undefined) {
    return Object.keys(this._entryNodeMap);
  }
  return [];
};

Graph.prototype.buildGraph = function () {
  this.validateData();
};

Graph.prototype.removeEdge = function (edge) {
  delete this._outgoingNodes[edge.source][edge.target];
  delete this._incomingNodes[edge.target][edge.source];
  if (this._outgoingEdges[edge.source]) {
    remove(this._outgoingEdges[edge.source], anEdge => anEdge.source === edge.source && anEdge.target === edge.target);
  }
  remove(this.edges, anEdge => anEdge.source === edge.source && anEdge.target === edge.target);
};

Graph.prototype.addEdge = function (edge) {
  this._outgoingNodes[edge.source][edge.target] = true;
  this._incomingNodes[edge.target][edge.source] = true;
  this._outgoingEdges[edge.source] = this._outgoingEdges[edge.source] || [];
  this._outgoingEdges[edge.source].push(edge);
};

Graph.prototype.reverseEdge = function (edge) {
  this.removeEdge(edge);
  const oldSource = edge.source;
  edge.source = edge.target;
  edge.target = oldSource;
  edge.reversed = !edge.reversed;
  this.addEdge(edge);
};

Graph.prototype.removeSameEdges = function () {
  this.storedSameEdges = this.storedSameEdges || [];
  each(this.edges, (edge) => {
    if (edge && edge.source === edge.target) {
      this.storedSameEdges.push(edge);
      this.removeEdge(edge);
    }
  });
};

Graph.prototype.restoreSameEdges = function () {
  each(this.storedSameEdges, (edge) => {
    this.addEdge(edge);
  });
  this.storedSameEdges.length = 0;
};

Graph.prototype.getNode = function (nodeName) {
  return find(this.nodes, ['name', nodeName]);
};

module.exports = Graph;
