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
import GlobalStyles from '../globalStyles';
import NodeView from '../base/nodeView';
import ShapeParent from '../base/shapes/ShapeParent';


class DnsNodeView extends NodeView {
  constructor (service) {
    super(service);
    this.radius = this.object.size;
    this.curveSegments = 32; // Eventually, use shape to select this, e.g. 32 for circle, 4 for square, etc.
    this.innerRadius = this.radius * 0.8;
    this.meshes.outerBorder = this.addChildElement(ShapeParent.getOuterBorderGeometry(this.radius, this.curveSegments), this.borderMaterial);
    this.meshes.innerCircle = this.addChildElement(ShapeParent.getInnerCircleGeometry(this.radius, this.curveSegments), this.innerCircleMaterial);
    this.meshes.innerCircle.position.setZ(-10);


    this.canvasWidth = this.innerRadius * 2;
    this.canvasHeight = this.canvasWidth;

    this.textCanvas = this.createCanvas(this.canvasWidth, this.canvasHeight);
    this.textTexture = new THREE.Texture(this.textCanvas);
    this.textTexture.minFilter = THREE.LinearFilter;
    this.textTexture.needsUpdate = true;

    this.textMaterial = new THREE.MeshBasicMaterial({ map: this.textTexture, side: THREE.DoubleSide, transparent: true });
    const text = new THREE.Mesh(new THREE.PlaneBufferGeometry(this.textCanvas.width, this.textCanvas.height), this.textMaterial);
    this.container.add(text);
    this.addInteractiveChild(text);
    text.position.set(0, 0, this.depth + 1);


    const textContext = this.textCanvas.getContext('2d');
    let top = 0;
    textContext.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);

    this.headerFontSize = (this.canvasHeight) * 0.2;
    textContext.fillStyle = GlobalStyles.getColorTraffic(this.object.getClass());
    textContext.font = `700 ${this.headerFontSize}px 'Source Sans Pro', sans-serif`;

    top += (this.canvasWidth / 2);
    textContext.fillText(this.object.getDisplayName(), this.textCanvas.width / 2, top);

    this.textTexture.needsUpdate = true;
  }
}

export default DnsNodeView;
