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
import chroma from 'chroma-js';

import * as THREE from 'three';
import BaseView from './baseView';
import GlobalStyles from '../globalStyles';
import Constants from './constants';

class NodeView extends BaseView {
  constructor (node) {
    super(node);
    this.loaded = node.loaded;

    this.depth = 5;

    this.donutInternalColor = GlobalStyles.threeStyles.colorDonutInternalColor.clone();

    const borderColor = GlobalStyles.getColorTrafficThree(node.getClass());
    this.borderMaterial = new THREE.MeshBasicMaterial({ color: borderColor, transparent: true });
    this.innerCircleMaterial = new THREE.MeshBasicMaterial({ color: this.donutInternalColor, transparent: true });
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.borderMaterial.opacity = opacity;
    // Fade the inner node color to background color since setting opacity will show the particles hiding behind the node.
    if (!this.highlight) {
      this.innerCircleMaterial.color.setStyle(chroma.mix(GlobalStyles.styles.colorPageBackground, GlobalStyles.styles.colorDonutInternalColor, opacity).css());
      this.meshes.innerCircle.geometry.colorsNeedUpdate = true;
    }

    if (this.nameView) {
      this.nameView.setOpacity(opacity);
    }
  }

  getOpacity () {
    return this.borderMaterial.opacity;
  }

  getDepth () {
    return this.depth;
  }

  setHighlight (highlight) {
    if (this.highlight !== highlight) {
      this.highlight = highlight;
      if (this.nameView) {
        this.nameView.setHighlight(highlight);
      }
      this.refresh(true);
      this.updatePosition();
    }
  }

  // separate refresh just for focused since it's a good subset of refresh
  refreshFocused () {
    if (this.nameView) {
      this.nameView.refresh();
    }
  }

  refresh (force) {
    // Refresh class
    if (this.object.classInvalidated || force) {
      this.object.classInvalidated = false;
      const nodeClass = this.object.getClass();
      if (this.highlight) {
        this.innerCircleMaterial.color.set(GlobalStyles.getColorTrafficThree(nodeClass, true));
        this.meshes.innerCircle.geometry.colorsNeedUpdate = true;
        this.borderMaterial.color.set(GlobalStyles.getColorTrafficThree(nodeClass, true));
        this.meshes.outerBorder.geometry.colorsNeedUpdate = true;
        if (this.meshes.innerBorder) { this.meshes.innerBorder.geometry.colorsNeedUpdate = true; }
      } else {
        if (this.getOpacity() === 1) {
          this.innerCircleMaterial.color.set(this.donutInternalColor);
          this.meshes.innerCircle.geometry.colorsNeedUpdate = true;
        }
        this.borderMaterial.color.set(GlobalStyles.getColorTrafficThree(nodeClass));
        this.meshes.outerBorder.geometry.colorsNeedUpdate = true;
        if (this.meshes.innerBorder) { this.meshes.innerBorder.geometry.colorsNeedUpdate = true; }
      }

      if (this.nameView) {
        this.nameView.refresh();
      }
    }
  }

  update () {
    // No default update function for the view...
  }

  updatePosition () {
    if (this.object.position) {
      const x = this.object.position.x;
      const y = this.object.position.y;
      let z = 0;

      if (this.object.depth !== undefined) {
        z = this.dimmed ? Constants.DEPTH.dimmedNode : Constants.DEPTH.normalNode;
        if (this.object.getClass() === 'normal') {
          z -= (this.object.depth * 10);
        } else {
          z += (this.object.depth * 20);
        }
      }

      this.container.position.set(x, y, z);
    }
    this.updateLabelPosition();
  }

  updateLabelPosition () {
    if (this.nameView) {
      this._showLabel(this.labelDefaultVisible || this.forceLabel || this.object.forceLabel);
      this.nameView.updatePosition();
    }
  }

  resetDefaultLabelPosition () {
    if (this.object.position) {
      this.labelPositionLeft = this.object.position.x < 1;
    } else {
      this.labelPositionLeft = true;
    }
  }

  setDimmed (dimmed, dimmingApplied) {
    // Show/hide nodeLabel if necessary
    if (this.object.isVisible() && !this.labelDefaultVisible) {
      this.forceLabel = !dimmed && dimmingApplied;
    }
    return super.setDimmed(dimmed, dimmingApplied);
  }

  applyLabelPosition () {
    if (this.nameView) {
      this.nameView.applyPosition();
    }
  }

  showLabel (show) {
    if (this.nameView && this.labelDefaultVisible !== show) {
      this.labelDefaultVisible = show;
      this._showLabel(show);
    }
  }

  _showLabel (show) {
    if (this.nameView) {
      if (show) {
        this.labelVisible = true;
        this.addInteractiveChildren(this.nameView.getInteractiveChildren());
        this.container.add(this.nameView.container);
      } else {
        this.labelVisible = false;
        this.removeInteractiveChildren(this.nameView.getInteractiveChildren());
        this.container.remove(this.nameView.container);
      }
    }
  }

  getLabelScreenDimensions () {
    if (!this.nameView) { return undefined; }
    return this.nameView.screenDimensions;
  }

  setLabelScreenDimensions (dimensions) {
    if (this.nameView) {
      this.nameView.screenDimensions = dimensions;
    }
  }

  cleanup () {
    if (this.nameView) { this.nameView.cleanup(); }
    this.borderMaterial.dispose();
    this.innerCircleMaterial.dispose();
  }
}

export default NodeView;
