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
import { find } from 'lodash';
import RegionConnection from '../region/regionConnection';
import FocusedNode from './focusedNode';
import LTRTreeLayout from '../layouts/ltrTreeLayout';
import TrafficGraph from '../base/trafficGraph';

class FocusedTrafficGraph extends TrafficGraph {
  constructor (name, mainView, parentGraph, graphWidth, graphHeight, Layout = LTRTreeLayout, entryNode) {
    super(name, mainView, parentGraph, graphWidth, graphHeight, FocusedNode, RegionConnection, Layout, entryNode);
    this.type = 'focused';
    this.linePrecision = 4;
  }

  setState (state, force, parentState) {
    super.setState(state, force, parentState);
    this.focusedNode = find(this.nodes, { focused: true });
  }

  handleIntersectedObjectClick () {
    if (!this.intersectedObject || (this.intersectedObject instanceof this.ConnectionClass)) {
      this.highlightObject(this.intersectedObject);
    }
  }

  handleIntersectedObjectDoubleClick () {
    if (this.intersectedObject && this.intersectedObject.graphRenderer === 'focused') {
      const graphIndex = this.graphIndex.slice(0, -1);
      graphIndex.push(this.intersectedObject.getName());
      this.emit('setView', graphIndex);
    }
  }
}

export default FocusedTrafficGraph;
