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
import NodeViewDetailed from '../base/nodeViewDetailed';

class RegionNode extends Node {
  constructor (node) {
    super(node, 'region');
    this.loaded = true;
  }

  isInteractive () {
    return this.view !== this.views.detailed;
  }

  showDetailedView (showDetailed) {
    if (!this.views) { this.render(); }
    const detailedViewShown = this.view === this.views.detailed;
    if (detailedViewShown !== showDetailed) {
      if (showDetailed) {
        this.view = this.views.detailed;
        this.focused = true;
        this.view.refresh(true);
      } else {
        this.view = this.views.standard;
        this.focused = false;
      }
      this.view.showLabel(this.options.showLabel);
    }
  }

  setContext (context) {
    super.setContext(context);
    if (this.view === this.views.detailed) {
      this.view.updateText();
    }
  }

  render () {
    this.views = {
      standard: new NodeViewStandard(this),
      detailed: new NodeViewDetailed(this)
    };

    // Set the default view renderer
    this.view = this.views.standard;
  }

  cleanup () {
    if (this.views) {
      Object.keys(this.views).forEach(key => this.views[key].cleanup());
    }
  }

}

export default RegionNode;
