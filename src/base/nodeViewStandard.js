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
import THREE from 'three';

import NodeView from './nodeView';
import NodeNameView from './nodeNameView';
import GlobalStyles from '../globalStyles';

const radius = 16;
const curveSegments = 32;

// Outer border
const outerBorder = new THREE.Shape();
outerBorder.absarc(0, 0, radius + 2, 0, Math.PI * 2, false);
const outerBorderHole = new THREE.Path();
outerBorderHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
outerBorder.holes.push(outerBorderHole);
const outerBorderGeometry = new THREE.ShapeGeometry(outerBorder, { curveSegments: curveSegments });

// Inner circle
const circleShape = new THREE.Shape();
circleShape.moveTo(radius, 0);
circleShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
const innerCircleGeometry = new THREE.ShapeGeometry(circleShape, { curveSegments: curveSegments });

// Notice dot
const noticeShape = new THREE.Shape();
const dotRadius = radius * 0.5;
noticeShape.moveTo(dotRadius, 0);
noticeShape.absarc(0, 0, dotRadius, 0, 2 * Math.PI, false);
const noticeDotGeometry = new THREE.ShapeGeometry(noticeShape, { curveSegments: curveSegments });

class NodeViewStandard extends NodeView {
  constructor (service) {
    super(service);
    this.radius = radius;

    const dotColor = GlobalStyles.threeStyles.colorTraffic[this.object.getClass()];
    this.dotMaterial = new THREE.MeshBasicMaterial({ color: dotColor, transparent: true });

    this.meshes.outerBorder = this.addChildElement(outerBorderGeometry, this.borderMaterial);
    this.meshes.innerCircle = this.addChildElement(innerCircleGeometry, this.innerCircleMaterial);
    this.meshes.noticeDot = this.addChildElement(noticeDotGeometry, this.dotMaterial);
    this.refreshNotices();

    // Add the service name
    this.nameView = new NodeNameView(this, false);
    this.showLabel(this.object.options.showLabel);
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    if (this.object.hasNotices()) {
      this.dotMaterial.opacity = opacity;
    }
  }

  refreshNotices () {
    if (this.object.hasNotices()) {
      this.dotMaterial.opacity = this.opacity;
    } else {
      this.dotMaterial.opacity = 0;
    }
  }

  refresh () {
    super.refresh();

    // Refresh severity
    const nodeClass = this.object.getClass();
    if (this.highlight) {
      this.dotMaterial.color.set(this.donutInternalColor);
    } else {
      this.dotMaterial.color.set(GlobalStyles.threeStyles.colorTraffic[nodeClass]);
    }
    this.meshes.noticeDot.geometry.colorsNeedUpdate = true;

    // Refresh notices
    this.refreshNotices();
  }
}

export default NodeViewStandard;
