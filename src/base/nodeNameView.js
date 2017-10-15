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
import * as THREE from 'three';

import BaseView from './baseView';
import GlobalStyles from '../globalStyles';

function roundRect (context, x, y, w, h, radius, strokeColor, fillColor) {
  const r = x + w;
  const b = y + h;
  context.beginPath();
  context.strokeStyle = strokeColor;
  context.lineWidth = 2;
  context.moveTo(x + radius, y);
  context.lineTo(r - radius, y);
  context.quadraticCurveTo(r, y, r, y + radius);
  context.lineTo(r, (y + h) - radius);
  context.quadraticCurveTo(r, b, r - radius, b);
  context.lineTo(x + radius, b);
  context.quadraticCurveTo(x, b, x, b - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.fillStyle = fillColor;
  context.closePath();
  context.fill();
  context.stroke();
}

function truncate (name) {
  if (name.length > 18) {
    return `${name.substr(0, 7)}…${name.substr(-7)}`;
  }
  return name;
}

class NodeNameView extends BaseView {
  constructor (nodeView, fixedWidth) {
    super(nodeView.object);
    this.fixedWidth = fixedWidth;
    this.nodeName = nodeView.object.getDisplayName();
    this.nodeView = nodeView;

    // How far away from the node we want the label to begin
    this.buffer = Math.max(this.nodeView.radius * 0.3, 7);


    // Create the canvas to build a sprite
    this.nameCanvas = this.createCanvas(200, this.fontSize + 10);

    this.nameTexture = new THREE.Texture(this.nameCanvas);
    this.nameTexture.minFilter = THREE.LinearFilter;

    this.updateLabel();

    this.material = new THREE.MeshBasicMaterial({ map: this.nameTexture, side: THREE.DoubleSide, transparent: true });
    this.view = this.addChildElement(new THREE.PlaneBufferGeometry(this.nameCanvas.width, this.nameCanvas.height), this.material);
  }

  getDisplayName (getDefault) {
    const getDefaultDisplayName = () => truncate(this.nodeName);
    if (getDefault) { return getDefaultDisplayName(); }

    const showFullDisplayName = this.highlight || this.nodeView.focused;
    return showFullDisplayName ? this.nodeName : getDefaultDisplayName();
  }

  updateLabel () {
    const context = this.nameCanvas.getContext('2d');
    const fontSize = this.fixedWidth ? 22 : 18;

    const font = `${fontSize}px 'Source Sans Pro', sans-serif`;
    context.font = font;

    // Label Width
    this.defaultLabelWidth = this.fixedWidth ? 260 : context.measureText(this.getDisplayName(true)).width + 16;
    const labelWidth = this.fixedWidth ? 260 : context.measureText(this.getDisplayName()).width + 16;
    if (labelWidth !== this.labelWidth) { this.labelWidth = labelWidth; }
    this.resizeCanvas(this.nameCanvas, this.labelWidth, fontSize + 10);

    // label color
    const labelColor = GlobalStyles.getColorTraffic(this.object.getClass(), this.highlight);
    roundRect(context, 0, 0, this.nameCanvas.width, this.nameCanvas.height, 3, GlobalStyles.styles.colorLabelBorder, labelColor);
    context.fillStyle = GlobalStyles.styles.colorLabelText;

    context.fillText(this.getDisplayName(), this.nameCanvas.width / 2, this.nameCanvas.height / 2);

    this.nameTexture.needsUpdate = true;

    if (this.view) {
      this.applyPosition();
      this.view.scale.x = this.labelWidth / this.defaultLabelWidth;
      this.view.geometry.width = this.nameCanvas.width;
      this.view.geometry.height = this.nameCanvas.height;
      this.view.geometry.needsUpdate = true;
    }
  }

  updatePosition () {
    // Update the bounding box
    this.boundingBox = {};
    // Add a little bit of fuzziness to the label height since we don't care if it overlaps a little...
    const yDelta = (this.nameCanvas.height * 0.6) / 2;
    this.boundingBox.top = this.nodeView.object.position.y - yDelta;
    this.boundingBox.bottom = this.nodeView.object.position.y + yDelta;
    if (this.nodeView.labelPositionLeft) {
      this.boundingBox.right = this.nodeView.object.boundingBox.left - this.buffer;
      this.boundingBox.left = this.boundingBox.right - this.nameCanvas.width;
    } else {
      this.boundingBox.left = this.nodeView.object.boundingBox.right + this.buffer;
      this.boundingBox.right = this.boundingBox.left + this.nameCanvas.width;
    }
  }

  applyPosition () {
    let x;
    const y = this.nodeView.object.graphRenderer === 'global' ? 80 : 0;

    // Prioritize left side if node is left of center, right side if node is right of center
    if (this.nodeView.labelPositionLeft) {
      // Put the label to the left of the node
      x = 0 - this.nodeView.radius - (this.labelWidth / 2) - this.buffer;
    } else {
      // Put the label to the right of the node
      x = this.nodeView.radius + (this.labelWidth / 2) + this.buffer;
    }

    this.container.position.set(x, y, 1);
  }

  setHighlight (highlight) {
    this.highlight = highlight;
  }

  refresh () {
    this.updateLabel();
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.material.opacity = opacity;
  }

  cleanup () {
    this.nameTexture.dispose();
    this.material.dispose();
  }
}

export default NodeNameView;
