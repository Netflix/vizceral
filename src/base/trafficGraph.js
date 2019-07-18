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
  clone, each, every, filter, includes, reduce, sumBy, transform
} from 'lodash';
import EventEmitter from 'events';
import TWEEN from '@tweenjs/tween.js';
import ParticleSystem from '../physics/particleSystem';
import Notices from '../notices';
import TrafficGraphView from './trafficGraphView';

const Console = console; // Eliminate eslint warnings for non-debug console messages

const hasOwnPropF = Object.prototype.hasOwnProperty;

function getPerformanceNow () {
  const g = window;
  if (g != null) {
    const perf = g.performance;
    if (perf != null) {
      try {
        const perfNow = perf.now();
        if (typeof perfNow === 'number') {
          return perfNow;
        }
      } catch (e) {
        Console.error('performance.now() seems unavailable :', e);
      }
    }
  }
  return null;
}

class TrafficGraph extends EventEmitter {
  constructor (name, mainView, parentGraph, graphWidth, graphHeight, NodeClass, ConnectionClass, Layout, entryNode) {
    super();
    this.type = 'default';
    this.name = name;
    this.mainView = mainView;
    this.parentGraph = parentGraph;
    this.entryNode = entryNode;
    this.nodes = {};
    this.connections = {};
    this.filters = {};
    this.NodeClass = NodeClass;
    this.ConnectionClass = ConnectionClass;
    this.volume = { max: 0, current: 0 };

    this.layout = new Layout();

    if (parentGraph) {
      this.graphIndex = parentGraph.graphIndex.slice();
      this.graphIndex.push(name);
    } else {
      this.graphIndex = [];
    }

    this.graphs = {};

    this.view = new TrafficGraphView(this);

    this._particleSystem_isEnabled = false;
    this._particleSystem = new ParticleSystem(this, graphWidth, graphHeight, this._particleSystem_isEnabled);

    this.layoutDimensions = {
      width: graphWidth - 400,
      height: graphHeight - 45
    };

    this.displayOptions = {
      showLabels: true
    };

    this.nodeCounts = { total: 0, visible: 0 };

    this.hasPositionData = false;
    this.loadedOnce = false;
  }

  onAsyncLayoutBegin () {
  }

  onAsyncLayoutCompleted () {
  }

  /**
   * If the graph is the currently viewed graph, update the state of the view, apply the search
   * string, and make sure to highlight any node that is supposed to be highlighted. Emit that
   * rendering has been updated.
   */
  updateView () {
    if (this.current && this.hasPositionData) {
      // First, update the state of the view, hiding and showing any necessary nodes or connections
      this.view.updateState();
      // Re-apply highlighting to the graph in case there are new nodes or connections
      if (this.searchString) { this.highlightMatchedNodes(this.searchString); }
      if (this.highlightedObject) { this.highlightObject(this.highlightedObject, true); }
      // Emit a viewUpdated event so any coordinating UI can update accordingly
      this.emit('viewUpdated');
    }
  }

  /**
   * Set whether this graph is the currently displayed graph or not.
   * This is important to call for the newly current graph so that it can update properly,
   * and important to call for the previous graph so we can cleanup any renderers that we
   * don't need to keep around
   *
   * @param {boolean} current Whether to set this graph as current or not
   */
  setCurrent (current) {
    if (this.current !== current) {
      this.current = current;
      if (current) {
        this.loadedOnce = true;
        this.validateState();
        this.validateLayout();
        this.emitObjectUpdated();
      } else {
        each(this.connections, connection => connection.cleanup());
        each(this.nodes, node => node.cleanup());
      }
      this._particleSystem.setLastUpdateTime(getPerformanceNow());
      this.updateIsParticleSystemEnabled();
    }
  }

  computeShouldParticleSystemBeEnabled () {
    return this._particleSystem_isEnabled && !!this.current;
  }

  updateIsParticleSystemEnabled () {
    if (this.computeShouldParticleSystemBeEnabled()) {
      this._particleSystem.enable();
    } else {
      this._particleSystem.disable();
    }
  }

  /**
   * Get a node object by name. Also will match on sub-node names if no match found in the
   * top-level graph.
   *
   * @param {string} nodeName the name of the node to get
   * @returns {object} The node object that matches on nodeName, otherwise undefined
   */
  getNode (nodeName) {
    // First, make sure the state is up to date...
    this.validateState();

    // Check if the node exists by direct name first
    if (this.nodes[nodeName]) { return this.nodes[nodeName]; }

    // Then check by exact matching sub node name
    const nodes = filter(this.nodes, (node) => {
      if (node.nodes) {
        return includes(node.nodes.map(n => n.name), nodeName);
      }
      return false;
    });
    return nodes[0];
  }

