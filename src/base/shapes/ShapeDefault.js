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
import ShapesFactory from '../ShapesFactory';
import ShapeParent from './ShapeParent';

class ShapeDefault extends ShapeParent {
  _createInnerGeometry () {
    const radius = 16;
    const curveSegments = 32;
    const circleShape = new THREE.Shape();
    circleShape.moveTo(radius, 0);
    circleShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
    const holeShape = new THREE.Shape();
    holeShape.moveTo(radius, 0);
    holeShape.absarc(0, 0, radius, 0, 2 * Math.PI, false);
    circleShape.holes.push(holeShape);
    return new THREE.ShapeGeometry(circleShape, curveSegments);
  }

  _createOuterBorder () {
    const radius = 16;
    const curveSegments = 32;
    const border = new THREE.Shape();
    border.absarc(0, 0, radius + 2, 0, Math.PI * 2, false);
    const borderHole = new THREE.Path();
    borderHole.absarc(0, 0, radius, 0, Math.PI * 2, true);
    border.holes.push(borderHole);
    return new THREE.ShapeGeometry(border, curveSegments);
  }
}
ShapesFactory.registerShape('default', ShapeDefault);
export default ShapeDefault;
