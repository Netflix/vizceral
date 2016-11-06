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
import RegionConnection from './regionConnection';
import RegionNode from './regionNode';
import TrafficGraph from '../base/trafficGraph';

class RegionTrafficGraph extends TrafficGraph {
  constructor (name, mainView, parentGraph, graphWidth, graphHeight) {
    super(name, mainView, parentGraph, graphWidth, graphHeight, RegionNode, RegionConnection, false);
    this.type = 'region';
    this.linePrecision = 4;
    this._layoutTimeoutId = null;
    this._numberOfRunningAsyncLayoutTasks = 0;
    this._onAsyncLayoutTimeout_func = this._onAsyncLayoutTimeout.bind(this);
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
      // If clicked on a node and highlighting is allowed, highlight
      // Or if clicked on a connection, highlight.
      this.highlightObject(this.intersectedObject);
    }
  }

  handleIntersectedObjectDoubleClick () {
    if (this.intersectedObject && this.intersectedObject.graphRenderer === 'region') {
      this.emit('setView', [this.name, this.intersectedObject.getName()]);
    }
  }
      graph.nodes.push({ name: node.getName(), visible: useInLayout(node), position: node.position, metadata: node.metadata, weight: node.depth });
      this._onAsyncLayoutBegin();
    }
  }

  _onAsyncLayoutBegin () {
    this._numberOfRunningAsyncLayoutTasks += 1;
    this._clearLayoutTimeoutId();
    this._layoutTimeoutId = setTimeout(this._onAsyncLayoutTimeout_func, 5000);
    this.updateIsParticleSystemEnabled();
  }

  _clearLayoutTimeoutId () {
    if (this._layoutTimeoutId !== null) {
      clearTimeout(this._layoutTimeoutId);
      this._layoutTimeoutId = null;
    }
  }

  _onAsyncLayoutTimeout () {
    this._numberOfRunningAsyncLayoutTasks = 0;
    Console.debug('AsyncLayout timed out:', 0);
    this._clearLayoutTimeoutId();
    this.updateIsParticleSystemEnabled();
  }

  computeShouldParticleSystemBeEnabled () {
    return super.computeShouldParticleSystemBeEnabled() && this._numberOfRunningAsyncLayoutTasks === 0;
  }

  onAsyncLayoutCompleted () {
    super.onAsyncLayoutCompleted();
    if (this._numberOfRunningAsyncLayoutTasks > 0) {
      this._numberOfRunningAsyncLayoutTasks -= 1;
      if (this._numberOfRunningAsyncLayoutTasks === 0) {
        this._clearLayoutTimeoutId();
      }
      this.updateIsParticleSystemEnabled();
}

export default RegionTrafficGraph;
