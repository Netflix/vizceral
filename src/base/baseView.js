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
import { find, each, remove } from 'lodash';
import * as THREE from 'three';

class BaseView {
  constructor (object) {
    this.container = new THREE.Object3D();
    this.container.userData.object = this.object;
    this.object = object;
    this.interactiveChildren = [];
    this.dimmedLevel = 0.2;
    this.opacity = 1.0;
    this.dimmed = false;

    this.meshes = {};
  }

  addInteractiveChild (child, context) {
    if (!find(this.interactiveChildren, { id: child.id })) {
      child.userData.object = this.object;
      child.userData.context = context;
      this.interactiveChildren.push(child);
    }
  }

  addInteractiveChildren (children) {
    each(children, child => this.addInteractiveChild(child));
  }

  removeInteractiveChildren (children) {
    const childrenIds = children.map(c => c.id);
    remove(this.interactiveChildren, c => childrenIds.includes(c.id));
  }

  getInteractiveChildren () {
    return this.interactiveChildren;
  }

  invalidateInteractiveChildren () {
    this.interactiveChildren = undefined;
  }

  createCanvas (width, height) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    this.resizeCanvas(canvas, width, height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    return canvas;
  }

  resizeCanvas (canvas, width, height) {
    const context = canvas.getContext('2d');

    // Store the context information we care about
    const { font, textAlign, textBaseline } = context;

    const ratio = 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    canvas.style.width = `${width} px`;
    canvas.style.height = `${height} px`;

    // When a canvas is resized, it loses context, so reset it here
    context.font = font;
    context.textAlign = textAlign;
    context.textBaseline = textBaseline;

    context.scale(ratio, ratio);
  }

  setOpacity (opacity) {
    this.opacity = opacity;
  }

  setDimPercent (percent) {
    this.setOpacity(1 - (percent * (1 - this.dimmedLevel)));
  }

  refreshFocused () {
  }

  setDimmed (dimmed, dimmingApplied) {
    let changed = false;
    const focused = !dimmed && dimmingApplied;
    if (focused !== this.focused) {
      this.focused = focused;
      this.refreshFocused();
    }

    changed = dimmed !== this.dimmed;
    this.dimmed = dimmed;
    this.updatePosition(true);
    return changed;
  }

  addChildElement (geometry, material, context) {
    const mesh = new THREE.Mesh(geometry, material);
    this.container.add(mesh);
    this.addInteractiveChild(mesh, context);
    return mesh;
  }
}

export default BaseView;
