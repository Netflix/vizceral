/* eslint-disable no-restricted-properties */
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

/* eslint-disable no-mixed-operators */


import * as THREE from 'three';
import { each } from 'lodash';

import ConnectionView from '../base/connectionView';
import GlobalStyles from '../globalStyles';

const Console = console;

function distance (a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}


function rotate (point, theta) {
  return {
    x: point.x * Math.cos(theta) - point.y * Math.sin(theta),
    y: point.x * Math.sin(theta) + point.y * Math.cos(theta)
  };
}

// Given three points, A B C, find the center of a circle that goes through all three.
function CalculateCircleCenter (A, B, C) {
  const aSlope = (B.y - A.y) / (B.x - A.x);
  const bSlope = (C.y - B.y) / (C.x - B.x);

  if (aSlope === 0 || bSlope === 0) {
    // rotate the points about origin to retry and then rotate the answer back.
    // this should avoid div by zero.
    // we could pick any acute angle here and be garuanteed this will take less than three tries.
    // i've discovered a clever proof for this, but I don't have room in the margin.
    const angle = Math.PI / 3;
    return rotate(CalculateCircleCenter(rotate(A, angle), rotate(B, angle), rotate(C, angle)), -1 * angle);
  }

  const center = {};

  center.x = (aSlope * bSlope * (A.y - C.y) + bSlope * (A.x + B.x) - aSlope * (B.x + C.x)) / (2 * (bSlope - aSlope));
  center.y = -1 * (center.x - (A.x + B.x) / 2) / aSlope + (A.y + B.y) / 2;

  return center;
}

class DnsConnectionView extends ConnectionView {
  constructor (connection) {
    super(connection, 20000, true);

    this.updatePosition();
    this.updateVolume();
  }

  cleanup () {
    super.cleanup();
    each([
      this.annotationMaterial,
      this.annotationTexture,
      this.annotationGeometry,
      this.annotationMesh
    ], (x) => { try { x.dispose(); } catch (e) { Console.log(e); } });
  }

  setParticleLevels () {
    super.setParticleLevels();
    this.maxParticleDelay = 10000;

    // After some testing, it's pretty hard to see the difference in density after
    // 40.  It's still a linear growth curve, but since there is so much overlapping
    // differences much further than 40 are too difficult to spot
    this.maxParticleMultiplier = 10;
  }

  drawAnnotations () {
    if (!this.startPosition) {
      return;
    }

    const dx = this.startPosition.x - this.endPosition.x;
    const dy = this.startPosition.y - this.endPosition.y;
    const width = Math.floor(Math.sqrt(dx * dx + dy * dy));

    if (width === 0) {
      return;
    }

    const bump = 40;

    // make sure we are tall enough for all the annotations.
    const height = this.object.annotations ? this.object.annotations.length * bump * 4 : 0;
    if (this.object.annotations && this.object.annotations.length > 0 && !this.annotationCanvas) {
      this.annotationCanvas = this.createCanvas(width, height);
      this.annotationTexture = new THREE.Texture(this.annotationCanvas);
      this.annotationTexture.minFilter = THREE.LinearFilter;
      this.annotationMaterial = new THREE.MeshBasicMaterial({ map: this.annotationTexture, side: THREE.DoubleSide, transparent: true });
      this.annotationGeometry = new THREE.PlaneBufferGeometry(this.annotationCanvas.width, this.annotationCanvas.height);
      this.annotationMesh = new THREE.Mesh(this.annotationGeometry, this.annotationMaterial);
      this.container.add(this.annotationMesh);

      // TODO: If the connection ever moves, the annotation will have to be moved too.  This had to go here so we wouldn't just rotate it every time.
      // initially the connection canvas is flat at 0,0 in screen space, so we need to move it and rotate
      this.annotationMesh.position.set((this.startPosition.x + this.endPosition.x) / 2, (this.startPosition.y + this.endPosition.y) / 2, 0);
      this.annotationMesh.rotateZ(Math.atan2((this.endPosition.y - this.startPosition.y), (this.endPosition.x - this.startPosition.x)));
    }


    if (this.annotationCanvas) {
      const ctx = this.annotationCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.annotationCanvas.width, this.annotationCanvas.height);
      ctx.fillStyle = 'rgba(255,255,255,0.125)';

      const nodeRadius = this.object.source.getView().radius;


      each(this.object.annotations, (annotation, index) => {
        drawArrowHalfHead(ctx, width, height, bump, nodeRadius, GlobalStyles.getColorTraffic(annotation.class), index + 1);
        if (annotation.label) {
          drawText(ctx, width, height, bump, annotation.label, GlobalStyles.getColorTraffic(annotation.class), index + 1);
        }
      });

      this.annotationTexture.needsUpdate = true;
    }
  }

  updatePosition (depthOnly) {
    super.updatePosition(depthOnly);
    this.drawAnnotations();
  }

  updateVolume () {
    super.updateVolume();
    this.drawAnnotations();
  }
}

function drawText (ctx, width, height, bump, text, style, i) {
  const headerFontSize = bump * 0.75;

  ctx.fillStyle = style;
  ctx.font = `700 ${headerFontSize}px 'Source Sans Pro', sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, width / 2, height / 2 - i * bump);
}

function drawCircle (ctx, point, startAngle, endAngle, radius, style) {
  ctx.strokeStyle = style;
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, startAngle, endAngle);
  ctx.stroke();
}

function drawArrowHalfHead (ctx, width, height, bump, nodeRadius, style, i) {
  const stubRadius = bump; // size of the arrow half-head

  const start = {
    x: nodeRadius,
    y: height / 2
  };

  const end = {
    x: width - nodeRadius,
    y: height / 2
  };


  // find the angle perpendicular to the vector between start and end on the clockwise side.
  let theta = Math.atan((end.y - start.y) / (end.x - start.x));
  if (start.x <= end.x) {
    theta -= Math.PI / 2;
  } else {
    theta += Math.PI / 2;
  }

  // find a point perpendicular to the segment between start and end that is `bump` distance away.
  const offset = {
    x: (end.x + start.x) / 2 + Math.cos(theta) * bump * i,
    y: (end.y + start.y) / 2 + Math.sin(theta) * bump * i
  };

  // get the center of the circle whose arc goes through all three points, its radius and connect the dots
  const center = CalculateCircleCenter(start, end, offset);
  const radius = Math.sqrt(Math.pow(start.x - center.x, 2) + Math.pow(start.y - center.y, 2));
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const endAngle = Math.atan2(end.y - center.y, end.x - center.x);
  drawCircle(ctx, center, startAngle, endAngle, radius, style);

  // to draw the arrowhead, we create a small circle opposite the end point from the main arc's center
  const t2 = Math.atan((end.y - center.y) / (end.x - center.x));
  let stubCenter = {
    x: end.x + Math.cos(t2) * stubRadius,
    y: end.y + Math.sin(t2) * stubRadius
  };

  // if we didn't actually go on the *opposite* side of the end point, make sure we do that ;)
  if (distance(stubCenter, center) < distance(end, center)) {
    stubCenter = {
      x: end.x - Math.cos(t2) * stubRadius,
      y: end.y - Math.sin(t2) * stubRadius
    };
  }

  const stubAngle = Math.atan2(end.y - stubCenter.y, end.x - stubCenter.x);
  drawCircle(ctx, stubCenter, stubAngle, stubAngle + Math.PI / 4, stubRadius, style);
}

export default DnsConnectionView;
