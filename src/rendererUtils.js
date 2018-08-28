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

const Console = console;

class RendererUtils {
  constructor () {
    this.scale = 1;
  }

  setRenderer (renderer) {
    this.renderer = renderer;
  }

  setCamera (camera) {
    this.camera = camera;
  }

  setScale (scale) {
    this.scale = scale;
  }

  /**
   * @typedef Dimensions
   * @type Object
   * @property {number} x The X screen coordinate
   * @property {number} y The Y screen coordinate
   * @property {number} width The width of the object in screen coordinates
   * @property {number} height The height of the object in screen coordinates
   */

  /**
   * Translate the location of a THREE.Object3D rendered by the Three.js renderer in screen coordinates
   * relative to the renderer's dom element
   *
   * @param  {Object} obj The THREE.js Object3D() to calculate screen dimensions for
   * @param  {string} [anchorPoint] The anchor point to map to screen coordinates; Undefined is middle, TL or BL
   * @returns {Dimensions} The x,y anchor point and the width and height of the object
   */
  toScreenPosition (obj, anchorPoint) {
    if (!obj) { return undefined; }
    if (!this.renderer || !this.camera) {
      if (!this.renderer) {
        Console.error('Attempted to generate screen position using RendererUtils without a renderer. Make sure to setRenderer() before toScreenPosition');
      }
      if (!this.camera) {
        Console.error('Attempted to generate screen position using RendererUtils without a camera. Make sure to setCamera() before toScreenPosition');
      }
      return undefined;
    }

    // Get the x,y center position
    let vector = new THREE.Vector3();

    // First set the vector to the object matrix
    vector.setFromMatrixPosition(obj.matrixWorld);

    vector = this.vectorToScreenPosition(vector);
    // Get the width/height of the object
    obj.updateMatrixWorld();
    const boundingBox = new THREE.Box3();
    boundingBox.setFromObject(obj);

    const objectWidth = (boundingBox.max.x - boundingBox.min.x) * this.scale;
    const objectHeight = (boundingBox.max.y - boundingBox.min.y) * this.scale;

    let x;
    let y;
    if (!anchorPoint) {
      ({ x, y } = vector);
    } else if (anchorPoint === 'TL') {
      x = vector.x - (objectWidth / 2);
      y = vector.y - (objectHeight / 2);
    } else if (anchorPoint === 'BL') {
      x = vector.x - (objectWidth / 2);
      y = vector.y + (objectHeight / 2);
    }

    return {
      x: x,
      y: y,
      width: objectWidth,
      height: objectHeight
    };
  }

  vectorToScreenPosition (vector) {
    const screenVector = vector.clone();
    screenVector.project(this.camera);

    const rendererWidthHalf = 0.5 * this.renderer.context.canvas.clientWidth;
    const rendererHeightHalf = 0.5 * this.renderer.context.canvas.clientHeight;
    screenVector.x = (screenVector.x * rendererWidthHalf) + rendererWidthHalf;
    screenVector.y = -(screenVector.y * rendererHeightHalf) + rendererHeightHalf + 2;

    return screenVector;
  }

  getParent () {
    if (!this.renderer) {
      Console.error('Attempted to getParent() using RendererUtils without a renderer. Make sure to setRenderer() before getParent()');
      return undefined;
    }

    if (this.renderer.domElement) {
      return this.renderer.domElement.parentElement;
    }
    return undefined;
  }
}

export default new RendererUtils();
