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

class ShapeUsers extends ShapeParent {
  _createInnerGeometry (radius, curveSegments) {
    const polyStr = '40.7 2.55 40.59 1.55 40.29 0.03 18.02 0 17.78 0.98 17.63 1.97 17.56 2.98 17.58 3.99 17.69 4.99 17.86 5.82 0.46 5.8 0.22 6.78 0.07 7.77 0 8.78 0.02 9.79 0.13 10.79 0.33 11.78 0.61 12.75 0.98 13.69 1.42 14.59 1.95 15.46 2.54 16.27 3.21 17.03 3.94 17.73 4.73 18.36 5.57 18.93 5.95 19.14 5.55 19.6 5.16 20.16 4.82 20.74 4.53 21.36 4.29 22 4.11 22.65 3.99 23.32 3.93 23.99 3.92 24.67 3.98 25.35 4.09 26.02 4.27 26.68 4.5 27.31 4.78 27.93 5.12 28.52 5.5 29.08 5.93 29.6 6.41 30.08 6.93 30.52 7.49 30.91 8.07 31.26 8.69 31.55 9.32 31.78 9.98 31.96 10.64 32.08 11.32 32.15 12 32.15 12.68 32.09 13.35 31.98 14 31.81 14.64 31.58 15.26 31.29 15.85 30.96 16.41 30.57 16.93 30.14 17.41 29.66 17.85 29.14 18.24 28.59 18.58 28 18.87 27.39 19.11 26.75 19.29 26.1 19.41 25.43 19.47 24.75 19.48 24.07 19.42 23.4 19.3 22.73 19.13 22.07 18.9 21.43 18.62 20.82 18.28 20.23 17.9 19.67 17.46 19.14 17.39 19.07 18.01 18.69 18.82 18.1 19.59 17.44 20.28 16.71 20.92 15.93 21.48 15.09 21.96 14.21 22.37 13.29 22.56 12.74 23.13 13.13 23.51 13.34 23.11 13.8 22.72 14.36 22.38 14.95 22.09 15.56 21.85 16.2 21.67 16.85 21.55 17.52 21.49 18.19 21.49 18.87 21.54 19.55 21.66 20.22 21.83 20.88 22.06 21.51 22.34 22.13 22.68 22.72 23.06 23.28 23.5 23.8 23.98 24.28 24.49 24.72 25.05 25.11 25.63 25.46 26.25 25.75 26.88 25.98 27.54 26.16 28.21 26.28 28.88 26.35 29.56 26.35 30.24 26.29 30.91 26.18 31.56 26.01 32.2 25.78 32.82 25.49 33.41 25.16 33.97 24.77 34.49 24.34 34.97 23.86 35.41 23.34 35.8 22.79 36.15 22.2 36.44 21.59 36.67 20.95 36.85 20.3 36.97 19.63 37.03 18.95 37.04 18.27 36.98 17.6 36.87 16.93 36.7 16.27 36.47 15.63 36.18 15.02 35.85 14.43 35.46 13.87 35.03 13.35 34.95 13.27 35.57 12.89 36.39 12.3 37.15 11.64 37.85 10.91 38.48 10.13 39.04 9.29 39.53 8.41 39.93 7.49 40.26 6.54 40.5 5.56 40.65 4.56 40.72 3.56 40.7 2.55';
    // X-offset: -20.36, Y-offset: -16.075 puts the center of the shape at (0,0)
    const newShapes = ShapesFactory.getShapeFromPolyPoints(polyStr, ' ', -20.36, -16.075);

    return new THREE.ShapeGeometry(newShapes, curveSegments);
  }
}
ShapesFactory.registerShape('users', ShapeUsers);
export default ShapeUsers;
