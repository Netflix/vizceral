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

class ShapeUser extends ShapeParent {
  _createInnerGeometry (radius, curveSegments) {
    const polyPath = [
      '38.36 7.58 38.1 9.23 37.7 10.86 37.16 12.44 36.49 13.97 35.68 15.44 34.75 16.83 33.7 18.13 32.53 19.33 31.27 20.43 29.92 21.42 28.88 22.04 29.01 22.17 29.73 23.04 30.37 23.96 30.93 24.94 31.4 25.97 31.78 27.03 32.07 28.12 32.26 29.23 32.35 30.36 32.35 31.48 32.24 32.61 32.04 33.72 31.74 34.8 31.35 35.86 30.87 36.88 30.3 37.86 29.65 38.78 28.92 39.64 28.12 40.43 27.25 41.15 26.32 41.79 25.35 42.35 24.32 42.82 23.26 43.2 22.17 43.49 21.06 43.68 19.93 43.77 18.81 43.77 17.68 43.66 16.57 43.46 15.48 43.16 14.43 42.77 13.41 42.29 12.43 41.72 11.51 41.07 10.65 40.34 9.86 39.54 9.14 38.67 8.5 37.74 7.94 36.77 7.47 35.74 7.09 34.68 6.8 33.59 6.61 32.48 6.52 31.35 6.52 30.22 6.63 29.1 6.83 27.99 7.13 26.9 7.52 25.85 8 24.83 8.57 23.85 9.22 22.93 9.88 22.15 9.25 21.8 7.85 20.87 6.54 19.82 5.33 18.66 4.23 17.39 3.23 16.04 2.36 14.61 1.62 13.1 1.01 11.54 0.55 9.93 0.22 8.29 0.04 6.62 0 4.95 0.11 3.28 0.37 1.63 0.77 0 37.75 0.05 38.25 2.57 38.44 4.23 38.47 5.91 38.36 7.58'
    ];
    // X-offset: -19.235, Y-offset: -21.885 puts the center of the shape at (0,0)
    const newShapes = ShapesFactory.getShapeFromPolyPointsArray(polyPath, ' ', -19.235, -21.885);

    return new THREE.ShapeGeometry(newShapes, curveSegments);
  }
}
ShapesFactory.registerShape('user', ShapeUser);
export default ShapeUser;
