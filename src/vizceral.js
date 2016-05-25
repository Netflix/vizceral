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
import EventEmitter from 'events';
import THREE from 'three';
import TWEEN from 'tween.js';
import Hammer from 'hammerjs';

import GlobalStyles from './globalStyles';
import GlobalTrafficGraph from './global/globalTrafficGraph';
import RegionTrafficGraph from './region/regionTrafficGraph';
import RendererUtils from './rendererUtils';

/**
* The `nodeHighlighted` event is fired whenever a node is highlighted.
*
* @event nodeHighlighted
* @property {object} node - The node object that has been highlighted/selected.
*/
/**
* The `rendered` event is fired whenever a graph is rendered.
*
* @event rendered
* @property {string} name - the name of the graph that was rendered
* @property (boolean} rendered - true only if the graph has been rendered AND has position data
*/
/**
* The `viewChanged` event is fired whenever the view changes between global, regional, and node
*
* @event viewChanged
* @property {array} view - The currently selected view (e.g. [] for global, ['us-east-1'] for regional, ['us-east-1', 'api'] for node level)
*/
/**
* The `nodeUpdated` event is fired whenever a node that is highlighted or selected is updated.
*
* @event nodeUpdated
* @property {object} node - The node object that has been highlighted/selected.
*/
/**
* The `regionContextSizeChanged` event is fired whenever the context panel size for regional context changes
*
* @event regionContextSizeChanged
* @property {object} dimensions - The dimensions of the region context panels
*/


// These are a static size and ratio for graph placement.  The element itself can resize.
const graphWidth = 1800;
const graphHeight = 1100;

const Console = console;

class Vizceral extends EventEmitter {
  constructor (width, height) {
    super();

    // Initial three.js setup
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.autoClear = false;
    this.renderer.setClearColor(0x2d2d2d, 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.geometry = new THREE.Geometry();

    // Camera
    this.camera = new THREE.OrthographicCamera(width / -2, width / 2, height / 2, height / -2, 1, 60000);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(this.cameraTarget);

    // Populate renderer utils with the renderer and the camera
    RendererUtils.setCamera(this.camera);
    RendererUtils.setRenderer(this.renderer);

    // Update the size of the renderer and the camera perspective
    // this.renderer.setSize(width, height);
    this.setSize(width, height);

    // Setup lighting
    this.scene.add(new THREE.AmbientLight(0xffffff));

    // Mouse/Touch interactivity
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-1, -1);
    this.hammertime = new Hammer.Manager(this.renderer.domElement);
    this.hammertime.on('press', event => this.onDocumentMouseMove(event), false);
    this.renderer.domElement.addEventListener('mousemove', event => this.onDocumentMouseMove(event), false);
    const singleTap = new Hammer.Tap({ event: 'singletap' });
    const doubleTap = new Hammer.Tap({ event: 'doubletap', taps: 2 });
    this.hammertime.add([doubleTap, singleTap]);
    doubleTap.recognizeWith(singleTap);
    singleTap.requireFailure([doubleTap]);
    this.hammertime.on('doubletap', event => this.onDocumentDoubleClick(event), false);
    this.hammertime.on('singletap', event => this.onDocumentClick(event), false);

    this.graphs = {
      global: new GlobalTrafficGraph('edge', this, graphWidth, graphHeight),
      regions: {}
    };
    this._attachGraphHandlers(this.graphs.global);
    this.graphs.global.on('regionContextSizeChanged', dimensions => this.emit('regionContextSizeChanged', dimensions));

    this.selectGraph(this.graphs.global);

    this.options = {};
    this.filters = {};
  }


  /**
   * Get an array of all possible defined styles
   *
   * @return {array}  Array of all possible styles
   */
  getStyles () {
    return Object.keys(GlobalStyles.styles);
  }


  /**
   * Update the global styles
   *
   * @param  {Object} An object map of style names to values
   */
  updateStyles (styles) {
    GlobalStyles.updateStyles(styles);
  }

  _attachGraphHandlers (graph) {
    graph.on('rendered', renderInfo => this.emit('rendered', renderInfo));
    graph.on('nodeHighlighted', node => this.emit('nodeHighlighted', node));
    graph.on('nodeUpdated', node => this.emit('nodeUpdated', node));
    graph.on('setView', view => this.setView(view));
  }

  /**
   * Update the regions that are known, whether they have data or not
   *
   * @param  {array} Array of region names that we are expecting data for
   */
  updateRegions (regions) {
    if (regions.length > 0) {
      const trafficData = { regions: regions.reduce((acc, region) => {
        if (this.graphs.regions[region] === undefined) {
          acc[region] = {};
        }
        return acc;
      }, {}) };
      this.updateData(trafficData);
    }
  }

