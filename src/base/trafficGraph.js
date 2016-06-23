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
import EventEmitter from 'events';
import TWEEN from 'tween.js';

import LayoutWorker from 'worker?inline!./layoutWorker';
import Notices from '../notices';
import TrafficGraphView from './trafficGraphView';

const Console = console; // Eliminate eslint warnings for non-debug console messages

class TrafficGraph extends EventEmitter {
  constructor (name, mainView, graphWidth, graphHeight, NodeClass, ConnectionClass, presetLayout) {
    super();
    this.name = name;
    this.mainView = mainView;
    this.nodes = {};
    this.connections = {};
    this.filters = {};
    this.NodeClass = NodeClass;
    this.ConnectionClass = ConnectionClass;
    this.volume = { max: 0, current: 0 };

    this.graphs = {};

    this.view = new TrafficGraphView(this);
    this.presetLayout = presetLayout;

    this.layoutDimensions = {
      width: graphWidth - 400,
      height: graphHeight - 45
    };

    this.displayOptions = {
      showLabels: true
    };

    this.layoutWorker = LayoutWorker();
    this.layoutWorker.onmessage = event => {
      Console.info(`Layout: Received updated layout for ${this.name} from the worker.`);
      this._updatePositions(event.data);
      this.updateView();
    };

    this.nodeCounts = { total: 0, visible: 0 };

    this.hasPositionData = false;
    this.loadedOnce = false;
  }

  emitRendered () {
    this.emit('rendered', { name: this.name, rendered: this.view.rendered && this.hasPositionData });
  }

  updateView () {
    if (this.current && this.hasPositionData) {
      this.view.updateState();
      this.emitRendered();
    }
  }

  setCurrent (current) {
    if (this.current !== current) {
      this.current = current;
      if (current) {
        this.loadedOnce = true;
        this.updateView();
        this.emitNodeUpdated();
      } else {
        _.each(this.connections, connection => connection.cleanup());
        _.each(this.nodes, node => node.cleanup());
      }
    }
  }

  getNode (nodeName) {
    // Check if the node exists by direct name first
    if (this.nodes[nodeName]) { return this.nodes[nodeName]; }

    // Then check by exact matching cluster name
    const nodes = _.filter(this.nodes, node => _.includes(node.clusters, nodeName));
    return nodes[0] || this.nodes[nodeName];
  }

  highlightMatchedNodes (searchString) {
    const dimDefault = !!searchString;
    const dimNodes = _.transform(this.nodes, (result, node) => {
      if (node.isVisible()) {
        result[node.getName()] = dimDefault;
      }
    });

    const dimConnections = _.transform(this.connections, (result, connection) => {
      if (connection.isVisible()) {
        result[connection.getName()] = dimDefault;
      }
    });

    const matches = {
      total: -1,
      visible: -1
    };

    if (searchString) {
      matches.total = 0;
      matches.visible = 0;

      let targetString;
      const nodes = _.filter(this.nodes, node => {
        targetString = node.getName();
        if (node.clusters) {
          targetString += `::${node.clusters.join('::')}`;
        }
        const match = (node === this.highlightedNode || targetString.indexOf(searchString) !== -1);
        if (match && !node.hidden) {
          matches.total++;
          if (node.isVisible()) {
            matches.visible++;
          }
        }
        return match;
      });

      _.each(nodes, node => {
        dimNodes[node.getName()] = false;
      });
    }

    this._applyDimming(dimNodes, dimConnections, dimDefault);

    return matches;
  }

  highlightNode (nodeToHighlight) {
    this.highlightedNode = nodeToHighlight;
    this.highlightConnectedNodes(nodeToHighlight);
    const nodeName = nodeToHighlight ? nodeToHighlight.getName() : undefined;
    _.each(this.nodes, node => {
      node.getView().setHighlight(nodeName === node.getName());
    });
    this.emit('nodeHighlighted', nodeToHighlight);
  }

  showLabels (showLabels) {
    this.displayOptions.showLabels = showLabels;
    // Show labels
    _.each(this.nodes, node => node.showLabel(showLabels));
    if (this.view) { this.view.invalidateInteractiveChildren(); }
  }

  getConnection (sourceName, targetName) {
    return this.connections[`${sourceName}--${targetName}`];
  }

  setIntersectedObject (object) {
    let changed = false;
    // De-intersect any objects
    if (object === undefined) {
      this.intersectedObject = undefined;
      changed = true;
    }
    // Check if we intersected with a loaded node
    if (object instanceof this.NodeClass && object.loaded === true) {
      this.intersectedObject = object;
      changed = true;
    }
    // Check if we intersected with a Connection that has a notice
    if (object instanceof this.ConnectionClass) {
      this.intersectedObject = object;
      changed = true;
    }

    if (this.intersectedObject && this.intersectedObject.hasNotices()) {
      this.intersectedObject.showNotices();
    } else {
      Notices.hideNotices();
    }

    return changed;
  }

