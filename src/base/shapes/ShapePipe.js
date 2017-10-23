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
import * as THREE from 'three';
import GlobalStyles from '../../globalStyles';
import ShapesFactory from '../ShapesFactory';
import ShapesUtils from '../ShapesUtils';

class ShapePipe {
  constructor () {
    this.customNode = {};
    this.customNode.innergeometry = this._createInnerGeometry(16, 32);
    this.customNode.outerborder = this._createOuterBorder(10, 32);
    this.customNode.material = this._createMaterial(GlobalStyles.shapesStyles.colorShapePipe);
    this.customNode.bordermaterial = this._createMaterial(GlobalStyles.shapesStyles.colorShapeBorder);
    return this.customNode;
  }

  _createInnerGeometry (radius, curveSegments) {
    const rawPolyString = '37.65 16.09 36.83 18.08 35.67 19.91 34.21 21.51 19.08 36.38 17.16 37.38 15.11 38.03 12.96 38.32 10.8 38.23 8.69 37.77 6.69 36.95 4.87 35.79 3.27 34.34 1.95 32.63 0.94 30.71 0.29 28.65 0 26.51 0.09 24.35 0.55 22.24 1.37 20.24 2.53 18.41 17.41 3.27 19.12 1.95 21.03 0.94 23.09 0.29 25.23 0 27.39 0.09 29.51 0.55 31.51 1.37 33.33 2.53 34.93 3.98 36.25 5.7 37.25 7.61 37.91 9.67 38.2 11.81 38.11 13.97 37.65 16.09';
    const polyShape = ShapesUtils.getShapeFromPolyPoints(rawPolyString, ' ', -20, -20);

    const holeShape = new THREE.Shape();
    holeShape.moveTo(radius / 2, 0);
    holeShape.absarc(6, -9, radius / 2, 0, 2 * Math.PI, false);
    polyShape.holes.push(holeShape);

    return new THREE.ShapeGeometry(polyShape, curveSegments);
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
ShapesFactory.registerShape('pipe', ShapePipe);
export default ShapePipe;