  /**
   * Set the new set of traffic data to render. This is expected to be called
   * with the complete set of traffic data anytime there is an update.
   *
   * @param {object} data - The traffic data that matches the format in DATAFORMATS.md
   * @param {array} excludedEdgeNodes - An array of node names that are at the edge that you want excluded from the global totals
   */
  updateData (trafficData, excludedEdgeNodes) {
    if (trafficData) {
      if (trafficData.regions) {
        _.each(trafficData.regions, (regionData, region) => {
          if (this.graphs.regions[region] === undefined) {
            this.graphs.regions[region] = new RegionTrafficGraph(region, this, graphWidth, graphHeight);
            this._attachGraphHandlers(this.graphs.regions[region]);
            this.graphs.regions[region].setFilters(this.filters);
            this.graphs.regions[region].showLabels(this.options.showLabels);
          }
          this.graphs.regions[region].setState(regionData);
        });
        // Update the edge graph with appropriate edge data
        this.graphs.global.updateData(trafficData.regions, excludedEdgeNodes);

        // Now that the initial data is loaded, check if we can set the initial node
        const nodeArray = this.checkInitialNode();
        if (nodeArray) {
          this.setView(nodeArray);
        }
      }
    }
  }

  /**
   * Clears the highlighted node, if there is one.  If a node is not highlighted,
   * this is a noop.
   */
  clearHighlightedNode () {
    this.currentGraph.highlightNode(undefined);
  }

  /**
   * Highlight nodes that match searchString.  Searches the node name and the list
   * of clusters, if nodes have one.
   *
   * @param {string} searchString - The string to match against the nodes.
   */
  findNodes (searchString) {
    this.disableHoverInteractions = !!searchString;
    return this.currentGraph.highlightMatchedNodes(searchString);
  }

  calculateIntersectedObject (x, y) {
    this.updateMousePosition(x, y);
    this.disableHoverInteractions = false;
    this.calculateMouseOver();
    return this.currentGraph && this.currentGraph.getIntersectedObject();
  }

  onDocumentClick (event) {
    this.calculateIntersectedObject(event.center.x, event.center.y);
    this.currentGraph.handleIntersectedObjectClick();
  }

  onDocumentDoubleClick (event) {
    this.calculateIntersectedObject(event.center.x, event.center.y);
    this.currentGraph.handleIntersectedObjectDoubleClick();
  }

  checkInitialNode () {
    let initialNodeArray;
    // If there is an initial node to set and there is not a current selected node
    if (this.initialNode && !this.currentView) {
      const region = this.initialNode && this.initialNode[0];
      const nodeName = this.initialNode && this.initialNode[1];

      // Is the set of regions loaded yet?
      if (Object.keys(this.graphs.regions).length > 0) {
        // Does the specified region exist?
        if (region && this.graphs.regions[region]) {
          // If a node name was not passed in...
          if (!nodeName) {
            initialNodeArray = [region];
          } else if (this.graphs.regions[region].isPopulated()) {
            // Is there data loaded for the specified region?
            // TODO: Get multiple matches and set filters if there are multiple?
            const node = this.graphs.regions[region].getNode(nodeName);
            // if a node was matched, navigate to the node
            if (node) {
              initialNodeArray = [region, node.name];
            } else {
              // Navigate to the region since the node was not found.
              initialNodeArray = [region];
            }
          }
        } else {
          // Load the global view
          initialNodeArray = [];
        }
      }
    }

    return initialNodeArray;
    // TODO: else, set a timeout for waiting...?
  }

  /**
   * Set the current view of the component to the passed in array. If the passed
   * in array does not match an existing region or node, the component will try
   * each level up the array until it finds a match, defaulting to the global
   * view.
   *
   * Ex:
   * [] - show the base global view
   * ['us-east-1'] - show the regional view for 'us-east-1' if it exists
   * ['us-east-1', 'api'] - show the api node in the us-east-1 region if it exists
   *
   * @param {array} viewArray - the array containing the view to set.
   */
  setView (nodeArray = []) {
    // If nothing has been selected yet, it's the initial node
    if (!this.currentView) {
      this.initialNode = nodeArray;
      nodeArray = this.checkInitialNode();
      if (!nodeArray) { return; }
    }

    let newRegion = nodeArray[0];
    let newNodeName = nodeArray[1];

    let viewChanged = false;
    let regionChanged = false;

    // Check if it is a valid region. Also catch if no region...
    const regionGraph = this.graphs.regions[newRegion];
    if (regionGraph !== undefined) {
      // Switch to the region view
      if (!this.currentGraph || this.currentGraph.name !== newRegion) {
        regionChanged = true;
        viewChanged = true;
      }

      // Check if node exists
      const newNode = regionGraph.getNode(newNodeName);
      newNodeName = newNode ? newNode.name : undefined;

      if (regionGraph.nodeName !== newNodeName) {
        regionGraph.setFocusedNode(newNodeName);
        viewChanged = true;
      }

      // If switching to the region view from the global view, animate in
      if (this.currentGraph === this.graphs.global) {
        this.zoomIntoRegion(newRegion);
        viewChanged = true;
      } else if (regionChanged) {
        this.selectGraph(regionGraph);
      }
    } else if (this.currentGraph !== this.graphs.global) {
      // If no region was passed in, switch to the global view
      newRegion = undefined;
      newNodeName = undefined;
      if (this.currentGraph && this.currentGraph !== this.graphs.global) {
        this.zoomOutOfRegion();
      } else {
        this.selectGraph(this.graphs.global);
      }
      viewChanged = true;
    }

    if (viewChanged) {
      const currentView = [];
      if (newRegion) {
        currentView.push(newRegion);
        if (newNodeName) {
          currentView.push(newNodeName);
        }
      }
      this.currentView = currentView;
      this.calculateMouseOver();
      this.emit('viewChanged', this.currentView);
    }
  }

