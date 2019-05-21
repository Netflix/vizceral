/**
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
import GlobalStyles from '../../globalStyles';

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

const outerBorderGeometries = {};
const innerCircleGeometries = {};

class ShapeParent {
  constructor (node, radius) {
    this.customNode = {};
    this.customNode.name = node.node_type ? node.node_type : 'default';

    // Inner Geometry, a.k.a. the special shape/icon, default is none
    this.customNode.innerGeometry = this._createInnerGeometry(radius, 32);
    if (this.customNode.innerGeometry) { // Because, the default shape, a.k.a. circle, doesn't have an inner geometry
      this.customNode.innerGeometry.name = `${this.customNode.name}-innerGeom`;
      this.customNode.innerGeometry.computeBoundingSphere();

      /** Scale
       * NOTE: While recentering all the awesome shapes @vshamgin made so that the origin of each icon was (0,0) I
       *  calculated the width in the X and Y direction.  The largest icon dimension was for the User shape at 43.77
       *  units in the y-direction.  Divide that in half to get radius if 21.855.  The radius of all node's is
       *  hardcoded (was as of 30-Apr-19) to 16 units. The exception is focused nodes, but the custom shapes/inner
       *  icon work doesn't apply to focused nodes.  I did the developmental work by multiplying the radius of the
       *  custom shape, i.e. outer border, inner circle by 2.2*radius = 35.2.  This 2.2 factor was applied locally
       *  in this file (ShapeParent).
       *
       * NOTE: Once all that worked, I solved used 2.1 as the scaling factor for the inner geometry/icon and solved
       *  to get a scaling factor that would nicely fit the inner geometries/icons inside a border radius=16, i.e.
       *  1/2.1 = scale to use for inner geometry/icon.
       *  This makes all the nodes have the same exterior dimensions and thus the labels are placed properly.
       *
       * TODO: the positioning of the labels is not "radius" or "scale" aware, so if you make any node have
       *       a radius other than the standard 16 units defined in nodeViewStandard the labels will be
       *       overlapping (radius > 16) or awkwardly far from the node (radius < 16)
       * aSqrd-eSqrd, 30-Apr-2019
       */
      this.scale(0.47619); // Scales the icon/inner geometry to fit inside the circle
    }

    this.customNode.innerCircleGeometry = ShapeParent.getInnerCircleGeometry(radius, 32);
    this.customNode.innerCircleGeometry.name = `${this.customNode.name}-innerCircleGeom`;

    this.customNode.outerBorder = ShapeParent.getOuterBorderGeometry(radius, 32);
    this.customNode.outerBorder.name = `${this.customNode.name}-outerBorder`;

    // Set Inner Geometry/Icon's color based on nodeStatus (if present)
    if (node.nodeStatus && GlobalStyles.styles.colorNodeStatus[node.nodeStatus]) {
      // NOTE: This is an example of how one might create/access a customized method to set the icon's color
      // this.customNode.material = this._createMaterial(GlobalStyles.styles.colorNodeStatus[node.nodeStatus]);
      this.customNode.material = this._createMaterial(GlobalStyles.getColorTrafficRGBA(node.getClass()));
    } else {
      this.customNode.material = this._createMaterial(GlobalStyles.getColorTrafficRGBA(node.getClass()));
    }

    // Material for Outer Border Geometry
    this.customNode.borderMaterial = this._createMaterial(GlobalStyles.getColorTrafficRGBA(node.getClass()));
    return this.customNode;
  }

  // Scale the inner geometry/icon ONLY
  scale (factor) {
    const scaleParams = new Array(3).fill(factor);
    this.customNode.innerGeometry.scale(...scaleParams);
  }

  // ORIGINAL VERSION -- no geometery reuse
  // // The Inner Circle Geometry. Used to "hide" the connection line and particles behind/under the node
  // _createInnerCircleGeometry (radius, curveSegments) {
  //   const circleShape = new THREE.Shape();
  //   circleShape.moveTo(radius, 0);
  //   circleShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
  //   return new THREE.ShapeGeometry(circleShape, curveSegments);
  // }

  // The Inner Circle Geometry. Used to "hide" the connection line and particles behind/under the node
  static getInnerCircleGeometry (radius, curveSegments) {
    return getOrSet(innerCircleGeometries, radius, () => {
      const circleShape = new THREE.Shape();
      circleShape.moveTo(radius, 0);
      circleShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
      return new THREE.ShapeGeometry(circleShape, curveSegments);
    });
  }

  // Inner Geometry/Icon.
  _createInnerGeometry () {
    // No-op
  }

  // ORIGINAL VERSION -- no geometery reuse
  // // The Outer Border Geometry. The ring that is the node
  // _createOuterBorder (radius, curveSegments) {
  //   const border = new THREE.Shape();
  //   border.moveTo(radius, 0);
  //   border.absarc(0, 0, radius + 2, 0, Math.PI * 2, false);
  //   const hole = new THREE.Path();
  //   hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
  //   border.holes.push(hole);
  //   return new THREE.ShapeGeometry(border, curveSegments);
  // }

  // The Outer Border Geometry. The ring that is the node
  static getOuterBorderGeometry (radius, curveSegments) {
    return getOrSet(outerBorderGeometries, radius, () => {
      const border = new THREE.Shape();
      border.absarc(0, 0, radius + 2, 0, Math.PI * 2, false);
      const borderHole = new THREE.Path();
      borderHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
      border.holes.push(borderHole);
      return new THREE.ShapeGeometry(border, curveSegments);
    });
  }

  // Helper for setting the color and opacity of a new MeshBasicMaterial
  _createMaterial (rgba) {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(rgba.r, rgba.g, rgba.b), transparent: true, opacity: rgba.a, overdraw: 0.5
    });
  }
}

export default ShapeParent;
