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
  constructor (node) {
    this.customNode = {};
    this.customNode.innergeometry = this._createInnerGeometry(16, 32);
    this.customNode.outerborder = this._createOuterBorder(10, 32);

    if (node.nodeStatus && GlobalStyles.styles.colorNodeStatus[node.nodeStatus]) {
      this.customNode.material = this._createMaterial(GlobalStyles.styles.colorNodeStatus[node.nodeStatus]);
    } else {
      this.customNode.material = this._createMaterial(GlobalStyles.styles.colorNodeStatus.default);
    }

    this.customNode.bordermaterial = this._createMaterial(GlobalStyles.styles.colorShapeBorder);
    return this.customNode;
  }

  _createOuterBorder (radius, curveSegments) {
    const border = new THREE.Shape();
    border.absarc(0, 0, radius * 3.2, 0, Math.PI * 2, false);
    const hole = new THREE.Shape();
    hole.absarc(0, 0, radius * 3, 0, Math.PI * 2, false);
    border.holes.push(hole);

    return new THREE.ShapeGeometry(border, curveSegments);
  }

  _createMaterial (rgb) {
    return new THREE.MeshBasicMaterial({ color: rgb });
  }

}

export default ShapeParent;
