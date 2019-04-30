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

class ShapeParent {
  constructor (node, radius) {
    this.customNode = {};
    this.customNode.name = node.node_type ? node.node_type : 'default';
    this.customNode.innerGeometry = this._createInnerGeometry(radius, 32);
    if (this.customNode.innerGeometry) { // Because, the default shape, a.k.a. circle, doesn't have an inner geometry
      this.customNode.innerGeometry.name = `${this.customNode.name}-innerGeom`;
    }
    this.customNode.innerCircleGeometry = this._createInnerCircleGeometry(radius, 32);
    this.customNode.innerCircleGeometry.name = `${this.customNode.name}-innerCircleGeom`;
    this.customNode.outerBorder = this._createOuterBorder(radius, 32);
    this.customNode.outerBorder.name = `${this.customNode.name}-outerBorder`;

    if (node.nodeStatus && GlobalStyles.styles.colorNodeStatus[node.nodeStatus]) {
      this.customNode.material = this._createMaterial(GlobalStyles.styles.colorNodeStatus[node.nodeStatus]);
    } else {
      this.customNode.material = this._createMaterial(GlobalStyles.getColorTrafficRGBA(node.getClass()));
    }

    this.customNode.borderMaterial = this._createMaterial(GlobalStyles.getColorTrafficRGBA(node.getClass()));
    return this.customNode;
  }

  _createInnerCircleGeometry (radius, curveSegments) {
    const circleShape = new THREE.Shape();
    circleShape.moveTo(radius, 0);
    circleShape.absarc(0, 0, radius * 2, 0, 2 * Math.PI, false);
    return new THREE.ShapeGeometry(circleShape, curveSegments);
  }

  _createInnerGeometry () {
    // No-op
  }

  _createOuterBorder (radius, curveSegments) {
    const border = new THREE.Shape();
    border.moveTo(radius * 2.2, 0);
    border.absarc(0, 0, radius * 2.2, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, radius * 2, 0, Math.PI * 2, true);
    border.holes.push(hole);

    return new THREE.ShapeGeometry(border, curveSegments);
  }

  _createMaterial (rgb) {
    return new THREE.MeshBasicMaterial({ color: rgb, transparent: true, overdraw: 0.5 });
  }

}

export default ShapeParent;
