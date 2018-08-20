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
const ShapesFactory = {};
ShapesFactory.shapes = [];
ShapesFactory.registerShape = function (shapeName, shapeClass) {
  if (ShapesFactory.shapes[shapeName] === undefined) {
    ShapesFactory.shapes[shapeName] = shapeClass;
  }
};

ShapesFactory.getShape = function (node, radius) {
  const shapeName = node.node_type;
  if (ShapesFactory.shapes[shapeName]) {
    return new ShapesFactory.shapes[shapeName](node, radius);
  }
  return new ShapesFactory.shapes.default(node, radius);
};

export default ShapesFactory;
