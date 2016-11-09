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
import RingCenterLayout from '../layouts/ringCenterLayout';
import TrafficGraph from '../base/trafficGraph';

class GlobalTrafficGraph extends TrafficGraph {
  constructor (name, mainView, parentGraph, graphWidth, graphHeight, Layout = RingCenterLayout) {
    super(name, mainView, parentGraph, graphWidth, graphHeight, GlobalNode, GlobalConnection, Layout);
    this.type = 'global';

    this.maxDimension = Math.min(graphWidth, graphHeight);

    this.linePrecision = 50;
    this.state = {
      nodes: [],
      connections: []
    };
    this.contextDivs = {};

    this.hasPositionData = true;
  }

  setState (state, force) {
    _.each(state.nodes, (node) => {
      const existingNodeIndex = _.findIndex(this.state.nodes, { name: node.name });
      if (existingNodeIndex !== -1) {
        this.state.nodes[existingNodeIndex] = node;
      } else {
        this.layoutValid = false;
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

    _.each(state.connections, (newConnection) => {
      const existingConnectionIndex = _.findIndex(this.state.connections, { source: newConnection.source, target: newConnection.target });
      if (existingConnectionIndex !== -1) {
        this.state.connections[existingConnectionIndex] = newConnection;
      } else {
        this.state.connections.push(newConnection);
      }
    });

    // update maxVolume
    // depending on how the data gets fed, we might not have a global max volume.
    // If we do not, calculate it based on all the second level nodes max volume.
    //
    // Just for visual sake, we set the max volume to 150% of the greatest
    // connection volume. This allows for buffer room for failover traffic to be
    // more visually dense.
    let maxVolume = state.maxVolume || 0;
    if (!maxVolume) {
      _.each(this.state.nodes, (node) => {
        maxVolume = Math.max(maxVolume, node.maxVolume || 0);
      });
    }
    this.state.maxVolume = maxVolume * 1.5;

    super.setState(this.state, force);
    this.validateLayout();
  }

  setFilters () {
    // no-op
  }

  handleIntersectedObjectClick () {
    if (this.intersectedObject && this.intersectedObject.graphRenderer === 'global') {
      this.emit('setView', [this.intersectedObject.getName()]);
    }
  }

  handleIntersectedObjectDoubleClick () {
    if (this.intersectedObject && this.intersectedObject.graphRenderer === 'global') {
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
    _.each(this.contextDivs, (div) => {
      div.style.display = current ? 'block' : 'none';
    });
    this.updateLabelScreenDimensions(true);
  }

  highlightObject () {
    // no-op
  }

  update (time) {
    super.update(time);
    this.updateLabelScreenDimensions(false);
  }
}

export default GlobalTrafficGraph;
