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
import _ from 'lodash';
import { knuthShuffle as shuffle } from 'knuth-shuffle';
import * as THREE from 'three';

import BaseView from './baseView';
import ConnectionNoticeView from './connectionNoticeView';
import GlobalStyles from '../globalStyles';
import Constants from './constants';



// Preload textures
const loader = new THREE.TextureLoader();

// Preload the particle texture
const particle = require('url!./particleD.png'); // eslint-disable-line import/no-extraneous-dependencies

let particleTexture;
loader.load(particle, texture => { particleTexture = texture; });

const trafficFragmentShader = `
uniform vec3 color;
uniform sampler2D texture;

varying float vCustomOpacity;
varying float vOpacity;
varying vec3 vColor;

void main() {

  gl_FragColor = vec4( color * vColor, vOpacity * vCustomOpacity );
  gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );

}
`;

const trafficVertexShader = `
uniform float opacity;
uniform float amplitude;

attribute float customOpacity;
attribute float size;
attribute vec3 customColor;

varying float vCustomOpacity;
varying float vOpacity;
varying vec3 vColor;

void main() {
  vColor = customColor;
  vOpacity = opacity;
  vCustomOpacity = customOpacity;

  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
  gl_PointSize = size;
  gl_Position = projectionMatrix * mvPosition;
}
`;


const baseShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {},
  vertexShader: trafficVertexShader,
  fragmentShader: trafficFragmentShader,
  blending: THREE.NormalBlending,
  depthTest: true,
  depthWrite: false,
  transparent: true
});

