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

import ConnectionView from '../base/connectionView';
import GlobalStyles from '../globalStyles';

class RegionConnectionView extends ConnectionView {
  constructor (connection) {
    super(connection, 650, false);

    // Add the connection line
    this.lineColor = GlobalStyles.rgba.colorConnectionLine;
    this.connectionLineGeometry = new THREE.Geometry();
    this.connectionLineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.lineColor.r, this.lineColor.g, this.lineColor.b),
      blending: THREE.AdditiveBlending,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: this.lineColor.a
    });
    this.connectionLine = new THREE.Line(this.connectionLineGeometry, this.connectionLineMaterial);
    this.container.add(this.connectionLine);
    this.updatePosition();
    this.updateVolume();
  }

  positionConnectingLine () {
    const start = new THREE.Vector3(this.startPosition.x, this.startPosition.y, this.depth - 1);
    const end = new THREE.Vector3(this.endPosition.x, this.endPosition.y, this.depth - 1);

    this.connectionLine.geometry.vertices[0] = start;
    this.connectionLine.geometry.vertices[1] = end;
    this.connectionLine.geometry.verticesNeedUpdate = true;
  }

  updatePosition (depthOnly) {
    super.updatePosition(depthOnly);
    if (this.connectionLine) {
      this.positionConnectingLine();
    }
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.connectionLine.material.opacity = opacity * this.lineColor.a;
  }

  cleanup () {
    super.cleanup();
    this.connectionLineGeometry.dispose();
    this.connectionLineMaterial.dispose();
  }

  setParticleLevels () {
    super.setParticleLevels();
    this.minAvgTicksBetweenRelease = 120;
  }
}

export default RegionConnectionView;
