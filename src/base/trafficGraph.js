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

import LayoutWorker from 'worker?inline!./layoutWorker'; // eslint-disable-line import/no-extraneous-dependencies
import Notices from '../notices';
import TrafficGraphView from './trafficGraphView';

const Console = console; // Eliminate eslint warnings for non-debug console messages

class TrafficGraph extends EventEmitter {
  constructor (name, mainView, graphWidth, graphHeight, NodeClass, ConnectionClass) {
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
      this._updateNodePositions(event.data);
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
      // First, update the state of the view, hiding and showing any necessary nodes or connections
      this.view.updateState();
      // Re-apply highlighting to the graph is case there are new nodes or connections
      if (this.searchString) { this.highlightMatchedNodes(this.searchString); }
      if (this.highlightedObject) { this.highlightObject(this.highlightedObject, true); }
      // Update listeners that something was rendered or re-rendered.
      this.emitRendered();
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
      } else {
        _.each(this.connections, connection => connection.cleanup());
        _.each(this.nodes, node => node.cleanup());
      }
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
    // Check if the node exists by direct name first
    if (this.nodes[nodeName]) { return this.nodes[nodeName]; }

    // Then check by exact matching sub node name
    const nodes = _.filter(this.nodes, node => {
      if (node.nodes) {
        return _.includes(node.nodes.map(n => n.name), nodeName);
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
        if (node.nodes) {
          targetString += `::${node.nodes.map(n => n.name).join('::')}`;
        }
        const match = (node === this.highlightedObject || targetString.indexOf(searchString) !== -1);
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
      _.each(this.nodes, node => {
        node.getView().setHighlight(nodeName === node.getName());
      });
      const connectionName = objectToHighlight ? objectToHighlight instanceof this.ConnectionClass && objectToHighlight.getName() : undefined;
      _.each(this.connections, connection => {
        connection.getView().setHighlight(connectionName === connection.getName());
      });

      this.emit('objectHighlighted', objectToHighlight);
    }
  }

  handleIntersectedObjectClick () {

  }

  handleIntersectedObjectDoubleClick () {

  }

  showLabels (showLabels) {
    this.displayOptions.showLabels = showLabels;
    // Show labels
    _.each(this.nodes, node => node.showLabel(showLabels));
    if (this.view) { this.view.invalidateInteractiveChildren(); }
  }

  setModes (modes) {
    _.each(this.nodes, node => node.setModes(modes));
    if (this.view) { this.view.invalidateInteractiveChildren(); }
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

  /**
   * Validate the current state.  If setState(state) was called while this graph was not current,
   * all calculations were deferred. This makes sure that the current view is up to date with the
   * most current state.
   */
  validateState () {
    if (this.cachedState) {
      this.setState(this.cachedState);
      this.cachedState = undefined;
    } else {
      this.updateView();
      this.emitObjectUpdated();
    }
  }

  setState (state) {
    if (state && Object.keys(state).length > 0) {
      // If this is the first update, run it, otherwise, only update if it's the current graph
      if (!this.isPopulated() || this.current) {
        let layoutModified = false;

        // first, remove nodes that aren't in the new state
        const newStateNodes = _.reduce(state.nodes, (result, node) => {
          result[node.name] = true;
          return result;
        }, {});
        const nodesToRemove = [];
        _.each(this.nodes, (node, nodeName) => {
          if (!newStateNodes[nodeName]) { nodesToRemove.push(node); }
        });
        if (nodesToRemove.length > 0) {
          nodesToRemove.forEach(node => this.removeNode(node));
          layoutModified = true;
        }

        const stateNodeMap = {};
        // Then create new nodes and update existing nodes. New nodes need to be
        // created before connections are attempted to be created between nodes.
        _.each(state.nodes, (stateNode, index) => {
          stateNodeMap[stateNode.name] = true;
          let node = this.nodes[stateNode.name];
          if (!node) {
            node = new this.NodeClass(stateNode);
            node.hidden = this.node && !this.nodes[this.node].connectedTo(node.getName());
            node.updatePosition(stateNode.position, index);
            this.nodes[stateNode.name] = node;
            layoutModified = true;
          } else {
            node.updatePosition(stateNode.position, index);
            node.update(stateNode);
          }
        });

        // Set all conenctions as false until the connection is found or created
        _.each(this.connections, connection => {
          connection.valid = false;
        });

        // Update all the existing connections and create new ones
        _.each(state.connections, stateConnection => {
          let connection = this.getConnection(`${stateConnection.source}--${stateConnection.target}`);
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

        // Check for updated max volume
        if (state.maxVolume) {
          this.volume.max = state.maxVolume;
        } else {
          Console.error(`maxVolume required to calculate relative particle density, but no maxVolume provided for ${state.name}. See https://github.com/Netflix/Vizceral/wiki/How-to-Use#graph-data-format`);
        }

        // Check for updated current volume
        const currentVolume = this.nodes.INTERNET ? this.nodes.INTERNET.getOutgoingVolume() : 0;
        if (currentVolume !== undefined && this.volume.current !== currentVolume) {
          this.volume.current = currentVolume;
        }

        // Remove all connections that aren't valid anymore and update the
        // greatest volume of the existing connections
        const connectionsToRemove = [];
        _.each(this.connections, connection => {
          if (!connection.valid) {
            connectionsToRemove.push(connection);
          } else {
            connection.updateGreatestVolume(this.volume.max);
          }
        });
        if (connectionsToRemove.length > 0) {
          connectionsToRemove.forEach(connection => this.removeConnection(connection));
          layoutModified = true;
        }

        const nodesToRemoveSecondPass = [];
        _.each(this.nodes, node => {
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
          layoutModified = true;
        }


        // Invalidate all the interactive children so we do not interact with objects that no longer exist
        if (this.view) {
          this.view.invalidateInteractiveChildren();
        }

        // If new elements (nodes or connections) were created or elements were
        // removed, the graph needs to be laid out again
        if (layoutModified) {
          this._relayout();
        } else {
          this.updateView();
        }
        this.emitObjectUpdated();
      } else {
        this.cachedState = state;
      }
    }
  }

  emitObjectUpdated () {
    if (this.highlightedObject) {
      this.emit('objectHighlighted', this.highlightedObject);
    } else if (this.getSelectedNode && this.getSelectedNode()) {
      this.emit('nodeUpdated', this.getSelectedNode());
    }
  }

  isEmpty () {
    return Object.keys(this.nodes).length === 0 || Object.keys(this.connections).length === 0;
  }

  /* ***** LOCAL FUNCTIONS *****/

  _updateNodePositions (nodePositions) {
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
   * @param  {object} filters An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    https://github.com/Netflix/Vizceral/wiki/How-to-Use#graph-data-format
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
   * @param  {object} filters An object map of filters in the form of
   *                    { node: [], connection: [] }. Each respective array
   *                    containing filter configuration objects as described in
   *                    https://github.com/Netflix/Vizceral/wiki/Configuration#filters
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

  _applyDimming (dimNodes, dimConnections, dimmingApplied) {
    let changed;
    let view;
    const dimChanged = [];
    _.each(dimNodes, (dimmed, nodeName) => {
      if (this.nodes[nodeName] && this.nodes[nodeName].isVisible()) {
        view = this.nodes[nodeName].getView();
        changed = view.setDimmed(dimmed, dimmingApplied);
        if (changed) { dimChanged.push(view); }
      }
    });

    _.each(dimConnections, (dimmed, connectionName) => {
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
                _.each(dimChanged, v => {
                  v.setDimPercent(v.dimmed ? this.percent : inverse);
                });
              })
              .start();
  }

  _relayout () {
    // no-op
  }
}

export default TrafficGraph;
