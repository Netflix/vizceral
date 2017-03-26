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
import Node from '../base/node';
import NodeViewStandard from '../base/nodeViewStandard';
import FocusedNodeView from './focusedNodeView';

class FocusedNode extends Node {
  constructor (node) {
    node.size = node.size || 120;
    super(node, 'focused');
    this.loaded = true;
  }

  isDraggable () {
    return !this.focused;
  }

  isInteractive () {
    return !this.focused;
  }

  render () {
    if (this.focused) {
      this.view = new FocusedNodeView(this);
    } else {
      this.view = new NodeViewStandard(this);
    }
  }
}

export default FocusedNode;
