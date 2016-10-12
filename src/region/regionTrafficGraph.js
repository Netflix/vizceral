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
import RegionConnection from './regionConnection';
import RegionNode from './regionNode';
import TrafficGraph from '../base/trafficGraph';

const Console = console;

class RegionTrafficGraph extends TrafficGraph {
  constructor (name, mainView, graphWidth, graphHeight) {
    super(name, mainView, graphWidth, graphHeight, RegionNode, RegionConnection, false);
    this.linePrecision = 4;
    this.data = {};
  }

  updateVisibleInfo () {
    const minimumNoticeLevel = 0;
    _.each(this.connections, connection => { connection.setMinimumNoticeLevel(minimumNoticeLevel); });
  }

  setIntersectedObject (object) {
    const changed = super.setIntersectedObject(object);
    if (changed) {
      // Change node highlighting
      if (!this.highlightedObject) {
        if (!this.intersectedObject) {
          // If we are not hovering over anything, clear the highlighting
          this.highlightConnectedNodes(undefined);
        } else if (this.intersectedObject instanceof this.NodeClass ||
                    this.intersectedObject instanceof this.ConnectionClass) {
          this.highlightConnectedNodes(this.intersectedObject);
        }
      }
    }
  }

  handleIntersectedObjectClick () {
    // If we clicked on nothing, clear highlight
    if (!this.intersectedObject) {
      this.highlightObject(undefined);
    } else if ((this.intersectedObject instanceof this.NodeClass)
             || (this.intersectedObject instanceof this.ConnectionClass)) {
      // If clicked on a node and there is no focused node, highlight.
      // Or if clicked on a connection, highlight.
      this.highlightObject(this.intersectedObject);
    }
  }

  handleIntersectedObjectDoubleClick () {
    if (this.intersectedObject && this.intersectedObject.graphRenderer === 'region') {
      this.emit('setView', [this.name, this.intersectedObject.getName()]);
    }
  }

  setFilters (filters) {
    let filtersChanged = false;
    _.each(filters, filter => {
      if (!this.filters[filter.name]) {
        this.filters[filter.name] = filter;
        filtersChanged = true;
      }
      if (filter.value !== this.filters[filter.name].value) {
        this.filters[filter.name].value = filter.value;
        filtersChanged = true;
      }
      if (this.filters[filter.name].defaultValue === undefined) {
        this.filters[filter.name].defaultValue = this.filters[filter.name].value;
        filtersChanged = true;
      }
    });

    if (this.isPopulated() && filtersChanged) {
      this._relayout();
    }
  }

  _relayout () {
    // Update filters
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

    _.each(this.nodes, node => {
      delete node.forceLabel;
    });

    _.each(this.nodes, n => { n.filtered = false; });
    _.each(this.connections, c => { c.filtered = false; });
    this._updateConnectionFilters(filters);
    this._updateNodeFilters(filters);

    const subsetOfDefaultVisibleNodes = _.every(this.nodes, n => !n.isVisible() || (n.isVisible() && !n.defaultFiltered));
    const subsetOfDefaultVisibleConnections = _.every(this.connections, c => !c.isVisible() || (c.isVisible() && !c.defaultFiltered));
    const useInLayout = o => ((subsetOfDefaultVisibleNodes && subsetOfDefaultVisibleConnections) ? !o.defaultFiltered : o.isVisible());

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

    if (Object.keys(graph.nodes).length > 0 && Object.keys(graph.edges).length > 0) {
      Console.info(`Layout: Updating the layout for ${this.name} with the worker...`);
      this.layoutWorker.postMessage({ graph: graph, dimensions: this.layoutDimensions });
    } else {
      Console.warn(`Layout: Attempted to update the layout for ${this.name} but there are zero nodes and/or zero connections.`);
    }
  }
}

export default RegionTrafficGraph;
