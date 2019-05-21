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

class ShapeStorage extends ShapeParent {
  _createInnerGeometry (radius, curveSegments) {
    const polyPath = [
      '23,28,19,28.1,11.9,28.8,6.2,30.1,2.7,31.9,2,33,2,31,2,29,2.4,27.8,5.5,25.6,11,24,18.4,23.1,22.5,23,26.6,23.1,34,24,39.5,25.6,42.6,27.8,43,29,43,31,43,33,42.3,31.9,39.1,30.1,33.8,28.8,26.9,28.1,23,28,23,28',
      '23,20,19,20.1,11.9,20.8,6.2,22.1,2.7,23.9,2,25,2,23,2,21,2.4,19.8,5.5,17.6,11,16,18.4,15.1,22.5,15,26.6,15.1,34,16,39.5,17.6,42.6,19.8,43,21,43,23,43,25,42.3,23.9,39.1,22.1,33.8,20.8,26.9,20.1,23,20,23,20',
      '23,12,19,12.1,11.9,12.8,6.2,14.1,2.7,15.9,2,17,2,15,2,13,2.4,11.8,5.5,9.6,11,8,18.4,7.1,22.5,7,26.6,7.1,34,8,39.5,9.6,42.6,11.8,43,13,43,15,43,17,42.3,15.9,39.1,14.1,33.8,12.8,26.9,12.1,23,12,23,12',
      '43,35,42.6,33.8,39.5,31.6,34,30,26.6,29.1,22.5,29,18.4,29.1,11,30,5.5,31.6,2.4,33.8,2,35,2,35.7,2,37,2,38.3,2,39,2.4,40.2,5.5,42.4,11,44,18.4,44.9,22.5,45,26.6,44.9,34,44,39.5,42.4,42.6,40.2,43,39,43,38.3,43,37,43,35.7,43,35,43,35'
    ];

    // X-offset: -22.5, Y-offset: -26 puts the center of the shape at (0,0)
    const newShapes = ShapesFactory.getShapeFromPolyPointsArray(polyPath, ',', -22.5, -26);

    return new THREE.ShapeGeometry(newShapes, curveSegments);
  }
}
ShapesFactory.registerShape('storage', ShapeStorage);
export default ShapeStorage;