  /**
   * Get a connection object by name.
   *
   * @param {string} connectionName the name of the connection to get
   * @returns {object} The connection object that matches on connectionName, otherwise undefined
   */
  getConnection (connectionName) {
    return this.connections[connectionName];
  }

  /**
   * Get a graph object, node or connection, by name.
   *
   * @param {string} objectName the name of the node or connection to get
   * @returns {object} The node or connection object that matches on objectName, otherwise undefined
   */
  getGraphObject (objectName) {
    return this.getNode(objectName) || this.getConnection(objectName);
  }

  /**
   * Highlight nodes that match the passed in searchString.
   * Also will match on sub-node names if no match found in the top-level graph.
   *
   * @param {string} searchString The string to match.
   * @returns {{total: number, visible: number}} The total matches and the matches that are visible
   */
  highlightMatchedNodes (searchString) {
    this.searchString = searchString;
    const dimDefault = !!searchString;
    const dimNodes = transform(this.nodes, (result, node) => {
      if (node.isVisible()) {
        result[node.getName()] = dimDefault;
      }
    });

    const dimConnections = transform(this.connections, (result, connection) => {
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

      const nodes = filter(this.nodes, (node) => {
        const matchTargets = [node.getName()];
        if (node.displayName) { matchTargets.push(node.displayName); }

        // Allow to filter results based on services' owner/team defined on metadata object.
        if (node.metadata && node.metadata.owner) { matchTargets.push(node.metadata.owner); }

        if (node.nodes) { Array.prototype.push.apply(matchTargets, node.nodes.map(n => n.name)); }

        const match = (node === this.highlightedObject || matchTargets.join().toLowerCase().indexOf(searchString.toLowerCase()) !== -1);
        if (match) {
          matches.total++;
          if (node.isVisible()) {
            matches.visible++;
          }
        }
        return match;
      });

      each(nodes, (node) => {
        dimNodes[node.getName()] = false;
      });
    }

    this._applyDimming(dimNodes, dimConnections, dimDefault);

    return matches;
  }

  /**
   * Highlight an object (node or connection) on the graph.
   *
   * @param {object} objectToHighlight The graph object to attempt to highlight
   * @param {boolean} force Force an update of the highlighted node, even if it is already highlighted
   */
  highlightObject (objectToHighlight, force) {
    if (this.highlightedObject !== objectToHighlight || force) {
      // clear search string
      this.searchString = '';
      this.highlightedObject = objectToHighlight;
      this.highlightConnectedNodes(objectToHighlight);
      const nodeName = objectToHighlight ? objectToHighlight instanceof this.NodeClass && objectToHighlight.getName() : undefined;
      each(this.nodes, (node) => {
        node.getView().setHighlight(nodeName === node.getName());
      });
      const connectionName = objectToHighlight ? objectToHighlight instanceof this.ConnectionClass && objectToHighlight.getName() : undefined;
      each(this.connections, (connection) => {
        connection.getView().setHighlight(connectionName === connection.getName());
      });

      this.emit('objectHighlighted', objectToHighlight);
    }
  }

  handleIntersectedObjectClick () {

  }

  handleIntersectedObjectDoubleClick () {
    const graphIndex = this.graphIndex.slice(0);
    graphIndex.push(this.intersectedObject.getName());
    this.emit('setView', graphIndex);
  }

  showLabels (showLabels) {
    this.displayOptions.showLabels = showLabels;
    // Show labels
    each(this.nodes, node => node.showLabel(showLabels));
    if (this.view) { this.view.invalidateInteractiveChildren(); }
  }

  setModes (modes) {
    each(this.nodes, node => node.setModes(modes));
    if (this.view) { this.view.invalidateInteractiveChildren(); }
  }

  setContext (context) {
    each(this.nodes, node => node.setContext(context));
  }

  setIntersectedObject (object) {
    let changed = false;
    // De-intersect any objects
    if (object === undefined && this.intersectedObject) {
      this.intersectedObject = undefined;
      changed = true;
    }
    // Check if we intersected with a loaded node
    if (object instanceof this.NodeClass && object.loaded === true) {
      this.intersectedObject = object;
      changed = true;
    }
    // Check if we intersected with a Connection
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
    each(this.connections, (connection) => {
      if (connection.isVisible()) { connection.getView().update(time); }
    });
    each(this.nodes, (node) => {
      if (node.isVisible()) { node.getView().update(); }
    });
    this._particleSystem.update(time);
  }

  isPopulated () {
    return this.nodeCounts.total > 0;
  }

  /**
   * Return array of entry nodes,
   * if entryNode in graph specified we return based on that,
   * else list of nodes that have no incoming connections
   *
   * @returns {array} array of entry nodes
   */
  getEntryNodes () {
    return filter(this.nodes, n => n.isEntryNode());
  }

  /**
   * Validate the current state.  If setState(state) was called while this graph was not current,
   * all calculations were deferred. This makes sure that the current view is up to date with the
   * most current state.
   */
  validateState () {
    if (this.cachedStates) {
      this.setState(this.cachedStates.self, true, this.cachedStates.parent);
      this.cachedStates = undefined;
    }
  }

  manipulateState () {
    // no-op
  }

  setState (state, force, parentState) {
    let updatedState = false;
    if (state && Object.keys(state).length > 0) {
      // it's important to update entryNode when we're switching views
      this.entryNode = state.entryNode;
      // If this is the first update, run it, otherwise, only update if it's the current graph
      if (this.current || force) {
        // first, remove nodes that aren't in the new state
        const newStateNodes = reduce(state.nodes, (result, node) => {
          result[node.name] = true;
          return result;
        }, {});
        const nodesToRemove = [];
        each(this.nodes, (node, nodeName) => {
          if (!newStateNodes[nodeName]) { nodesToRemove.push(node); }
        });
        if (nodesToRemove.length > 0) {
          nodesToRemove.forEach(node => this.removeNode(node));
          this.layoutValid = false;
        }

        const stateNodeMap = {};
        // Then create new nodes and update existing nodes. New nodes need to be
        // created before connections are attempted to be created between nodes.
        each(state.nodes, (stateNode, index) => {
          stateNodeMap[stateNode.name] = true;
          let node = this.nodes[stateNode.name];
          if (!node) {
            node = new this.NodeClass(stateNode, this.entryNode);
            node.updatePosition(stateNode.position, index);
            this.nodes[stateNode.name] = node;
            this.layoutValid = false;
          } else {
            node.updatePosition(stateNode.position, index);
            node.update(stateNode);
          }
        });

        // Set all conenctions as false until the connection is found or created
        each(this.connections, (connection) => {
          connection.valid = false;
        });

        // Update all the existing connections and create new ones
        each(state.connections, (stateConnection) => {
          let connection = this.getConnection(`${stateConnection.source}--${stateConnection.target}`);
          if (connection) {
            connection.update(stateConnection);
            connection.valid = true;
          } else {
            connection = this._buildConnection(stateConnection);
            if (connection) {
              connection.valid = true;
              this.connections[connection.getName()] = connection;
              this.layoutValid = false;
            }
          }
        });

        // Check for updated max volume
        let maxVolume = null;
        if (hasOwnPropF.call(state, 'maxVolume')) {
          ({ maxVolume } = state);
          if (typeof maxVolume === 'number' && maxVolume > -1 && maxVolume < 1 / 0) {
            this.volume.max = state.maxVolume;
          } else {
            maxVolume = null;
          }
        }
        if (maxVolume === null) {
          Console.error(`maxVolume is missing or invalid (${state.maxVolume}), but it is required to calculate relative particle density. See https://github.com/Netflix/Vizceral/wiki/How-to-Use#graph-data-format`);
        }

        // Check for updated current volume
        const currentVolume = sumBy(this.getEntryNodes(), n => n.getOutgoingVolume());
        if (currentVolume !== undefined && this.volume.current !== currentVolume) {
          this.volume.current = currentVolume;
        }

        // Remove all connections that aren't valid anymore and update the
        // greatest volume of the existing connections
        const connectionsToRemove = [];
        each(this.connections, (connection) => {
          if (!connection.valid) {
            connectionsToRemove.push(connection);
          } else {
            connection.updateGreatestVolume(this.volume.max);
          }
        });
        if (connectionsToRemove.length > 0) {
          connectionsToRemove.forEach(connection => this.removeConnection(connection));
          this.layoutValid = false;
        }

        const nodesToRemoveSecondPass = [];
        each(this.nodes, (node) => {
          if (!stateNodeMap[node.name] && !node.hold) {
            // Remove all the nodes that are not in new state
            nodesToRemoveSecondPass.push(node);
          } else {
            // Update the data on all the existing nodes
            node.updateVolume(this.volume.current);
          }
        });
        if (nodesToRemoveSecondPass.length > 0) {
          nodesToRemoveSecondPass.forEach(node => this.removeNode(node));
          this.layoutValid = false;
        }

        // Invalidate all the interactive children so we do not interact with objects that no longer exist
        if (this.view) {
          this.view.invalidateInteractiveChildren();
        }

        this.emitObjectUpdated();
        updatedState = true;
      } else {
        this.cachedStates = { self: state, parent: parentState };
      }
      this._particleSystem.onTrafficGraphChanged();
    }

    return updatedState;
  }

  validateLayout () {
    if (this.current) {
      if (!this.layoutValid) {
        this._relayout();
        this.layoutValid = true;
      } else {
        this.updateView();
      }
    }
  }

  emitObjectUpdated () {
    if (this.highlightedObject) {
      this.emit('objectHighlighted', this.highlightedObject);
    }
  }

  isEmpty () {
    return Object.keys(this.nodes).length === 0 || Object.keys(this.connections).length === 0;
  }

  /* ***** LOCAL FUNCTIONS **** */

  _buildConnection (connectionData) {
    let source;
    let target;
    // Check the source node exists and replace the string index with the instance reference
    if (connectionData.source && connectionData.target) {
      if (this.nodes[connectionData.source]) {
        source = this.nodes[connectionData.source];
      } else {
        Console.warn(`Attempted to create a connection to target node '${connectionData.target}' with a source node that does not yet exist: '${connectionData.source}'`);
      }

      // Check the target node exists and replace the string index with the instance reference
      if (this.nodes[connectionData.target]) {
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
    const dimNodes = transform(this.nodes, (result, node) => {
      if (node.isVisible()) {
        result[node.getName()] = dimDefault;
      }
    });

    const dimConnections = transform(this.connections, (result, connection) => {
      if (connection.isVisible()) {
        result[connection.getName()] = dimDefault;
      }
    });

    if (selectedObject instanceof this.NodeClass) {
      // Highlight the selected node
      dimNodes[selectedObject.getName()] = false;

      // Highlight incoming connections
      each(selectedObject.incomingConnections, (incomingConnection) => {
        if (!incomingConnection.filtered) {
          dimNodes[incomingConnection.source.getName()] = false;
          dimConnections[incomingConnection.getName()] = false;
        }
      });

      // Highlight outgoing connections
      each(selectedObject.outgoingConnections, (outgoingConnection) => {
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

  setFilters (filters) {
    let filtersChanged = false;
    each(filters, (f) => {
      if (!this.filters[f.name]) {
        this.filters[f.name] = f;
        filtersChanged = true;
      }
      if (f.value !== this.filters[f.name].value) {
        this.filters[f.name].value = f.value;
        filtersChanged = true;
      }
      if (this.filters[f.name].defaultValue === undefined) {
        this.filters[f.name].defaultValue = this.filters[f.name].value;
        filtersChanged = true;
      }
    });

    if (this.isPopulated() && filtersChanged) {
      this._relayout();
    }
  }

  /**
   * Update the connection filters with the passed in filter configuration.
   * All connections in this graph will be passed through the updated filters.
   * If any connection filter status is changed, will also recursively call
   * _updateNodeFilters(filters) to eliminate the any orphaned nodes or
   * connections to nowhere.
   *
   * @param  {object} filters An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    https://github.com/Netflix/Vizceral/wiki/How-to-Use#graph-data-format
   */
  _updateConnectionFilters (filters) {
    let changed = false;
    each(this.connections, (connection) => {
      connection.defaultFiltered = !every(filters.connection, f => f.passes(connection, f.defaultValue));
      const filtered = (!connection.source.isVisible() && !connection.target.isVisible()) || !every(filters.connection, f => f.passes(connection, f.value));
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
   * @param  {object} filters An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    https://github.com/Netflix/Vizceral/wiki/Configuration#filters
   */
  _updateNodeFilters (filters) {
    let changed = false;
    each(this.nodes, (node) => {
      node.defaultFiltered = !node.hasDefaultVisibleConnections() || !every(filters.node, f => f.passes(node, f.defaultValue));
      const filtered = !node.focused && (!node.hasVisibleConnections() || !every(filters.node, f => f.passes(node, f.value)));
      if (node.filtered !== filtered) {
        node.filtered = filtered;
        changed = true;
      }
      if (!node.isVisible()) {
        each(node.incomingConnections, (c) => { c.filtered = true; });
        each(node.outgoingConnections, (c) => { c.filtered = true; });
      }
    });
    if (changed) { this._updateConnectionFilters(filters); }
  }

  _applyDimming (dimNodes, dimConnections, dimmingApplied) {
    let changed;
    let view;
    const dimChanged = [];
    each(dimNodes, (dimmed, nodeName) => {
      if (this.nodes[nodeName] && this.nodes[nodeName].isVisible()) {
        view = this.nodes[nodeName].getView();
        changed = view.setDimmed(dimmed, dimmingApplied);
        if (changed) { dimChanged.push(view); }
      }
    });

    each(dimConnections, (dimmed, connectionName) => {
      if (this.connections[connectionName] && this.connections[connectionName].isVisible()) {
        view = this.connections[connectionName].getView();
        changed = view.setDimmed(dimmed, dimmingApplied);
        if (changed) { dimChanged.push(view); }
      }
    });

    // Run the animations
    new TWEEN.Tween({ percent: 0 })
      .to({ percent: 1 }, 150)
      .easing(TWEEN.Easing.Cubic.In)
      .onUpdate(function () {
        const inverse = 1 - this.percent;
        each(dimChanged, (v) => {
          v.setDimPercent(v.dimmed ? this.percent : inverse);
        });
      })
      .start();
  }


  getPhysicsOptions () {
    const o = this._particleSystem.getOptions();
    o.isEnabled = this._particleSystem_isEnabled;
    return o;
  }

  setPhysicsOptions (options) {
    let flag = false;
    if (hasOwnPropF.call(options, 'isEnabled')) {
      let { isEnabled } = options;
      options = clone(options);
      delete options.isEnabled;
      if (typeof isEnabled !== 'boolean') {
        Console.warn('Got non-boolean value for PhysicsOptions.isEnabled, coercing to boolean:', isEnabled);
        isEnabled = !!isEnabled;
      }
      flag = this._particleSystem_isEnabled !== isEnabled;
      this._particleSystem_isEnabled = isEnabled;
    }
    if (flag) {
      this.updateIsParticleSystemEnabled();
    }
  }

  _relayout () {
    // Update filters
    const graph = {
      nodes: [], connections: [], options: this.layoutOptions, entryNode: this.entryNode
    };
    let totalNodes = 0;
    let visibleNodes = 0;

    // Go through all the filters and separate the node and connection filters
    const filters = { connection: [], node: [] };
    each(this.filters, (f) => {
      if (f.type === 'connection') {
        filters.connection.push(f);
      } else if (f.type === 'node') {
        filters.node.push(f);
      }
    });

    each(this.nodes, (node) => {
      delete node.forceLabel;
    });

    each(this.nodes, (n) => { n.filtered = false; });
    each(this.connections, (c) => { c.filtered = false; });

    const forceNodesVisible = Object.keys(this.nodes).length > 1;
    if (forceNodesVisible) {
      this._updateConnectionFilters(filters);
      this._updateNodeFilters(filters);
    }

    const subsetOfDefaultVisibleNodes = every(this.nodes, n => !n.isVisible() || (n.isVisible() && !n.defaultFiltered));
    const subsetOfDefaultVisibleConnections = every(this.connections, c => !c.isVisible() || (c.isVisible() && !c.defaultFiltered));
    const useInLayout = o => ((subsetOfDefaultVisibleNodes && subsetOfDefaultVisibleConnections) ? !o.defaultFiltered : o.isVisible());

    // build the layout graph
    each(this.connections, (connection) => {
      if (useInLayout(connection)) {
        graph.connections.push(connection);
      }
    });
    each(this.nodes, (node) => {
      if (useInLayout(node)) {
        graph.nodes.push(node);
      }
      if (node.connected || forceNodesVisible) {
        totalNodes++;
        if (node.isVisible()) { visibleNodes++; }
      }
    });

    this.nodeCounts.total = totalNodes;
    this.nodeCounts.visible = visibleNodes;

    this.layout.run(graph, this.layoutDimensions, (() => {
      Console.info(`Layout: Received updated layout for ${this.name} from the worker.`);
      this.hasPositionData = true;
      this.updateView();
    }));
    this.onAsyncLayoutCompleted();
    this.onAsyncLayoutBegin();
  }
}

export default TrafficGraph;