function normalDistribution () {
  return (((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3) / 3) + 0.5;
}

function interpolateValue (val, aMin, aMax, bMin, bMax) {
  const mappedValue = ((val - aMin) / (aMax - aMin)) * (bMax - bMin);
  return bMin + (mappedValue || 0);
}


class ConnectionView extends BaseView {
  constructor (connection, maxParticles, customWidth) {
    super(connection);
    this.setParticleLevels();
    this.maxParticles = maxParticles;
    this.dimmedLevel = 0.05;

    this.centerVector = new THREE.Vector3(0, 0, 0);
    this.length = 0;

    this.uniforms = {
      amplitude: { type: 'f', value: 1.0 },
      color: { type: 'c', value: new THREE.Color(0xFFFFFF) },
      opacity: { type: 'f', value: 1.0 },
      texture: { type: 't', value: particleTexture, transparent: true }
    };

    this.shaderMaterial = baseShaderMaterial.clone();
    this.shaderMaterial.uniforms = this.uniforms;

    const connectionWidth = Math.min(this.object.source.getView().radius, this.object.target.getView().radius) * 0.45;
    const connectionDepth = Math.min(connection.source.getView().getDepth(), (connection.target.getView().getDepth()) / 2) - 2;

    this.geometry = new THREE.BufferGeometry();

    this.lastParticleLaunchTime = 0;
    this.lastParticleIndex = 0;
    this.particleLaunchDelay = Infinity;

    const vertices = new Float32Array(this.maxParticles * 3);
    const customColors = new Float32Array(this.maxParticles * 3);
    const customOpacities = new Float32Array(this.maxParticles);
    const sizes = new Float32Array(this.maxParticles);
    this.velocity = new Float32Array(this.maxParticles * 3); // Don't want to to be doing math in the update loop

    for (let i = 0; i < this.maxParticles; i++) {
      // Position
      vertices[i * 3] = 0;
      vertices[(i * 3) + 1] = customWidth ? connectionWidth - (normalDistribution() * connectionWidth * 2) : 1;
      vertices[(i * 3) + 2] = customWidth ? connectionDepth - (normalDistribution() * connectionDepth * 2) : -2;

      // Custom colors
      customColors[i] = GlobalStyles.threeStyles.colorTraffic.normal.r;
      customColors[i + 1] = GlobalStyles.threeStyles.colorTraffic.normal.g;
      customColors[i + 2] = GlobalStyles.threeStyles.colorTraffic.normal.b;

      customOpacities[i] = 0;
      sizes[i] = 6;
      this.velocity[i * 3] = 3 + (Math.random() * 2);
    }

    this.geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geometry.addAttribute('customColor', new THREE.BufferAttribute(customColors, 3));
    this.geometry.addAttribute('customOpacity', new THREE.BufferAttribute(customOpacities, 1));
    this.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particles = new THREE.Points(this.geometry, this.shaderMaterial);
    this.positionAttr = this.particles.geometry.getAttribute('position');
    this.opacityAttr = this.particles.geometry.getAttribute('customOpacity');

    this.container.add(this.particles);

    // TODO: Use a THREE.Line and THREE.LineBasicMaterial with linewidth for the interactive object...
    // Line used to support interactivity
    this.interactiveLineGeometry = new THREE.Geometry();
    this.interactiveLineMaterial = new THREE.LineBasicMaterial({
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 0
    });
    this.interactiveLine = new THREE.Line(this.interactiveLineGeometry, this.interactiveLineMaterial);
    this.addInteractiveChild(this.interactiveLine);
    this.container.add(this.interactiveLine);

    // Add the connection notice
    this.noticeView = new ConnectionNoticeView(this);
    this.validateNotices();
  }

  setParticleLevels () {
    // Since the update function gets called every 16ms (best case), any delay lower
    // than 16 is effectively the same as setting it to 16.  This is needed for the
    // inflection point at which to switch to use multipliers per update loop.
    this.minParticleDelay = 16;

    // This is a reasonable value that will show __just__ enough particles that the
    // connection is not visibly devoid of particles if there is some traffic on the
    // connection
    this.maxParticleDelay = 1500;

    // After some testing, anything much higher makes particles not reach their
    // destination. We could try increasing the max dots too, if we feel this
    // isn't dense enough
    this.maxParticleMultiplier = 4;

    // The percent of total traffic at which a multiplier needs to start being used
    // because just launching one particle every cycle isn't dense enough
    this.particleInflectionPercent = 0.05;


    // A property defining the number of elements for this.particleMultiplierArray array.
    // Is used for array creation and index calculation
    this.numParticleMultiplier = 100;
  }

  setOpacity (opacity) {
    super.setOpacity(opacity);
    this.uniforms.opacity.value = opacity;

    if (this.object.hasNotices()) {
      this.noticeView.setOpacity(opacity);
    }
  }

  updatePosition (depthOnly) {
    this.depth = this.dimmed ? Constants.DEPTH.dimmedConnection : Constants.DEPTH.normalConnection;

    // Position and rotate the connection to be between the two nodes
    this.startPosition = this.object.source.getView().container.position;
    this.endPosition = this.object.target.getView().container.position;
    const start = new THREE.Vector3(this.startPosition.x, this.startPosition.y, this.depth);
    this.particles.position.set(start.x, start.y, start.z);

    if (!depthOnly) {
      // particles
      const centerX = (this.startPosition.x + this.endPosition.x) / 2;
      const centerY = (this.startPosition.y + this.endPosition.y) / 2;
      this.centerVector = new THREE.Vector3(centerX, centerY, this.depth);
      const end = new THREE.Vector3(this.endPosition.x, this.endPosition.y, this.depth);
      const direction = new THREE.Vector3().copy(end).sub(start).normalize();
      this.particles.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction);

      // update length to know how far particles are to travel
      this.length = start.distanceTo(end);

      // interactivity
      this.interactiveLine.geometry.vertices[0] = start;
      this.interactiveLine.geometry.vertices[1] = end;
      this.interactiveLine.geometry.verticesNeedUpdate = true;
      this.interactiveLine.geometry.computeBoundingSphere();
    }

    if (this.noticeView) {
      this.noticeView.updatePosition();
    }
  }

  validateNotices () {
    if (this.object.hasNotices()) {
      this.noticeView.updateNoticeIcon();
      this.addInteractiveChildren(this.noticeView.getInteractiveChildren());
      this.container.add(this.noticeView.container);
    } else {
      this.removeInteractiveChildren(this.noticeView.getInteractiveChildren());
      this.container.remove(this.noticeView.container);
    }
  }

  updateVolume () {
    // We need the highest RPS connection to make this volume relative against
    if (!this.object.volumeGreatest) { return; }

    // Set particle launch delay as an inverse proportion of RPS, with 0.1 being the shortest possible delay
    const percentageOfParticles = Math.min(this.object.getVolumeTotal() / this.object.volumeGreatest, 1);

    this.particleMultiplier = 1;
    const maxThreshold = 1000 / this.maxParticleDelay;
    if (!percentageOfParticles) {
      this.particleLaunchDelay = Infinity;
    } else if (this.object.getVolumeTotal() < maxThreshold) {
      this.particleLaunchDelay = interpolateValue(this.object.getVolumeTotal(), 0, maxThreshold, 20000, this.maxParticleDelay);
    } else if (percentageOfParticles < this.particleInflectionPercent) {
      this.particleLaunchDelay = interpolateValue(percentageOfParticles, 0, this.particleInflectionPercent, this.maxParticleDelay, 16);
    } else {
      this.particleLaunchDelay = this.minParticleDelay;
      this.particleMultiplier = interpolateValue(percentageOfParticles, this.particleInflectionPercent, 1, 1, this.maxParticleMultiplier);
    }
    // console.log(`${this.object.getName()} - delay: ${this.particleLaunchDelay}, multiplier: ${this.particleMultiplier}`);

    // Set the appropriate multiplier values for the percentage of particles
    // required.  Fractional multipliers have to use a randomized array of 0/1
    // that iterates each update loop to launch the particles.
    this.particleMultiplierArray = Array(this.numParticleMultiplier).fill(0);
    const particleMultiplierFraction = Math.floor((this.particleMultiplier % 1) * this.numParticleMultiplier);
    if (particleMultiplierFraction !== 0) {
      this.particleMultiplierArray = shuffle(this.particleMultiplierArray.fill(1, 0, particleMultiplierFraction));
      this.particleMultiplier = Math.floor(this.particleMultiplier);
    }
    this.particleMultiplierArrayCounter = 0;

    // Show an approximation of the data at initial load so it does not look
    // like the traffic just started flowing when the app is launched
    if (!this.hasData) {
      this.hasData = true;
      // FIXME: Since we update position every 'tick', we have to pretend here.
      //        Once we switch to an actual velocity based change, we don't need
      //        to fudge numbers
      const msFudge = 15; // move it this.velocity every msFudge
      const delta = Math.max(Math.ceil(this.particleLaunchDelay / msFudge), 1) * this.velocity[0];
      let numberOfParticleLaunches = (this.maxParticles * percentageOfParticles) / this.particleMultiplier;
      if (this.length) {
        numberOfParticleLaunches = Math.min(this.length / delta, numberOfParticleLaunches);
      }
      for (let i = 0; i < numberOfParticleLaunches; i++) {
        this.launchParticles(0, this.particleMultiplier, delta * (i + 1));
      }
    }
  }

  launchParticles (currentTime, numberOfParticles, startX) {
    let rand; // eslint-disable-line prefer-const
    let i;
    numberOfParticles = numberOfParticles || 1;
    startX = startX || 0;

    if (this.particleMultiplierArray[this.particleMultiplierArrayCounter]) {
      numberOfParticles++;
    }

    for (i = 0; i < numberOfParticles; i++) {
      rand = Math.random();
      // Get/set the x position for the last particle index
      this.positionAttr.setX(this.lastParticleIndex, startX + rand);
      this.positionAttr.needsUpdate = true;

      this.opacityAttr.array[this.lastParticleIndex] = 1.0;
      this.opacityAttr.needsUpdate = true;

      let color = GlobalStyles.threeStyles.colorTraffic.normal;
      for (const index in this.object.volumePercentKeysSorted) { // eslint-disable-line no-restricted-syntax, guard-for-in
        const key = this.object.volumePercentKeysSorted[index];
        if (this.object.volumePercent[key] > rand) {
          color = GlobalStyles.getColorTrafficThree(key);
          break;
        }
      }
      this.setParticleColor(this.lastParticleIndex, color);

      this.lastParticleLaunchTime = currentTime;
      this.lastParticleIndex++;
      if (this.lastParticleIndex === this.maxParticles) {
        this.lastParticleIndex = 0;
      }
    }

    // start at 0 if the max value is reached
    this.particleMultiplierArrayCounter = (this.particleMultiplierArrayCounter + 1) % this.numParticleMultiplier;
  }

  update (currentTime) {
    let vx;
    let i;
    if (currentTime - this.lastParticleLaunchTime > this.particleLaunchDelay) {
      // start a new particle
      this.launchParticles(currentTime, this.particleMultiplier);
    }

    // TODO: Support a deltaX based on last time updated.  We tried this, and
    //       because of weird rendering buffers in THREE, the animation hiccups
    //       made doing it this way MUCH worse.  Keeping it as is until we can
    //       attack the issue with THREE...

    // Update the position of all particles in flight
    for (i = 0; i < this.positionAttr.array.length; i += 3) {
      vx = this.positionAttr.array[i];

      if (vx !== 0) {
        vx += this.velocity[i];
        if (vx >= this.length) {
          vx = 0;
        }
      }
      this.positionAttr.array[i] = vx;
    }
    this.positionAttr.needsUpdate = true;
  }

  refresh () {
    this.validateNotices();
  }

  setParticleColor (index, color) {
    const colorAttr = this.particles.geometry.getAttribute('customColor');
    colorAttr.setXYZ(index, color.r, color.g, color.b);
    colorAttr.needsUpdate = true;
  }

  setParticleSize (index, size) {
    const sizeAttribute = this.particles.geometry.getAttribute('size');
    if (sizeAttribute) {
      sizeAttribute.setX(index, size);
      sizeAttribute.needsUpdate = true;
    }
  }

  cleanup () {
    this.geometry.dispose();
    this.shaderMaterial.dispose();
    this.interactiveLineGeometry.dispose();
    this.interactiveLineMaterial.dispose();
  }
}

export default ConnectionView;
