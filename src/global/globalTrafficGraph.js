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

import GlobalConnection from './globalConnection';
import GlobalNode from './globalNode';
import RendererUtils from '../rendererUtils';
import TrafficGraph from '../base/trafficGraph';

const yOffset = 140;
const orbitSize = 1100;
function updatePosition (node, regionCount, regionIndex) {
  node.size = 120;
  const adjust = 2.618;
  node.position = {
    x: orbitSize / 2 * Math.cos(2 * Math.PI * regionIndex / regionCount + adjust),
    y: orbitSize / 2 * Math.sin(2 * Math.PI * regionIndex / regionCount + adjust) + yOffset
  };
}

function positionNodes (nodes) {
  let regionIndex = 0;
  const regionCount = nodes.length - 1;

  const sortedNodeNames = _.map(nodes, 'name');
  sortedNodeNames.sort();

  const nodeMap = _.keyBy(nodes, 'name');
  _.each(sortedNodeNames, nodeName => {
    const node = nodeMap[nodeName];
    if (nodeName !== 'INTERNET') {
      regionIndex++;
      updatePosition(node, regionCount, regionIndex);
    } else {
      node.size = 150;
      node.position = {
        x: 0,
        y: yOffset
      };
    }
  });
}

class GlobalTrafficGraph extends TrafficGraph {
  constructor (name, mainView, graphWidth, graphHeight) {
    super(name, mainView, graphWidth, graphHeight, GlobalNode, GlobalConnection, true);
    this.state = {
      nodes: [],
      connections: []
    };
    this.contextDivs = {};

    this.hasPositionData = true;
  }

  setState (state) {
    _.each(state.nodes, node => {
      const existingNodeIndex = _.findIndex(this.state.nodes, { name: node.name });
      if (existingNodeIndex !== -1) {
        this.state.nodes[existingNodeIndex] = node;
      } else {
        this.state.nodes.push(node);
        if (!this.contextDivs[node.name]) {
          const parentDiv = RendererUtils.getParent();
          if (parentDiv) {
            this.contextDivs[node.name] = document.createElement('div');
            this.contextDivs[node.name].style.position = 'absolute';
            this.contextDivs[node.name].className = `context ${node.name}`;
            parentDiv.appendChild(this.contextDivs[node.name]);
          }
        }
      }
    });

    _.each(state.connections, newConnection => {
      const existingConnectionIndex = _.findIndex(this.state.connections, { source: newConnection.source, target: newConnection.target });
      if (existingConnectionIndex !== -1) {
        this.state.connections[existingConnectionIndex] = newConnection;
      } else {
        this.state.connections.push(newConnection);
      }
    });

    // update maxVolume
    // Just for visual sake, we set the max volume to max out the connection to the
    // total of all regional volume divided by (number of regions - 1).  This
    // allows for buffer room for failover traffic to be more visually dense
    // It is minus 2 because we need to account for the internet node as well.
    let maxVolume = 0;
    _.each(this.state.nodes, node => {
      maxVolume = maxVolume + (node.maxVolume || 0);
    });
    this.state.maxVolume = maxVolume / (Object.keys(this.state.nodes).length - 2);

    positionNodes(this.state.nodes);
    super.setState(this.state);
  }

  _updateFilteredElements () {
    const graph = { nodes: [], edges: [] };
    _.each(this.connections, connection => {
      graph.edges.push({ name: connection.getName(), visible: connection.isVisible(), source: connection.source.getName(), target: connection.target.getName() });
    });
    _.each(this.nodes, node => {
      graph.nodes.push({ name: node.getName(), visible: node.isVisible(), position: node.position, weight: node.depth });
    });
    this._relayout(graph);
  }

  handleIntersectedObjectClick () {
    if (this.intersectedObject && this.intersectedObject.type === 'region') {
      this.emit('setView', [this.intersectedObject.getName()]);
    }
  }

  handleIntersectedObjectDoubleClick () {
    if (this.intersectedObject && this.intersectedObject.type === 'region') {
      this.emit('setView', [this.intersectedObject.getName()]);
    }
  }

  updateLabelScreenDimensions (force) {
    let changed = false;
    const dimensions = {};
    _.each(this.nodes, (node, key) => {
      const labelView = node.getView().nameView ? node.getView().nameView.container : undefined;
      const newDimensions = RendererUtils.toScreenPosition(labelView, 'BL');
      if (newDimensions) {
        const oldDimensions = node.getView().getLabelScreenDimensions();
        if (!_.isEqual(newDimensions, oldDimensions) || force) {
          changed = true;
          node.getView().setLabelScreenDimensions(newDimensions);
          dimensions[key] = newDimensions;
          if (this.contextDivs[key]) {
            this.contextDivs[key].style.width = `${newDimensions.width}px`;
            this.contextDivs[key].style.top = `${newDimensions.y}px`;
            this.contextDivs[key].style.left = `${newDimensions.x}px`;
            this.contextDivs[key].style.height = `${0.65 * newDimensions.width}px`;
          }
        }
      }
    });

    if (changed) {
      this.emit('nodeContextSizeChanged', dimensions);
    }
  }

  setCurrent (current) {
    super.setCurrent(current);
    _.each(this.contextDivs, div => {
      div.style.display = current ? 'block' : 'none';
    });
    this.updateLabelScreenDimensions(true);
  }

  update (time) {
    super.update(time);
    this.updateLabelScreenDimensions(false);
  }
}

export default GlobalTrafficGraph;
