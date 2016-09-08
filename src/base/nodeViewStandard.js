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

import NodeView from './nodeView';
import NodeNameView from './nodeNameView';
import GlobalStyles from '../globalStyles';

const radius = 16;

class NodeViewStandard extends NodeView {
  constructor (service) {
    super(service);
    this.radius = radius;

    const dotColor = GlobalStyles.getColorTrafficThree(this.object.getClass());
    this.dotMaterial = new THREE.MeshBasicMaterial({ color: dotColor, transparent: true });

    this.meshes.outerBorder = this.addChildElement(NodeView.getOuterBorderGeometry(radius), this.borderMaterial);
    this.meshes.innerCircle = this.addChildElement(NodeView.getInnerCircleGeometry(radius), this.innerCircleMaterial);
    this.meshes.noticeDot = this.addChildElement(NodeView.getNoticeDotGeometry(radius), this.dotMaterial);
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
      const noticeSeverity = this.object.highestNoticeLevel();
      this.dotColor = GlobalStyles.getColorSeverityThree(noticeSeverity);
      this.dotMaterial.color.set(this.dotColor);
      this.dotMaterial.opacity = this.opacity;
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
      this.dotMaterial.color.set(this.dotColor);
    }
    this.meshes.noticeDot.geometry.colorsNeedUpdate = true;

    // Refresh notices
    this.refreshNotices();
  }
}

export default NodeViewStandard;
