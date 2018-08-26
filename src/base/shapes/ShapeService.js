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
import ShapesFactory from '../ShapesFactory';
import ShapesUtils from '../ShapesUtils';

class ShapeService {
  constructor () {
    this.customNode = {};
    this.customNode.innergeometry = this._createInnerGeometry(16, 32);
    this.customNode.outerborder = this._createOuterBorder(10, 32);
    this.customNode.material = this._createMaterial(GlobalStyles.shapesStyles.colorShapeService);
    this.customNode.bordermaterial = this._createMaterial(GlobalStyles.shapesStyles.colorShapeBorder);

    return this.customNode;
  }

  _createInnerGeometry (radius, curveSegments) {
    const shapes = [];
    const shapeCircle = new THREE.Shape();
    shapeCircle.moveTo(radius, 0);
    shapeCircle.absarc(0, 0, radius - 2, 0, 2 * Math.PI, false);
    shapes.push(shapeCircle);

    const rawPolyString = '29.88 17.06 37.79 9.14 37.77 9.12 37.77 9.12 32.16 3.51 23.84 11.83 23.84 0.03 23.84 0 15.91 0 15.91 0.03 15.91 11.43 8.03 3.56 8.01 3.53 2.39 9.14 2.42 9.17 10.31 17.06 0 17.06 0 17.09 0 25 0 25.03 10.64 25.03 3.21 32.46 3.23 32.48 8.82 38.07 8.85 38.09 15.91 31.03 15.91 40.94 15.91 40.97 23.84 40.97 23.84 40.94 23.84 30.59 31.34 38.09 31.36 38.12 36.98 32.5 36.95 32.48 29.5 25.03 40.94 25.03 40.94 25 40.94 17.09 40.94 17.06 29.88 17.06';
    const polyShape = ShapesUtils.getShapeFromPolyPoints(rawPolyString, ' ', -20, -20);

    shapes.push(polyShape);

    return new THREE.ShapeGeometry(shapes, curveSegments);
  }

  _createOuterBorder (radius, curveSegments) {
    const shapes = [];
    const border = new THREE.Shape();
    border.absarc(0, 0, radius * 3.2, 0, Math.PI * 2, false);
    const hole = new THREE.Shape();
    hole.absarc(0, 0, radius * 3, 0, Math.PI * 2, false);
    border.holes.push(hole);
    shapes.push(border);

    const gearCenter = new THREE.Shape();
    gearCenter.absarc(0, 0, radius / 1.5, 0, Math.PI * 2, false);
    shapes.push(gearCenter);

    return new THREE.ShapeGeometry(shapes, curveSegments);
  }

  _createMaterial (rgb) {
    return new THREE.MeshBasicMaterial({ color: rgb });
  }

}
ShapesFactory.registerShape('service', ShapeService);
export default ShapeService;
