import * as THREE from 'three';

// Require OrbitControls for Panning
const OrbitControls = require('three-orbit-controls')(THREE);


class PanZoomInteraction {

  constructor (vizceral, canvas) {
    this.vizceral = vizceral;
    this.canvas = canvas;
    this.controls = new OrbitControls(this.vizceral.camera, canvas);

    this.controls.maxZoom = 3;
    this.controls.minZoom = 0.5;
    this.controls.enableRotate = false;
    this.controls.enablePan = false;

    this.controls.update();
  }

}

export default PanZoomInteraction;