  getIntersectedObject () {
    return this.intersectedObject;
  }

  update (time) {
    _.each(this.connections, connection => {
      if (connection.isVisible()) { connection.getView().update(time); }
    });
    _.each(this.nodes, node => {
      if (node.isVisible()) { node.getView().update(); }
    });
  }

  isPopulated () {
    return this.nodeCounts.total > 0;
  }

  setState (state) {
    if (state && Object.keys(state).length > 0) {
      let layoutModified = false;

      // first, remove nodes that aren't in the new state
      const newStateNodes = _.reduce(state.nodes, (result, node) => {
        result[node.name] = true;
        return result;
      }, {});
      _.each(this.nodes, (node, nodeName) => {
        if (!newStateNodes[nodeName]) {
          this.removeNode(node);
          layoutModified = true;
        }
      });

      const stateNodeMap = {};
      // Then create new nodes and update existing nodes. New nodes need to be
      // created before connections are attempted to be created between nodes.
      _.each(state.nodes, (stateNode, index) => {
        stateNodeMap[stateNode.name] = true;
        let node = this.nodes[stateNode.name];
        if (!node) {
          node = new this.NodeClass(stateNode, { showLabel: this.displayOptions.showLabels });
          node.hidden = this.node && !this.nodes[this.node].connectedTo(node.getName());
          node.updatePosition(stateNode.position, index);
          this.nodes[stateNode.name] = node;
          layoutModified = true;
        } else {
          node.updatePosition(stateNode.position, index);
          node.update(stateNode);
        }
      });

      // Then, update all the connections.
      _.each(this.connections, connection => {
        connection.valid = false;
      });

      let receivedConnections = 0;
      _.each(state.connections, stateConnection => {
        receivedConnections++;
        let connection = this.getConnection(stateConnection.source, stateConnection.target);
        if (connection) {
          connection.update(stateConnection);
          connection.valid = true;
        } else {
          connection = this._buildConnection(stateConnection);
          if (connection) {
            connection.valid = true;
            connection.hidden = this.node && !connection.connectedTo(this.node);
            if (!connection.hidden) {
              connection.source.hidden = false;
              connection.target.hidden = false;
            }
            this.connections[connection.getName()] = connection;
            layoutModified = true;
          }
        }
      });

      // Check for updated max incoming rps
      if (state.maxVolume && this.volume.max !== state.maxVolume) {
        this.volume.max = state.maxVolume;
      }

      // Check for updated current incoming rps
      const currentRPS = this.nodes.INTERNET ? this.nodes.INTERNET.getOutgoingVolume() : 0;
      if (currentRPS !== undefined && this.volume.current !== currentRPS) {
        this.volume.current = currentRPS;
      }

      // Remove all connections that aren't valid anymore and update the
      // greatest volume of the existing connections
      _.each(this.connections, connection => {
        if (!connection.valid) {
          this.removeConnection(connection);
          layoutModified = true;
        } else {
          connection.updateGreatestVolume(this.volume.max);
        }
      });

      _.each(this.nodes, node => {
        if (!stateNodeMap[node.name] && !node.hold) {
          // Remove all the nodes that are not in new state
          this.removeNode(node);
          layoutModified = true;
        } else {
          // Update the data on all the existing nodes
          node.updateRPS(this.volume.current);
        }
      });

      if (this.view) {
        this.view.invalidateInteractiveChildren();
      }

      // If new elements (nodes or connections) were created or elements were
      // removed, the graph needs to be laid out again
      if (layoutModified) {
        this._updateFilteredElements();
      }
    }
    this.emitNodeUpdated();
  }

  emitNodeUpdated () {
    if (this.highlightedNode) {
      this.emit('nodeHighlighted', this.highlightedNode);
    } else if (this.getSelectedNode && this.getSelectedNode()) {
      this.emit('nodeUpdated', this.getSelectedNode());
    }
  }

  isEmpty () {
    return Object.keys(this.nodes).length === 0 || Object.keys(this.connections).length === 0;
  }

  /* ***** LOCAL FUNCTIONS *****/

  _updatePositions (nodePositions) {
    // loop through all the position maps to set position on the nodes
    _.each(nodePositions, (nodePosition, nodeName) => {
      if (this.nodes[nodeName]) {
        this.nodes[nodeName].updatePosition(nodePosition);
      } else {
        Console.warn(`Got a position for a node that does not exist: ${nodeName}`);
      }
    });
    this.hasPositionData = true;
  }