  setOptions (options) {
    // Show labels
    if (options.showLabels !== this.options.showLabels) {
      this.options.showLabels = options.showLabels;
      _.each(this.graphs.regions, regionGraph => {
        regionGraph.showLabels(this.options.showLabels);
      });
      this.graphs.global.showLabels(this.options.showLabels);
    }
  }

  /**
   * If zoomed into a region or a service, zoom out one level up.
   * If in the global view, this is a noop.
   */
  zoomOutViewLevel () {
    if (this.currentGraph) {
      const currentViewLength = this.currentView ? this.currentView.length : 0;

      if (this.currentGraph && this.currentGraph.highlightedNode) {
        this.clearHighlightedNode();
      } else if (currentViewLength > 0) {
        this.currentView = this.currentView.slice(0, -1);
        this.setView(this.currentView);
      }
    }
  }

  /**
   * Get a specific node object
   *
   * @param {array} nodeArray - e.g. [ region, nodeName ]
   */
  getNode (nodeArray) {
    if (nodeArray && nodeArray.length === 2 && this.graphs.regions[nodeArray[0]]) {
      return this.graphs.regions[nodeArray[0]].getNode(nodeArray[1]);
    }
    return undefined;
  }

  /**
   * Set the set of filters to apply along with their current values.
   *
   * @param {object} filters - The filters that match the format in DATAFORMATS.md
   */
  setFilters (filters) {
    this.filters = filters;
    _.each(this.graphs.regions, regionGraph => {
      regionGraph.setFilters(filters);
    });
  }


  // Only necessary when global graph is present
  zoomBetweenGraphs (fromGraph, toGraph, parametersFrom, parametersTo) {
    parametersFrom.fromGraphOpacity = 1;
    parametersTo.fromGraphOpacity = 0;

    parametersFrom.toGraphOpacity = 0;
    parametersTo.toGraphOpacity = 1;

    // clear any highlighting on current graph
    this.clearHighlightedNode();

    // Remove the current graph
    this.currentGraph.setCurrent(false);
    this.currentGraph = undefined;

    const fromViewObject = fromGraph.view.container;
    const toViewObject = toGraph.view.container;

    // Set initial scale of to object before adding it
    toViewObject.scale.set(parametersFrom.regionScale, parametersFrom.regionScale, 1);
    this.scene.add(toViewObject);

    // Pan over and zoom in to the selected region
    new TWEEN.Tween(_.clone(parametersFrom))
              .to(parametersTo, 1000)
              .easing(TWEEN.Easing.Cubic.Out)
              .onUpdate(function () {
                // Pan over to the selected region
                fromViewObject.position.set(this.exitingX, this.exitingY, 0);
                toViewObject.position.set(this.enteringX, this.enteringY, 0);
                // Zoom in to the selected entering
                fromViewObject.scale.set(this.exitingScale, this.exitingScale, 1);
                toViewObject.scale.set(this.enteringScale, this.enteringScale, 1);
                // Fade the region node
                fromGraph.view.setOpacity(this.fromGraphOpacity);
                if (toGraph.loadedOnce) {
                  toGraph.view.setOpacity(this.toGraphOpacity);
                }
              })
              .onComplete(() => {
                // Remove the outgoing graph from the scene
                if (fromViewObject !== undefined) {
                  this.scene.remove(fromViewObject);
                }

                // Set the current graph
                // this.currentGraph.setCurrent(false);
                this.currentGraph = toGraph;
                this.currentGraph.setCurrent(true);
              })
              .start();
  }

