import { Vector2 } from 'three';

function getMouseLocInVPSpace (event, r) {
  r.x = event.clientX;
  r.y = event.clientY;
  return r;
}

const canCoerceToFiniteDouble = isFinite;
const DOUBLE_NAN = NaN;
function isFiniteDouble (v) {
  return typeof v === 'number' && canCoerceToFiniteDouble(v);
}
const Console = console;
const doubleSqrt = Math.sqrt;

class MoveNodeInteraction {
  constructor (vizceral) {
    this.vizceral = vizceral;

    this._onCanvasMouseDown_func = event => this.onCanvasMouseDown(event);
    this.getCanvas().addEventListener('mousedown', this._onCanvasMouseDown_func, false);


    this._onDocumentMouseMove_func = event => this.onDocumentMouseMove(event);
    this._onDocumentMouseUp_func = event => this.onDocumentMouseUp(event);
    document.addEventListener('mousemove', this._onDocumentMouseMove_func, false);
    document.addEventListener('mouseup', this._onDocumentMouseUp_func, false);

    this._state = 0;
    // The pressed object during the last mouse button press is the top most object under the cursor.
    this._lastMBPress_pressedObj = null;
    this._lastMBPress_pressedObj_pos = new Vector2(0, 0);
    this._lastMBPress_pressedObj_isDraggable = false;
    this._lastMBPress_mouseLocInVPSpace = new Vector2(0, 0);
    this._lastMBPress_mouseLocInGraphSpace = new Vector2(0, 0);
  }

  getCanvas () {
    return this.vizceral.renderer.domElement;
  }

  onCanvasMouseDown (event) {
    if (this._state !== 0) {
      return;
    }
    this._lastMBPress_pressedObj = this.vizceral.objectToSwitch;
    if (this._lastMBPress_pressedObj == null) this._lastMBPress_pressedObj = null;
    this._lastMBPress_pressedObj_isDraggable = false;
    this._lastMBPress_pressedObj_pos.set(DOUBLE_NAN, DOUBLE_NAN);
    if (this._lastMBPress_pressedObj !== null) {
      const o = this._lastMBPress_pressedObj.position;
      if (o != null && isFiniteDouble(o.x) && isFiniteDouble(o.y)) {
        this._lastMBPress_pressedObj_pos.x = o.x;
        this._lastMBPress_pressedObj_pos.y = o.y;
        this._lastMBPress_pressedObj_isDraggable = this._lastMBPress_pressedObj.type === 'node';
      }
    }
    getMouseLocInVPSpace(event, this._lastMBPress_mouseLocInVPSpace);
    this.vizceral.validateRaycaster(event.clientX, event.clientY);
    const o = this.vizceral.raycaster.ray.origin;
    this._lastMBPress_mouseLocInGraphSpace.x = o.x;
    this._lastMBPress_mouseLocInGraphSpace.y = o.y;
    this._state = 1;
  }

  onDocumentMouseMove (event) {
    if (this._state === 1) {
      if (this._lastMBPress_pressedObj_isDraggable) {
        const mouseLocVPSpace = new Vector2(0, 0);
        getMouseLocInVPSpace(event, mouseLocVPSpace);
        const tx = mouseLocVPSpace.x - this._lastMBPress_mouseLocInVPSpace.x;
        const ty = mouseLocVPSpace.y - this._lastMBPress_mouseLocInVPSpace.y;
        const t = doubleSqrt((tx * tx) + (ty * ty));
        if (t > 10) {
          this._onDragStart();
        }
      }
    } else if (this._state === 2) {
      this.vizceral.validateRaycaster(event.clientX, event.clientY);
      const o = this.vizceral.raycaster.ray.origin;
      const dx = o.x - this._lastMBPress_mouseLocInGraphSpace.x;
      const dy = o.y - this._lastMBPress_mouseLocInGraphSpace.y;
      const newX = this._lastMBPress_pressedObj_pos.x + dx;
      const newY = this._lastMBPress_pressedObj_pos.y + dy;
      this._setDraggableObjectPosition(this._lastMBPress_pressedObj, newX, newY);
    }
  }

  _setDraggableObjectPosition (draggableObject, posX, posY) {
    if (draggableObject.type !== 'node') {
      Console.warn('Cannot set position of draggable object, only nodes are supported currently: ', draggableObject);
      return;
    }
    const node = draggableObject;
    const nodePos = node.position;
    nodePos.x = posX;
    nodePos.y = posY;
    node.updateBoundingBox();
    const nodeView = node.view;
    if (nodeView) {
      nodeView.updatePosition();
    }
    let connections = node.incomingConnections;
    for (let i = 0, n = connections.length; i < n; i++) {
      const connView = connections[i].view;
      if (connView) {
        connView.updatePosition();
      }
    }
    connections = node.outgoingConnections;
    for (let i = 0, n = connections.length; i < n; i++) {
      const connView = connections[i].view;
      if (connView) {
        connView.updatePosition();
      }
    }
  }

  _onDragStart () {
    this._state = 2;
  }

  onDocumentMouseUp () {
    if (this._state === 0) return;
    this._state = 0;
    this._lastMBPress_pressedObj = null;
  }

}

export default MoveNodeInteraction;
