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
/* global __HIDE_DATA__ */
import _ from 'lodash';
import THREE from 'three';
import numeral from 'numeral';

import GlobalDefinitions from '../globalDefinitions';
import GlobalStyles from '../globalStyles';
import NodeView from './nodeView';
import NodeNameView from './nodeNameView';

const Console = console;

function generateDisplayValue (value, format) {
  value = value || 0;

  let displayValue = value;
  if (format) { displayValue = numeral(value).format(format); }

  // If we're hiding data, don't need to hide percentages
  if (__HIDE_DATA__ && displayValue.indexOf('%') === -1) {
    displayValue = displayValue.replace(/[0-9]/g, '#');
  }
  return displayValue;
}

const zAxis = new THREE.Vector3(0, 0, 1);

const outerBorderGeometries = {};
function getOuterBorderGeometry (radius) {
  let geometry = outerBorderGeometries[radius];
  if (geometry === undefined) {
    const border = new THREE.Shape();
    border.absarc(0, 0, radius + 2, 0, Math.PI * 2, false);
    const borderHole = new THREE.Path();
    borderHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
    border.holes.push(borderHole);
    geometry = new THREE.ShapeGeometry(border, { curveSegments: 32 });
    outerBorderGeometries[radius] = geometry;
  }
  return geometry;
}

const innerCircleGeometries = {};
function getInnerCircleGeometry (radius) {
  let geometry = innerCircleGeometries[radius];
  if (geometry === undefined) {
    const circleShape = new THREE.Shape();
    circleShape.moveTo(radius, 0);
    circleShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
    geometry = new THREE.ShapeGeometry(circleShape, { curveSegments: 32 });
    innerCircleGeometries[radius] = geometry;
  }
  return geometry;
}

const innerBorderGeometries = {};
function getInnerBorderGeometry (radius) {
  let geometry = innerBorderGeometries[radius];
  if (geometry === undefined) {
    const innerBorder = new THREE.Shape();
    innerBorder.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const innerBorderHole = new THREE.Path();
    innerBorderHole.absarc(0, 0, radius - 2, 0, Math.PI * 2, true);
    innerBorder.holes.push(innerBorderHole);
    geometry = new THREE.ShapeGeometry(innerBorder, { curveSegments: 32 });
    innerBorderGeometries[radius] = geometry;
  }
  return geometry;
}

const donutGeometries = {};
function getDonutGeometry (radius, innerRadius) {
  const key = `${radius}:${innerRadius}`;
  let geometry = donutGeometries[key];
  if (geometry === undefined) {
    const arcShape = new THREE.Shape();
    arcShape.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    arcShape.holes.push(holePath);
    geometry = new THREE.ShapeGeometry(arcShape, { curveSegments: 32 });
    donutGeometries[key] = geometry;
  }
  return geometry;
}

class DetailedNodeView extends NodeView {
  constructor (service) {
    super(service);

    this.donutMaterial = new THREE.MeshBasicMaterial({ color: GlobalStyles.styles.colorPageBackground, transparent: true });
    this.innerBorderMaterial = new THREE.MeshBasicMaterial({ color: GlobalStyles.styles.colorPageBackground, transparent: true });
    this.donutGraphSegments = [];

    this.radius = this.object.size || 120;
    this.innerRadius = this.radius * 0.8;

    this.meshes.outerBorder = this.addChildElement(getOuterBorderGeometry(this.radius), this.borderMaterial);
    this.meshes.innerCircle = this.addChildElement(getInnerCircleGeometry(this.radius), this.innerCircleMaterial);
    this.meshes.donut = this.addChildElement(getDonutGeometry(this.radius, this.innerRadius), this.donutMaterial);
    this.meshes.innerBorder = this.addChildElement(getInnerBorderGeometry(this.innerRadius), this.borderMaterial);
    this.meshes.innerBorder.position.setZ(100);

    // Add the service name
    if (this.object.graphRenderer === 'global' && !this.object.isEntryNode()) {
      this.nameView = new NodeNameView(this, true);
      this.showLabel(this.object.options.showLabel);
    }

    this.canvasWidth = this.innerRadius * 2;
    this.canvasHeight = this.canvasWidth * 0.53;
    this.metricSpacing = this.canvasHeight * 0.1;
    this.headerFontSize = (this.canvasHeight - this.metricSpacing) * 0.2;
    this.metricFontSize = (this.canvasHeight - this.metricSpacing) * 0.3;
    this.addText();

    if (!this.object.loaded) {
      this.setupLoadingAnimation();
    }

    this.updateDetailedMode();
  }

