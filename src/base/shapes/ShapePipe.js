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

class ShapePipe extends ShapeParent {
  _createInnerGeometry (radius, curveSegments) {
    const rawPolyString = '37.65 16.09 36.83 18.08 35.67 19.91 34.21 21.51 19.08 36.38 17.16 37.38 15.11 38.03 12.96 38.32 10.8 38.23 8.69 37.77 6.69 36.95 4.87 35.79 3.27 34.34 1.95 32.63 0.94 30.71 0.29 28.65 0 26.51 0.09 24.35 0.55 22.24 1.37 20.24 2.53 18.41 17.41 3.27 19.12 1.95 21.03 0.94 23.09 0.29 25.23 0 27.39 0.09 29.51 0.55 31.51 1.37 33.33 2.53 34.93 3.98 36.25 5.7 37.25 7.61 37.91 9.67 38.2 11.81 38.11 13.97 37.65 16.09';
    // X-offset: -19.1, Y-offset: -19.16 puts the center of the shape at (0,0)
    const polyShape = ShapesFactory.getShapeFromPolyPoints(rawPolyString, ' ', -19.1, -19.16);

    const holeShape = new THREE.Shape();
    holeShape.absarc(8, -7.7, radius / 2, 0, 2 * Math.PI, false);
    polyShape.holes.push(holeShape);

    return new THREE.ShapeGeometry(polyShape, curveSegments);
  }
}
ShapesFactory.registerShape('pipe', ShapePipe);
export default ShapePipe;