  _buildConnection (connectionData) {
    let source;
    let target;
    // Check the source node exists and replace the string index with the instance reference
    if (connectionData.source && connectionData.target) {
      if (this.nodes.hasOwnProperty(connectionData.source)) {
        source = this.nodes[connectionData.source];
      } else {
        Console.warn(`Attempted to create a connection to target node '${connectionData.target}' with a source node that does not yet exist: '${connectionData.source}'`);
      }

      // Check the target node exists and replace the string index with the instance reference
      if (this.nodes.hasOwnProperty(connectionData.target)) {
        target = this.nodes[connectionData.target];
      } else {
        Console.warn(`Attempted to create a connection from source node '${connectionData.source}' with a target node that does not yet exist: '${connectionData.target}'`);
      }
      if (source && target) {
        return new this.ConnectionClass({ source: source, target: target, data: connectionData });
      }
    } else {
      Console.warn(`Attempted to create a connection with a missing source (${connectionData.source}) and/or target (${connectionData.target})`);
    }
    return undefined;
  }

  highlightConnectedNodes (selectedObject) {
    const dimDefault = !!selectedObject;
    const dimNodes = _.transform(this.nodes, (result, node) => {
      if (node.isVisible()) {
        result[node.getName()] = dimDefault;
      }
    });

    const dimConnections = _.transform(this.connections, (result, connection) => {
      if (connection.isVisible()) {
        result[connection.getName()] = dimDefault;
      }
    });

    if (selectedObject instanceof this.NodeClass) {
      // Highlight the selected node
      dimNodes[selectedObject.getName()] = false;

      // Highlight incoming connections
      _.each(selectedObject.incomingConnections, incomingConnection => {
        if (!incomingConnection.filtered) {
          dimNodes[incomingConnection.source.getName()] = false;
          dimConnections[incomingConnection.getName()] = false;
        }
      });

      // Highlight outgoing connections
      _.each(selectedObject.outgoingConnections, outgoingConnection => {
        if (!outgoingConnection.filtered) {
          dimNodes[outgoingConnection.target.getName()] = false;
          dimConnections[outgoingConnection.getName()] = false;
        }
      });
    } else if (selectedObject instanceof this.ConnectionClass) {
      // Highlight source and target nodes of the connection
      dimNodes[selectedObject.source.getName()] = false;
      dimNodes[selectedObject.target.getName()] = false;
      dimConnections[selectedObject.getName()] = false;
    }

    this._applyDimming(dimNodes, dimConnections, !!selectedObject);
  }

  removeNode (node) {
    // remove the node from the view
    this.view.removeObject(node);
    // remove the node from the map of nodes
    delete this.nodes[node.getName()];
  }

  removeConnection (connection) {
    // remove the node from the view
    this.view.removeObject(connection);
    // remove the node from the map of nodes
    delete this.connections[connection.getName()];
    // remove the connections from the source and target nodes
    connection.source.removeOutgoingConnection(connection);
    connection.target.removeIncomingConnection(connection);
  }

  setFilters () {
    // noop
  }

  /**
   * Update the connection filters with the passed in filter configuration.
   * All connections in this graph will be passed through the updated filters.
   * If any connection filter status is changed, will also recursively call
   * _updateNodeFilters(filters) to eliminate the any orphaned nodes or
   * connections to nowhere.
   *
   * @param  {object} filters - An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    DATAFORMATS.md
   */
  _updateConnectionFilters (filters) {
    let changed = false;
    _.each(this.connections, connection => {
      connection.defaultFiltered = !_.every(filters.connection, filter => filter.passes(connection, filter.defaultValue));
      const filtered = (!connection.source.isVisible() && !connection.target.isVisible()) || !_.every(filters.connection, filter => filter.passes(connection, filter.value));
      if (connection.filtered !== filtered) {
        connection.filtered = filtered;
        changed = true;
      }
    });
    if (changed) { this._updateNodeFilters(filters); }
  }

  /**
   * Update the node filters with the passed in filter configuration.
   * All nodes in this graph will be passed through the updated filters.
   * If any node filter status is changed, will also recursively call
   * _updateConnectionFilters(filters) to eliminate the any connections to
   * nowhere or orphaned nodes.
   *
   * @param  {object} filters - An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    DATAFORMATS.md
   */
  _updateNodeFilters (filters) {
    let changed = false;
    _.each(this.nodes, node => {
      node.defaultFiltered = !node.hasDefaultVisibleConnections() || !_.every(filters.node, filter => filter.passes(node, filter.defaultValue));
      const filtered = !node.focused && (!node.hasVisibleConnections() || !_.every(filters.node, filter => filter.passes(node, filter.value)));
      if (node.filtered !== filtered) {
        node.filtered = filtered;
        changed = true;
      }
      if (!node.isVisible()) {
        _.each(node.incomingConnections, c => { c.hidden = true; });
        _.each(node.outgoingConnections, c => { c.hidden = true; });
      }
    });
    if (changed) { this._updateConnectionFilters(filters); }
  }