  addText () {
    this.textCanvas = this.createCanvas(this.canvasWidth, this.canvasHeight);
    this.textTexture = new THREE.Texture(this.textCanvas);
    this.textTexture.minFilter = THREE.LinearFilter;
    this.textTexture.needsUpdate = true;

    this.textMaterial = new THREE.MeshBasicMaterial({ map: this.textTexture, side: THREE.DoubleSide, transparent: true });
    const text = new THREE.Mesh(new THREE.PlaneBufferGeometry(this.textCanvas.width, this.textCanvas.height), this.textMaterial);
    this.container.add(text);
    this.addInteractiveChild(text);
    text.position.set(0, 0, this.depth + 1);
  }

  updateText () {
    if (!this.textCanvas) {
      Console.warn(`Attempted to update the text in the middle of the ${this.object.name} node before the text was created.`);
      return;
    }
    const textContext = this.textCanvas.getContext('2d');
    const headerWeight = 600;
    const metricWeight = 700;
    let top = 0;

    // Reset the canvas to draw new text
    textContext.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

    if (this.loaded) {
      // Draw the first header to the canvas
      textContext.fillStyle = GlobalStyles.styles.colorNormalDimmed;
      textContext.font = `${headerWeight} ${this.headerFontSize}px 'Source Sans Pro', sans-serif`;
      top = top + (this.headerFontSize / 2);
      textContext.fillText(this.detailed.top.header, this.textCanvas.width / 2, top);
      top = top + (this.headerFontSize / 2);

      // Draw the first metric to the canvas
      textContext.fillStyle = GlobalStyles.styles.colorTraffic.normal;
      const topMetricDisplayValue = generateDisplayValue(_.get(this.object, this.detailed.top.data), this.detailed.top.format);
      textContext.font = `${metricWeight} ${this.metricFontSize}px 'Source Sans Pro', sans-serif`;
      top = top + (this.metricFontSize / 2);
      textContext.fillText(topMetricDisplayValue, this.textCanvas.width / 2, top);
      top = top + (this.metricFontSize / 2);

      // Draw the second header to the canvas
      textContext.fillStyle = GlobalStyles.styles.colorNormalDimmed;
      textContext.font = `${headerWeight} ${this.headerFontSize}px 'Source Sans Pro', sans-serif`;
      top = top + this.metricSpacing + (this.headerFontSize / 2);
      textContext.fillText(this.detailed.bottom.header, this.textCanvas.width / 2, top);
      top = top + (this.headerFontSize / 2);

      // Draw the second metric to the canvas
      textContext.fillStyle = GlobalStyles.getColorTraffic(this.object.getClass());
      const bottomMetricDisplayValue = generateDisplayValue(_.get(this.object, this.detailed.bottom.data), this.detailed.bottom.format);
      textContext.font = `${metricWeight} ${this.metricFontSize}px 'Source Sans Pro', sans-serif`;
      top = top + (this.metricFontSize / 2);
      textContext.fillText(bottomMetricDisplayValue, this.textCanvas.width / 2, top);
      top = top + (this.metricFontSize / 2);
    } else {
      // The node is still loading so show a loading message
      textContext.fillStyle = GlobalStyles.styles.colorTraffic.normal;
      textContext.font = `${metricWeight} ${this.metricFontSize}px 'Source Sans Pro', sans-serif`;
      top = ((this.canvasHeight / 2) - (((this.metricFontSize * 2)) / 2)) + 16;
      textContext.fillText('REGION', this.textCanvas.width / 2, top);
      top = top + this.metricSpacing + this.headerFontSize;
      textContext.fillText('LOADING', this.textCanvas.width / 2, top);
    }

    // Tell three.js that an update needs to happen
    this.textTexture.needsUpdate = true;
  }

