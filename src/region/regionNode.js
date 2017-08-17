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
import FocusedNodeView from '../focused/focusedNodeView';
import Node from '../base/node';
import NodeViewStandard from '../base/nodeViewStandard';

class RegionNode extends Node {
  constructor (node) {
    node.size = node.size || 60;
    super(node, 'region');
    this.loaded = true;
  }

  isDraggable () {
    return true;
  }

  isInteractive () {
    return true;
  }

  render () {
    // Set the default view renderer
    if (this.nodeView === 'focused') {
      this.view = new FocusedNodeView(this);
    } else {
      this.view = new NodeViewStandard(this);
    }
  }
}

export default RegionNode;