  _updateFilteredElements () {
    const graph = { nodes: [], edges: [] };

    let totalNodes = 0;
    let visibleNodes = 0;

    // Go through all the filters and separate the node and connection filters
    const filters = { connection: [], node: [] };
    _.each(this.filters, filter => {
      if (filter.type === 'connection') {
        filters.connection.push(filter);
      } else if (filter.type === 'node') {
        filters.node.push(filter);
      }
    });

    // If we are focused on a node, hide nodes that aren't related and force related nodes TO be shown.
    const defaultHidden = this.nodeName !== undefined;
    _.each(this.connections, connection => { connection.hidden = defaultHidden; });
    _.each(this.nodes, node => { node.hidden = defaultHidden; });
    if (defaultHidden) {
      this.nodes[this.nodeName].hidden = false;

      // Show all the incoming connections and the source nodes
      _.each(this.nodes[this.nodeName].incomingConnections, connection => {
        connection.hidden = false;
        connection.source.hidden = false;
      });

      // Show all the outgoing connections and the target nodes
      _.each(this.nodes[this.nodeName].outgoingConnections, connection => {
        connection.hidden = false;
        connection.target.hidden = false;
      });
    }

    _.each(this.nodes, n => { n.filtered = false; });
    _.each(this.connections, c => { c.filtered = false; });
    this._updateConnectionFilters(filters);
    this._updateNodeFilters(filters);

    const subsetOfDefaultVisibleNodes = _.every(this.nodes, n => !n.isVisible() || (n.isVisible() && !n.defaultFiltered));
    const subsetOfDefaultVisibleConnections = _.every(this.connections, c => !c.isVisible() || (c.isVisible() && !c.defaultFiltered));
    const useInLayout = o => ((!this.nodeName && subsetOfDefaultVisibleNodes && subsetOfDefaultVisibleConnections) ? !o.defaultFiltered : o.isVisible());

    // build the layout graph
    _.each(this.connections, connection => {
      graph.edges.push({ visible: useInLayout(connection), source: connection.source.getName(), target: connection.target.getName() });
    });
    _.each(this.nodes, node => {
      graph.nodes.push({ name: node.getName(), visible: useInLayout(node), position: node.position, weight: node.depth });
      if (node.connected) {
        if (!node.hidden) { totalNodes++; }
        if (node.isVisible()) { visibleNodes++; }
      }
    });

    this.nodeCounts.total = totalNodes;
    this.nodeCounts.visible = visibleNodes;

    this._relayout(graph);
  }

  _applyDimming (dimNodes, dimConnections, dimmingApplied) {
    let changed;
    let view;
    const dimChanged = [];
    _.each(dimNodes, (dimmed, nodeName) => {
      if (this.nodes.hasOwnProperty(nodeName)) {
        if (this.nodes[nodeName].view) {
          view = this.nodes[nodeName].getView();
          changed = view.setDimmed(dimmed, dimmingApplied);
          if (changed) { dimChanged.push(view); }
        }
      }
    });

    _.each(dimConnections, (dimmed, connectionName) => {
      if (this.connections.hasOwnProperty(connectionName)) {
        if (this.connections[connectionName].view) {
          view = this.connections[connectionName].getView();
          changed = view.setDimmed(dimmed, dimmingApplied);
          if (changed) { dimChanged.push(view); }
        }
      }
    });

    // Run the animations
    new TWEEN.Tween({ percent: 0 })
              .to({ percent: 1 }, 150)
              .easing(TWEEN.Easing.Cubic.In)
              .onUpdate(function () {
                const inverse = 1 - this.percent;
                _.each(dimChanged, v => {
                  v.setDimPercent(v.dimmed ? this.percent : inverse);
                });
              })
              .start();
  }

  _relayout (graph) {
    if (!this.presetLayout) {
      if (Object.keys(graph.nodes).length > 0 && Object.keys(graph.edges).length > 0) {
        Console.info(`Layout: Updating the layout for ${this.name} with the worker...`);
        this.layoutWorker.postMessage({ graph: graph, dimensions: this.layoutDimensions });
      } else {
        Console.warn(`Layout: Attempted to update the layout for ${this.name} but there are zero nodes and/or zero connections.`);
      }
    } else {
      this.hasPositionData = true;
      if (this.current) {
        this.updateView();
      }
    }
  }
}

export default TrafficGraph;
