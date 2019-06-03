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

class ShapeAzure extends ShapeParent {
  _createInnerGeometry (radius, curveSegments) {
    const polyPath = [
      '0,3,14,35,23,42,14,3,0,3',
      '20,23,24,42,42,0,10,1,35,5,20,23'
    ];
    // X-offset: -21, Y-offset: -21 puts the center of the shape at (0,0), but visual since it is
    // a triangle it doesn't look quite right vertically, hence the Y-offset of -17.
    const newShapes = ShapesFactory.getShapeFromPolyPointsArray(polyPath, ',', -21, -17);

    return new THREE.ShapeGeometry(newShapes, curveSegments);
  }
}
ShapesFactory.registerShape('azure', ShapeAzure);
export default ShapeAzure;
