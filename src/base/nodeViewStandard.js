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
import { isEqual } from 'lodash';

import NodeView from './nodeView';
import NodeNameView from './nodeNameView';
import GlobalStyles from '../globalStyles';
import ShapesFactory from './ShapesFactory';
import './shapes/CommonShapes';

const radius = 16;

class NodeViewStandard extends NodeView {
  constructor (service) {
    super(service);
    this.radius = radius;
    let dotRadius = radius;

    this.dotColor = GlobalStyles.getColorTrafficRGBA(this.object.getClass());
    this.dotMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.dotColor.r, this.dotColor.g, this.dotColor.b), transparent: true, opacity: this.dotColor.a });
    // custom shapes support. node_type property should be defined for a node in json. If node_type is missing or undefined, the default shape (circle) will be picked up
    const shape = ShapesFactory.getShape(service, radius);

    this.shapeMaterial = shape.material;

    this.meshes.outerBorder = this.addChildElement(shape.outerBorder, this.borderMaterial);
    this.meshes.innerCircle = this.addChildElement(shape.innerCircleGeometry, this.innerCircleMaterial);

    if (shape.innerGeometry) {
      // Since inside NodeView.getNoticeDotGeometry it takes radius input and halves it this will make the dot fill the inner circle when a node has an icon.
      dotRadius = this.radius * 2;
    }
    this.meshes.noticeDot = this.addChildElement(NodeView.getNoticeDotGeometry(dotRadius), this.dotMaterial);

    // The order things are added to the meshes object matters so make sure the innerGeometry, a.k.a. icon is last so it is on top. aSqrd-eSqrd, 18-July-2019
    if (shape.innerGeometry !== undefined) {
      this.meshes.innerGeometry = this.addChildElement(shape.innerGeometry, this.shapeMaterial);
    }

    /**
     * This section would make the inner geometry/icon be the notice geometry and so if
     * the notice severity level would set the color of the icon.  Switching the icons
     * to be the notices was to big a jump for me without community feedback, so I left
     * this behind to spark ideas and feedback.  aSqrd-eSqrd, 30-Apr-2019
     **
     * if (shape.innerGeometry != undefined) {
     *   this.meshes.noticeDot = this.addChildElement(shape.innerGeometry, this.shapeMaterial);
     *   if (this.object.hasNotices()) {
     *     this.dotMaterial = this.shapeMaterial;
     *   }
     * } else {
     *  this.meshes.noticeDot = this.addChildElement(NodeView.getNoticeDotGeometry(radius), this.dotMaterial);
     * }
     */

    this.refreshNotices();

    // There is an inner icon and a notice and they are the same color, so set icon to white
    if (service.hasNotices() && isEqual(this.dotMaterial.color, this.shapeMaterial.color)) {
      this.shapeMaterial.color.setRGB(1, 1, 1); // Set icon to white so it will stand out
    }

    // Add the service name
    this.nameView = new NodeNameView(this, false);
    this.showLabel(this.object.options.showLabel);
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    const borderOpacity = opacity * this.borderColor.a;
    if (this.meshes.innerGeometry) {
      this.shapeMaterial.opacity = borderOpacity;
    }
    if (this.object.hasNotices()) {
      this.dotMaterial.opacity = opacity * this.dotColor.a;
    }
  }

  refreshNotices () {
    if (this.object.hasNotices()) {
      const noticeSeverity = this.object.highestNoticeLevel();
      this.dotColor = GlobalStyles.getColorSeverityRGBA(noticeSeverity);
      this.dotMaterial.color.setRGB(this.dotColor.r, this.dotColor.g, this.dotColor.b);
      this.dotMaterial.opacity = this.opacity * this.dotColor.a;
      this.meshes.noticeDot.geometry.colorsNeedUpdate = true;
    } else {
      this.dotMaterial.opacity = 0;
    }
  }

  refresh (force) {
    super.refresh(force);

    // Refresh severity
    if (this.highlight) {
      this.dotMaterial.color.set(this.donutInternalColor);
    } else {
      this.dotMaterial.color.setRGB(this.dotColor.r, this.dotColor.g, this.dotColor.b);
    }
    this.meshes.noticeDot.geometry.colorsNeedUpdate = true;

    // Refresh notices
    this.refreshNotices();
  }
}

export default NodeViewStandard;