  updateDetailedMode () {
    const override = this.object.isEntryNode() ? 'entry' : undefined;
    const definition = GlobalDefinitions.getDefinition('detailedNode', this.object.detailedMode, this.object.graphRenderer, override);
    this.detailed = definition;
  }

  updateDonutGraph () {
    if (this.loaded) {
      // Remove the old donut segments
      _.each(this.donutGraphSegments, segment => this.container.remove(segment));
      this.donutGraphSegments.length = 0;

      this.startAngle = Math.PI * 0.5;

      const donutData = _.get(this.object, this.detailed.donut.data, undefined);
      const donutIndices = _.get(this.detailed, ['donut', 'indices'], undefined);
      if (donutIndices) {
        _.each(donutIndices, (index) => {
          if (donutData[index.key] !== undefined) {
            const colorKey = index.class || index.key;
            this.addNewDonutSlice(donutData[index.key], GlobalStyles.getColorTraffic(colorKey));
          }
        });
      } else {
        _.each(donutData, (classPercent, key) => {
          const colorKey = _.get(this.detailed, ['donut', 'classes', key], key);
          this.addNewDonutSlice(classPercent, GlobalStyles.getColorTraffic(colorKey));
        });
      }
    }
  }

  addNewDonutSlice (percent, color) {
    const size = Math.PI * 2 * percent;
    const slice = new THREE.RingGeometry(this.innerRadius, this.radius, 30, 8, this.startAngle, size);
    const mat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, transparent: true });
    const mesh = new THREE.Mesh(slice, mat);
    mesh.position.set(0, 0, this.depth + 2);
    mesh.rotation.y = Math.PI;

    this.donutGraphSegments.push(mesh);
    this.container.add(mesh);

    this.startAngle += size;
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.donutMaterial.opacity = opacity;
    this.innerCircleMaterial.opacity = opacity;
    this.textMaterial.opacity = opacity;

    _.each(this.donutGraphSegments, segment => {
      segment.material.opacity = opacity;
    });
  }

  setupLoadingAnimation () {
    const slice = new THREE.RingGeometry(this.innerRadius, this.radius, 30, 8, 0, Math.PI * 2 * 0.2);
    const mat = new THREE.MeshBasicMaterial({ color: GlobalStyles.styles.colorTraffic.normal, side: THREE.DoubleSide });
    this.loadingSpinner = new THREE.Mesh(slice, mat);
    this.loadingSpinner.position.set(0, 0, this.depth + 2);
    this.container.add(this.loadingSpinner);
    this.refresh();
  }

  clearLoadingAnimation () {
    // Reset the spinner rotation to 0
    this.loadingSpinner.quaternion.set(0, 0, 0, 1);
    // Switch off the loading spinner
    this.container.remove(this.loadingSpinner);

    this.refresh();
  }

  refresh () {
    this.updateDetailedMode();
    super.refresh();
    this.updateText();
    this.updateDonutGraph();
  }

  update () {
    if (this.loaded !== this.object.loaded) {
      this.loaded = this.object.loaded;
      // If things are done loading, turn off the loading animation
      if (this.loaded) {
        this.clearLoadingAnimation();
      }
    }

    // If things are still loading, rotate the circle
    if (!this.loaded) {
      this.loadingSpinner.rotateOnAxis(zAxis, -0.05);
    }

    if (this.object.updated) {
      this.object.updated = false;
      this.refresh();
    }
  }

  cleanup () {
    super.cleanup();
    this.donutMaterial.dispose();
    this.innerBorderMaterial.dispose();
  }
}

export default DetailedNodeView;