  zoomIntoRegion (region) {
    const entryPosition = this.graphs.global.nodes[region].position;
    if (this.currentGraph && this.currentGraph === this.graphs.global) {
      const fromGraph = this.graphs.global;
      const toGraph = this.graphs.regions[region];

      const parametersFrom = {
        exitingX: fromGraph.view.container.position.x,
        exitingY: fromGraph.view.container.position.y,
        exitingScale: fromGraph.view.container.scale.x,
        enteringX: entryPosition.x,
        enteringY: entryPosition.y,
        enteringScale: 0
      };
      const parametersTo = {
        exitingX: 0 - entryPosition.x * 10,
        exitingY: 0 - entryPosition.y * 10,
        enteringX: 0,
        enteringY: 0,
        exitingScale: 10,
        enteringScale: 1
      };
      this.zoomBetweenGraphs(fromGraph, toGraph, parametersFrom, parametersTo);
    }
  }

  zoomOutOfRegion () {
    if (this.currentGraph && this.currentGraph !== this.graphs.global) {
      const regionNode = this.graphs.global.getNode(this.currentGraph.name);
      const entryPosition = this.graphs.global.nodes[this.currentGraph.name].position;

      const toGraph = this.graphs.global;
      const fromGraph = this.graphs.regions[this.currentGraph.name];

      // clear any node that may have been zoomed in
      fromGraph.setFocusedNode(undefined);

      const parametersFrom = {
        enteringX: 0 - entryPosition.x * 10,
        enteringY: 0 - entryPosition.y * 10,
        enteringScale: 10,
        exitingX: fromGraph.view.container.position.x,
        exitingY: fromGraph.view.container.position.y,
        exitingScale: fromGraph.view.container.scale.x
      };
      const parametersTo = {
        enteringX: 0,
        enteringY: 0,
        exitingX: regionNode.position.x,
        exitingY: regionNode.position.y,
        enteringScale: 1,
        exitingScale: 0
      };
      this.zoomBetweenGraphs(fromGraph, toGraph, parametersFrom, parametersTo);
    }
  }

  // Needed for all graphs
  selectGraph (graph) {
    if (this.currentGraph !== undefined) {
      this.scene.remove(this.currentGraph.view.container);
      this.currentGraph.setCurrent(false);
    }
    this.scene.add(graph.view.container);
    this.currentGraph = graph;
    this.currentGraph.setCurrent(true);
  }

  calculateMouseOver () {
    if (this.currentGraph) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.currentGraph.view.getInteractiveChildren());
      let object;
      if (intersects.length > 0) {
        if (intersects[0].object.userData.object) {
          object = intersects[0].object.userData.object;
          object = (object.loaded && object.isInteractive()) ? object : undefined;
        } else {
          Console.warn('Mouse cursor intersected with a visible object that does not have an associated object model. The object should be set at userData.object');
        }
      }
      if (object && object.isClickable()) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = 'auto';
      }

      if (this.currentGraph.intersectedObject !== object) {
        this.currentGraph.setIntersectedObject(object);
      }
    }
  }

  updateMousePosition (x, y) {
    this.mouse.x = ((x - this.boundingRect.left) / this.renderer.domElement.width) * 2 - 1;
    this.mouse.y = -((y - this.boundingRect.top) / this.renderer.domElement.height) * 2 + 1;
  }

  onDocumentMouseMove (event) {
    event.preventDefault();
    this.updateMousePosition(event.clientX, event.clientY);
    if (!this.disableHoverInteractions) {
      this.calculateMouseOver();
    }
  }

  animate (time) {
    requestAnimationFrame(this.animate.bind(this));
    this.render(time);
  }

  render (time) {
    TWEEN.update();

    // Check size
    if (this.width !== this.renderer.domElement.offsetWidth ||
        this.height !== this.renderer.domElement.offsetHeight) {
      this.setSize(this.renderer.domElement.offsetWidth, this.renderer.domElement.offsetHeight);
    }

    this.camera.lookAt(this.cameraTarget);
    if (this.currentGraph) { this.currentGraph.update(time); }
    this.renderer.render(this.scene, this.camera);
  }

  updateBoundingRectCache () {
    this.boundingRect = this.renderer.domElement.getBoundingClientRect();
  }

  setSize (w, h) {
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);

    // Update aspect ratio
    const viewAspectRatio = w / h;
    const graphAspectRatio = graphWidth / graphHeight;
    let scale;
    if (viewAspectRatio > graphAspectRatio) {
      // if the aspect is wider than the graph aspect
      scale = h / graphHeight;
      w = graphWidth * (viewAspectRatio / graphAspectRatio);
      h = graphHeight;
    } else {
      // if the aspect is taller than the graph aspect
      scale = w / graphWidth;
      h = graphHeight / (viewAspectRatio / graphAspectRatio);
      w = graphWidth;
    }

    RendererUtils.setScale(scale);

    this.camera.left = w / -2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = h / -2;

    this.camera.updateProjectionMatrix();

    this.updateBoundingRectCache();
  }
}

export default Vizceral;
