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

const curveSegments = 32;

/** NOTE: The getOrSet function plus the "const xyzGeometries" constants below
 * allowes the sharing/reuse of THREE geometries between nodes.  The "key"
 * identifies the radius and/or outer radius+inner radius of the geometry the
 * node is going to use and if it already exist it isn't duplicated but will
 * "reuse" the existing geometry of the same configuration.
 *   FYI: materials aren't shared to allow per node color.
 * aSqrd-eSqrd, 20-May-2019
 */
function getOrSet (obj, key, func) {
  let result = obj[key];
  if (result === undefined) {
    result = func();
    obj[key] = result;
  }
  return result;
}

// Used only by the Focused nodes (a.k.a. Donut Graph nodes).
const innerBorderGeometries = {};
const donutGeometries = {};
// Used by all notices.
const noticeDotGeometries = {};

class NodeView extends BaseView {
  constructor (node) {
    super(node);
    this.loaded = node.loaded;

    this.donutInternalColor = GlobalStyles.rgba.colorDonutInternalColor;
    this.donutInternalColorThree = new THREE.Color(this.donutInternalColor.r, this.donutInternalColor.g, this.donutInternalColor.b);

    this.borderColor = GlobalStyles.getColorTrafficRGBA(node.getClass());
    this.borderMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.borderColor.r, this.borderColor.g, this.borderColor.b), transparent: true, opacity: this.borderColor.a });
    this.innerCircleMaterial = new THREE.MeshBasicMaterial({ color: this.donutInternalColorThree, transparent: true });
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.borderMaterial.opacity = opacity * this.borderColor.a;
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
      const borderColor = GlobalStyles.getColorTrafficRGBA(nodeClass, this.highlight);
      if (this.highlight) {
        this.innerCircleMaterial.color.setRGB(borderColor.r, borderColor.g, borderColor.b);
        this.meshes.innerCircle.geometry.colorsNeedUpdate = true;
        this.borderMaterial.color.setRGB(borderColor.r, borderColor.g, borderColor.b);
        this.meshes.outerBorder.geometry.colorsNeedUpdate = true;
        if (this.meshes.innerBorder) { this.meshes.innerBorder.geometry.colorsNeedUpdate = true; }
      } else {
        if (this.getOpacity() === 1) {
          this.innerCircleMaterial.color.set(this.donutInternalColorThree);
          this.meshes.innerCircle.geometry.colorsNeedUpdate = true;
        }
        this.borderMaterial.color.setRGB(borderColor.r, borderColor.g, borderColor.b);
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
      const { x, y } = this.object.position;
      this.depth = this.dimmed ? Constants.DEPTH.dimmedNode : Constants.DEPTH.normalNode;

      if (this.object.getClass() !== 'normal') {
        this.depth += 5;
      }

      this.container.position.set(x, y, this.depth);
    }
    this.updateLabelPosition();
  }

  updateLabelPosition () {
    if (this.nameView) {
      this._showLabel(this.labelDefaultVisible || this.forceLabel || this.object.forceLabel);
      this.nameView.updatePosition();
    }
  }

  updateText () {
    // No text update function for the default view
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

  // Scale the node as a whole entity.
  setScaleXYZ (xScale, yScale, zScale) {
    this.container.scale.set(xScale, yScale, zScale);
  }

  // Get the scale the entire node is using. Returned as a THree Vector3
  getScale () {
    return this.container.scale;
  }

  cleanup () {
    if (this.nameView) { this.nameView.cleanup(); }
    this.borderMaterial.dispose();
    this.innerCircleMaterial.dispose();
  }

  // Used by Focused nodes (a.k.a. Donut Graph nodes)
  static getInnerBorderGeometry (radius) {
    return getOrSet(innerBorderGeometries, radius, () => {
      const innerBorder = new THREE.Shape();
      innerBorder.absarc(0, 0, radius, 0, Math.PI * 2, false);
      const innerBorderHole = new THREE.Path();
      innerBorderHole.absarc(0, 0, radius - 2, 0, Math.PI * 2, true);
      innerBorder.holes.push(innerBorderHole);
      return new THREE.ShapeGeometry(innerBorder, curveSegments);
    });
  }

  // Used by Focused nodes (a.k.a. Donut Graph nodes)
  static getDonutGeometry (radius, innerRadius) {
    return getOrSet(donutGeometries, `${radius}:${innerRadius}`, () => {
      const arcShape = new THREE.Shape();
      arcShape.absarc(0, 0, radius, 0, Math.PI * 2, false);
      const holePath = new THREE.Path();
      holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
      arcShape.holes.push(holePath);
      return new THREE.ShapeGeometry(arcShape, curveSegments);
    });
  }

  /** Used for node notice dots/icons.
   * NOTE: Not all nodes will show notices dot depending on the renderer, the
   *  zoom level, and the type of node.  For example, at the global level the
   *  donut graph nodes will show the text overlay on hover, but not the icon.
   *  If at the service/node zoom level the notice dot and text show, unless you
   *  are using the DNS renderer.
   *    aSqrd-eSqrd, 21-May-2019
   */
  static getNoticeDotGeometry (radius) {
    return getOrSet(noticeDotGeometries, radius, () => {
      const noticeShape = new THREE.Shape();
      const dotRadius = radius * 0.5;
      noticeShape.moveTo(dotRadius, 0);
      noticeShape.absarc(0, 0, dotRadius, 0, 2 * Math.PI, false);
      return new THREE.ShapeGeometry(noticeShape, curveSegments);
    });
  }
}

export default NodeView;
