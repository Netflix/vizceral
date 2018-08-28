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
import { each, get, times } from 'lodash';
import {
  BufferAttribute, BufferGeometry, MeshBasicMaterial, Mesh
} from 'three';

import BaseView from './baseView';

function overlappingArea (rectA, rectB) {
  const xOverlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
  const yOverlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));

  return xOverlap * yOverlap;
}

class TrafficGraphView extends BaseView {
  constructor (trafficGraph) {
    super();
    this.trafficGraph = trafficGraph;

    // Add invisible element to make sure the container gets rendered even if all nodes/connections are removed.
    // Required to cleanup the scene if all nodes/connections are filtered out
    const geometry = new BufferGeometry();
    geometry.addAttribute('position', new BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const material = new MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0 });
    const mesh = new Mesh(geometry, material);
    this.container.add(mesh);

    if (!this.trafficGraph.isEmpty()) {
      this.updateState();
    }
  }

  removeObject (object) {
    // Remove the objects view container
    if (object.view) {
      this.container.remove(object.view.container);
      object.view.added = false;
      object.view.cleanup();
      this.invalidateInteractiveChildren();
    }
  }

  updateState () {
    each(this.trafficGraph.nodes, node => this.updateObject(node));
    each(this.trafficGraph.connections, connection => this.updateObject(connection));
    this.rendered = this.container.children.length !== 0;

    this.invalidateInteractiveChildren();
    this.updateNodeLabelPositions();
  }

  setOpacity (opacity) {
    if (this.opacity !== opacity) {
      this.opacity = opacity;
      each(this.trafficGraph.nodes, node => node.getView().setOpacity(opacity));
      each(this.trafficGraph.connections, connection => connection.getView().setOpacity(opacity));
    }
  }

  getInteractiveChildren () {
    if (this.interactiveChildren === undefined) {
      this.interactiveChildren = [];
      each(this.trafficGraph.nodes, (node) => {
        if (node.isVisible()) {
          this.interactiveChildren = this.interactiveChildren.concat(node.getView().getInteractiveChildren());
        }
      });
      each(this.trafficGraph.connections, (connection) => {
        if (connection.isVisible()) {
          this.interactiveChildren = this.interactiveChildren.concat(connection.getView().getInteractiveChildren());
        }
      });
    }
    return this.interactiveChildren;
  }

  /* **** LOCAL FUNCTIONS **** */

  getOverlappingAreas (node) {
    const labelBox = node.view.nameView.boundingBox;

    const areas = {
      nodes: 0,
      labels: 0
    };

    const emptyBoundingBox = {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0
    };

    each(this.trafficGraph.nodes, (nodeB) => {
      if (node.getName() !== nodeB.getName() && nodeB.isVisible()) {
        const nodeArea = overlappingArea(labelBox, get(nodeB, 'boundingBox', emptyBoundingBox));
        const labelArea = overlappingArea(labelBox, get(nodeB, 'view.nameView.boundingBox', emptyBoundingBox));
        areas.nodes = Math.max(areas.nodes, nodeArea);
        areas.labels = Math.max(areas.labels, labelArea);
      }
    });

    return areas;
  }

  updateNodeLabelPositions () {
    let defaultAreas = { nodes: 0, labels: 0 };
    let otherAreas = { nodes: 0, labels: 0 };

    // Do two passed at placing the labels in case some flipping caused better locations to be opened up
    times(2, each(this.trafficGraph.nodes, (node) => {
      if (node.view && node.view.nameView) {
        defaultAreas = { nodes: 0, labels: 0 };
        otherAreas = { nodes: 0, labels: 0 };

        // Set default side
        node.view.resetDefaultLabelPosition(); // left is true, right is false
        node.view.updateLabelPosition();

        // Check if the label will overlap any nodes on the default side
        defaultAreas = this.getOverlappingAreas(node);

        if (defaultAreas.nodes !== 0 || defaultAreas.labels !== 0) {
          // Check if the label will overlap any nodes on the non-default side
          node.view.labelPositionLeft = !node.view.labelPositionLeft;
          node.view.updateLabelPosition();
          otherAreas = this.getOverlappingAreas(node);

          // Switch back to default side if preferred
          if (defaultAreas.nodes === 0 && (otherAreas.nodes > 0 || (defaultAreas.labels < otherAreas.labels))) {
            node.view.labelPositionLeft = !node.view.labelPositionLeft;
          }
        }
      }
    }));

    // n passes have completed, now apply the position
    each(this.trafficGraph.nodes, (node) => {
      if (node.view) {
        node.view.applyLabelPosition();
      }
    });
  }

  updateObject (object) {
    // Add the object if it should be visible
    if ((!object.view || !object.view.added) && object.isVisible()) {
      const view = object.getView();
      view.added = true;
      this.container.add(view.container);
    }

    // Remove the object if it should not be visible
    if (object.view && object.view.added && !object.isVisible()) {
      this.removeObject(object);
    }

    // Update the position of the object if it is visible
    if (object.view && object.view.added) {
      object.view.updatePosition();
    }
  }
}

export default TrafficGraphView;
