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
 * @name Copyright_Notice
 */

import {
  clone, each, every, find, isEqual
} from 'lodash';
import EventEmitter from 'events';
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import Hammer from 'hammerjs';

import DNSLayout from './layouts/dnsLayout';
import DnsTrafficGraph from './dns/dnsTrafficGraph';
import FocusedChildTrafficGraph from './focused/focusedChildTrafficGraph';
import FocusedTrafficGraph from './focused/focusedTrafficGraph';
import GlobalDefinitions from './globalDefinitions';
import GlobalStyles from './globalStyles';
import GlobalTrafficGraph from './global/globalTrafficGraph';
import LTRTreeLayout from './layouts/ltrTreeLayout';
import RegionTrafficGraph from './region/regionTrafficGraph';
import RingCenterLayout from './layouts/ringCenterLayout';
import RingLayout from './layouts/ringLayout';

import RendererUtils from './rendererUtils';
import MoveNodeInteraction from './moveNodeInteraction';

/**
* The `objectHovered` event is fired whenever on mouseover on a 'node' or 'connection' .
* `object.type` will be either 'node' or 'connection'. In case another 'node' or 'connection'
*  is already in focus (because of click/highlight event), then this event won't be triggered.
*
* @event objectHovered
* @property {object} object The object that has been hovered,
*/
/**
* The `objectHighlighted` event is fired whenever an object is highlighted.
* `object.type` will be either 'node' or 'connection'
*
* @event objectHighlighted
* @property {object} object The object that has been highlighted, or the highlighted object that has been updated.
*/
/**
* The `viewChanged` event is fired whenever the view changes
*
* @event viewChanged
* @property {array} view The currently selected view (e.g. [] for global, ['us-east-1'] for one node deep, ['us-east-1', 'api'] for two nodes deep)
*/
/**
* The `nodeContextSizeChanged` event is fired whenever the context panel size for node context size changes
*
* @event nodeContextSizeChanged
* @property {object} dimensions The dimensions of the node context panels
*/
/**
* The `matchesFound` event is fired whenever nodes are found via findNodes().
*
* @event matchesFound
* @property {object} matches The matches object { total, visible }
*/
/**
* The `viewUpdated` event is fired whenever the current displayed graph's view updates.
*
* @event viewUpdated
*/


// These are a static size and ratio for graph placement.  The element itself can resize.
const graphWidth = 1800;
const graphHeight = 1100;

const Console = console;

class Vizceral extends EventEmitter {
  /**
   * Represents a Vizceral component.
   * @constructor
   * @param {object} [canvas] The canvas to render the graph onto; if not provided, will create a canvas accessible by this.renderer.domElement
   * @param {Number} [targetFramerate] Target frame rate to render at. Will not limit FPS if not provided or set to 0.
   */
  constructor (canvas, targetFramerate) {
    super();
    const parameters = { alpha: true, antialias: true };
    if (canvas) { parameters.canvas = canvas; }

    // Initial three.js setup
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer(parameters);
    this.renderer.setPixelRatio(window.devicePixelRatio ? window.devicePixelRatio : 1);
    this.renderer.autoClear = false;
    // this.renderer.sortObjects = false;
    this.renderer.setClearColor(0x2d2d2d, 1);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.geometry = new THREE.Geometry();

    // Camera
    this.camera = new THREE.OrthographicCamera(0, 0, 0, 0, 1, 60000);
    this.cameraTarget = new THREE.Vector3(0, 0, 0);
    this.camera.position.set(0, 0, 600);
    this.camera.lookAt(this.cameraTarget);

    // Populate renderer utils with the renderer and the camera
    RendererUtils.setCamera(this.camera);
    RendererUtils.setRenderer(this.renderer);

    // Update the size of the renderer and the camera perspective
    // this.renderer.setSize(width, height);
    this.setSize(0, 0);

    // Target FPS
    this.targetFrameLength = targetFramerate ? (1000 / targetFramerate) : null;
    this.lastRenderAt = 0;

    // Setup lighting
    this.scene.add(new THREE.AmbientLight(0xffffff));

    // Mouse/Touch interactivity
    this.raycaster_mouseLocation_viewportSpace = new THREE.Vector2(-1, -1);
    this.raycaster = new THREE.Raycaster();
    if (window) {
      window.addEventListener('scroll', () => this.updateBoundingRectCache());
    }

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

    this.graphs = {};
    this.options = {
      showLabels: true,
      allowDraggingOfNodes: false
    };
    this.filters = {};

    this.renderers = {
      global: GlobalTrafficGraph,
      region: RegionTrafficGraph,
      focused: FocusedTrafficGraph,
      focusedChild: FocusedChildTrafficGraph,
      dns: DnsTrafficGraph
    };
    this.moveNodeInteraction = new MoveNodeInteraction(this);
    this.layouts = {
      ltrTree: LTRTreeLayout,
      dns: DNSLayout,
      ringCenter: RingCenterLayout,
      ring: RingLayout
    };
    this.moveNodeInteraction.setEnabled(this.options.allowDraggingOfNodes);
  }


  /**
   * Get an array of all possible defined styles
   *
   * @returns {array}  Array of all possible styles
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

  /**
   * Update the global definitions
   *
   * @param {Object} An object map of definitions. See the format and defaults in (https://github.com/Netflix/Vizceral/wiki/Configuration#definitions-for-data-to-display)
   */
  updateDefinitions (definitions) {
    GlobalDefinitions.updateDefinitions(definitions);
  }

  _attachGraphHandlers (graph) {
    graph.on('nodeContextSizeChanged', dimensions => this.emit('nodeContextSizeChanged', dimensions));
    graph.on('objectHighlighted', highlightedObject => this.emit('objectHighlighted', highlightedObject));
    graph.on('objectHovered', hoveredObject => this.emit('objectHovered', hoveredObject));
    graph.on('setView', view => this.setView(view));
    graph.on('viewUpdated', () => this.emit('viewUpdated'));
  }

  createGraph (graphData, mainView, parentGraph, width, height) {
    let graph;
    if (graphData && graphData.renderer) {
      if (!graphData.name) {
        Console.log('Attempted to create a new graph that does not have a name');
      } else if (!this.renderers[graphData.renderer]) {
        Console.log(`Attempted to create a graph type that does not exist: ${graphData.renderer} Presently registered renderers are ${Object.keys(this.renderers)}`);
      } else {
        const parent = parentGraph || this;
        graph = parent.graphs[graphData.name];
        if (!graph) {
          if (graphData.layout && !this.layouts[graphData.layout]) {
            Console.log(`Attempted to create a graph with a layout type that does not exist: ${graphData.layout}. Using default layout for graph type.`);
          }
          graph = new (this.renderers[graphData.renderer])(graphData.name, mainView, parentGraph, width, height, this.layouts[graphData.layout], graphData.entryNode);
          this._attachGraphHandlers(graph);
          graph.setFilters(this.filters);
          graph.showLabels(this.options.showLabels);
          parent.graphs[graphData.name] = graph;
        }
      }
    }
    return graph;
  }

  updateGraph (graph) {
    if (graph) {
      let currentGraphData = this.trafficData;
      let parentGraphData;
      graph.graphIndex.every((graphLevel) => {
        parentGraphData = currentGraphData;
        currentGraphData = find(currentGraphData.nodes, { name: graphLevel });
        return currentGraphData;
      });

      if (currentGraphData) {
        graph.setState(currentGraphData, false, parentGraphData);
        graph.validateLayout();
      }
    }
  }

  /**
   * Set the new set of traffic data to render. This is expected to be called
   * with the complete set of traffic data anytime there is an update.
   *
   * @param {object} data The traffic data that matches the format in (https://github.com/Netflix/Vizceral/wiki/How-to-Use#graph-data-format)
   */
  updateData (trafficData) {
    if (trafficData && trafficData.nodes) {
      this.trafficData = trafficData;
      this.rootGraphName = trafficData.name;

      // Now that the initial data is loaded, check if we can set the initial node
      if (this.initialView) {
        this.setView(this.initialView, this.initialObjectToHighlight);
      }

      this.updateGraph(this.currentGraph);
    }
  }

  /**
   * Sets the highlighted node.  If the node is undefined, clears any highlighting.
   *
   * @param {object} node The node to highlight
   */
  setHighlightedNode (node) {
    this.currentGraph.highlightObject(node);
  }

  /**
   * Sets the highlighted connection.  If the connection is undefined, clears any highlighting.
   *
   * @param {object} connection The connection to highlight
   */
  setHighlightedConnection (connection) {
    this.currentGraph.highlightObject(connection);
  }

  /**
   * Highlight nodes that match searchString.  Searches the node name and the list
   * of sub nodes, if nodes have one.
   *
   * @param {string} searchString The string to match against the nodes.
   *
   * @returns {object} { total, totalMatches, visible, visibleMatches }
   */
  findNodes (searchString) {
    if (this.currentGraph) {
      this.disableHoverInteractions = !!searchString;
      // If !!searchString, clear any highlighted object
      if (this.disableHoverInteractions && this.currentGraph.highlightedObject) {
        this.currentGraph.highlightObject();
      }

      // if !searchString and highlighted object, do nothing
      if (searchString || !this.currentGraph.highlightedObject) {
        // Highlight matches
        const matchesFound = this.currentGraph.highlightMatchedNodes(searchString);
        matchesFound.total = this.currentGraph.nodeCounts.total;
        matchesFound.visible = this.currentGraph.nodeCounts.visible;

        this.emit('matchesFound', matchesFound);
        return matchesFound;
      }
    }
    return undefined;
  }

  calculateIntersectedObject (x, y) {
    this.validateRaycaster(x, y);
    this.disableHoverInteractions = false;
    this.calculateMouseOver(true);
    return this.currentGraph && this.currentGraph.getIntersectedObject();
  }

  onDocumentClick (event) {
    this.calculateIntersectedObject(event.center.x, event.center.y);
    if (this.currentGraph) {
      this.currentGraph.handleIntersectedObjectClick();
    }
  }

  onDocumentDoubleClick (event) {
    this.calculateIntersectedObject(event.center.x, event.center.y);
    this.currentGraph.handleIntersectedObjectDoubleClick();
  }

  getNearestValidGraph (viewArray) {
    let newGraph = this.getGraph(this.rootGraphName);
    if (newGraph) {
      viewArray.every((nodeName) => {
        const nextLevelNode = newGraph.getNode(nodeName);
        if (nextLevelNode) {
          const newGraphCandidate = this.getGraph(nextLevelNode.name, newGraph);
          if (newGraphCandidate) {
            newGraph = newGraphCandidate;
            return true;
          }
          Console.warn(`Attempted to select a graph that was not found; ${viewArray.join()}`);
        }
        return false;
      });
    }
    return newGraph;
  }

  checkInitialView () {
    const initialView = {
      view: undefined,
      highlighted: this.initialObjectToHighlight,
      redirectedFrom: undefined
    };

    // If there is an initial node to set and there is not a current selected node
    if (this.initialView && !this.currentGraph && this.rootGraphName) {
      // Are there graphs yet?
      const newGraph = this.getNearestValidGraph(this.initialView);
      if (newGraph) {
        initialView.view = newGraph.graphIndex;

        if (initialView.view && this.initialView && !isEqual(initialView.view, this.initialView)) {
          initialView.redirectedFrom = this.initialView;
        }
        this.initialView = undefined;
      }
    }

    return initialView;
    // TODO: else, set a timeout for waiting...?
  }

  getGraph (graphName, parentGraph) {
    // If the graph already exists, return it.
    if (!parentGraph) {
      if (this.graphs[graphName]) {
        return this.graphs[graphName];
      }
    } else if (parentGraph.graphs[graphName]) {
      return parentGraph.graphs[graphName];
    }

    // If parentGraph is root, create a new graph based on this.trafficData
    const graphData = !parentGraph ? this.trafficData : parentGraph.nodes[graphName];
    // If the node exists in the graph, create the graph.
    if (graphData) {
      // Create the graph and return it
      const graph = this.createGraph(graphData, this, parentGraph, graphWidth, graphHeight);
      this.updateGraph(graph);
      return graph;
    }

    return undefined;
  }

  /**
   * Set the current view of the component to the passed in array. If the passed
   * in array does not match an existing node at the passed in depth, the component will try
   * each level up the array until it finds a match, defaulting to the top level
   * view.
   *
   * Ex:
   * [] - show the base graph view
   * ['us-east-1'] - show the graph view for 'us-east-1' if it exists
   * ['us-east-1', 'api'] - show the view for the api node in the us-east-1 graph if it exists
   *
   * @param {array} viewArray the array containing the view to set.
   * @param {string} objectNameToHighlight a node or connection to set as highlighted in the current viewArray
   */
  setView (viewArray = [], objectNameToHighlight) {
    let redirectedFrom;
    // If nothing has been selected yet, it's the initial node
    if (!this.currentGraph) {
      this.initialView = viewArray;
      this.initialObjectToHighlight = objectNameToHighlight;
      const initialView = this.checkInitialView();
      if (!initialView.view) { return; }
      viewArray = initialView.view;
      objectNameToHighlight = initialView.highlighted;
      ({ redirectedFrom } = initialView);
    }

    const newGraph = this.getNearestValidGraph(viewArray);

    // If the view changed, set it.
    if (!this.currentGraph || !isEqual(newGraph.graphIndex, this.currentGraph.graphIndex)) {
      const difference = this.currentGraph ? (newGraph.graphIndex.length - this.currentGraph.graphIndex.length) : 0;
      if (difference === -1) {
        this.zoomOutOfNode();
      } else if (difference === 1) {
        this.zoomIntoNode(newGraph.name);
      } else {
        this.selectGraph(newGraph, redirectedFrom);
      }

      this.calculateMouseOver();
    }

    // If passed in an object to highlight, try to highlight.
    if (objectNameToHighlight) {
      const objectToHighlight = newGraph.getGraphObject(objectNameToHighlight);
      if (objectToHighlight) {
        newGraph.highlightObject(objectToHighlight);
      }
    } else if (newGraph.highlightedObject) {
      newGraph.highlightObject();
    }
  }

  showLabels (graph) {
    graph.showLabels(this.options.showLabels);
    each(graph.graphs, (subGraph) => {
      this.showLabels(subGraph);
    });
  }

  updateModes (graph) {
    graph.setModes(this.modes);
    each(graph.graphs, (subGraph) => {
      this.updateModes(subGraph);
    });
  }

  /**
   * Set the current modes of vizceral
   */
  setModes (modes) {
    if (!isEqual(modes, this.modes)) {
      this.modes = modes;
      this.updateModes(this.getGraph(this.rootGraphName));
    }
  }

  setOptions (options) {
    // Show labels
    let { showLabels } = options;
    if (typeof showLabels !== 'boolean') {
      Console.warn('Vizceral.setOptions: showLabels must be a boolean but was something else, coercing to boolean. Got the following value: ', showLabels);
      showLabels = !!showLabels;
    }
    if (showLabels !== this.options.showLabels) {
      this.options.showLabels = showLabels;
      this.showLabels(this.getGraph(this.rootGraphName));
    }

    // Allow repositioning of nodes through dragging
    let { allowDraggingOfNodes } = options;
    if (typeof allowDraggingOfNodes !== 'boolean') {
      Console.warn('Vizceral.setOptions: allowDraggingOfNodes must be a boolean but was something else, coercing to boolean. Got the following value: ', allowDraggingOfNodes);
      allowDraggingOfNodes = !!allowDraggingOfNodes;
    }
    if (allowDraggingOfNodes !== this.options.allowDraggingOfNodes) {
      this.options.allowDraggingOfNodes = allowDraggingOfNodes;
      this.moveNodeInteraction.setEnabled(allowDraggingOfNodes);
    }
  }

  /**
   * If zoomed into a node or a service, zoom out one level up.
   * If in the global view, this is a noop.
   */
  zoomOutViewLevel () {
    if (this.currentGraph) {
      if (this.currentGraph.highlightedObject) {
        this.currentGraph.highlightObject(undefined);
      } else if (this.currentGraph.graphIndex.length > 0) {
        this.setView(this.currentGraph.graphIndex.slice(0, -1));
      }
    }
  }

  /**
   * Get a specific node object
   *
   * @param {array} viewArray e.g. [ node1, node2 ]
   */
  getNode (viewArray) {
    let currentGraph = this.getGraph(this.rootGraphName);
    let node;
    every(viewArray, (nodeName, index) => {
      const nextNode = currentGraph.getNode(nodeName);
      if (nextNode) {
        if (index === viewArray.length - 1) {
          node = nextNode;
          return false;
        }
        const nextGraph = currentGraph.graphs[nodeName];
        if (nextGraph) {
          currentGraph = nextGraph;
          return true;
        }
      }
      return false;
    });
    return node;
  }

  /**
   * Set the set of filters to apply along with their current values.
   *
   * @param {object} filters The filters that match the format in (https://github.com/Netflix/Vizceral/wiki/Configuration#filters)
   */
  setFilters (filters) {
    this.filters = filters;
    if (this.currentGraph) {
      this.currentGraph.setFilters(filters);
    }
  }

  setRenderers (renderers) {
    Object.assign(this.renderers, renderers);
  }

  setCurrentGraph (graph, redirectedFrom) {
    graph.setFilters(this.filters);
    this.currentGraph = graph;
    this.updateGraph(this.currentGraph);
    this.currentGraph.setCurrent(true);

    this.emit('viewChanged', { view: this.currentGraph.graphIndex, graph: this.currentGraph, redirectedFrom: redirectedFrom });
  }

  // Only necessary when global graph is present
  zoomBetweenGraphs (fromGraph, toGraph, parametersFrom, parametersTo) {
    parametersFrom.fromGraphOpacity = 1;
    parametersTo.fromGraphOpacity = 0;

    parametersFrom.toGraphOpacity = 0;
    parametersTo.toGraphOpacity = 1;

    // clear any highlighting on current graph
    this.setHighlightedNode(undefined);

    // Set the current graph
    this.setCurrentGraph(toGraph);

    const fromViewObject = fromGraph.view.container;
    const toViewObject = toGraph.view.container;

    this.scene.add(toViewObject);

    // Pan over and zoom in to the selected node
    new TWEEN.Tween(clone(parametersFrom))
      .to(parametersTo, 1000)
      .easing(TWEEN.Easing.Cubic.Out)
      .onUpdate(function () {
        // Pan over to the selected node
        fromViewObject.position.set(this.exitingX, this.exitingY, 0);
        toViewObject.position.set(this.enteringX, this.enteringY, 0);
        // Zoom in to the selected entering
        fromViewObject.scale.set(this.exitingScale, this.exitingScale, 1);
        toViewObject.scale.set(this.enteringScale, this.enteringScale, 1);
        // Fade the node node
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
      })
      .start();
  }

  zoomIntoNode (nodeName) {
    if (this.currentGraph) {
      const nodeToZoomInto = this.currentGraph.nodes[nodeName];
      const toGraph = this.currentGraph.graphs[nodeName];
      if (nodeToZoomInto && toGraph) {
        const entryPosition = nodeToZoomInto.position;
        const parametersFrom = {
          exitingX: this.currentGraph.view.container.position.x,
          exitingY: this.currentGraph.view.container.position.y,
          exitingScale: this.currentGraph.view.container.scale.x,
          enteringX: entryPosition.x,
          enteringY: entryPosition.y,
          enteringScale: 0
        };
        const parametersTo = {
          exitingX: 0 - (entryPosition.x * 10),
          exitingY: 0 - (entryPosition.y * 10),
          enteringX: 0,
          enteringY: 0,
          exitingScale: 10,
          enteringScale: 1
        };
        this.zoomBetweenGraphs(this.currentGraph, toGraph, parametersFrom, parametersTo);
      }
    }
  }

  zoomOutOfNode () {
    if (this.currentGraph && this.currentGraph !== this.getGraph(this.rootGraphName)) {
      const { parentGraph } = this.currentGraph;
      if (parentGraph) {
        const currentNodeInParent = parentGraph.getNode(this.currentGraph.name);

        const parametersFrom = {
          enteringX: 0 - (currentNodeInParent.position.x * 10),
          enteringY: 0 - (currentNodeInParent.position.y * 10),
          enteringScale: 10,
          exitingX: this.currentGraph.view.container.position.x,
          exitingY: this.currentGraph.view.container.position.y,
          exitingScale: this.currentGraph.view.container.scale.x
        };
        const parametersTo = {
          enteringX: 0,
          enteringY: 0,
          exitingX: currentNodeInParent.position.x,
          exitingY: currentNodeInParent.position.y,
          enteringScale: 1,
          exitingScale: 0
        };
        this.zoomBetweenGraphs(this.currentGraph, parentGraph, parametersFrom, parametersTo);
      }
    }
  }

  // Needed for all graphs
  selectGraph (graph, redirectedFrom) {
    if (this.currentGraph !== undefined) {
      this.scene.remove(this.currentGraph.view.container);
      this.currentGraph.setCurrent(false);
    }
    this.scene.add(graph.view.container);
    this.setCurrentGraph(graph, redirectedFrom);
  }

  validateRaycaster (mouseLocVPSpaceX, mouseLocVPSpaceY) {
    if (this.raycaster_mouseLocation_viewportSpace.x === mouseLocVPSpaceX
      && this.raycaster_mouseLocation_viewportSpace.y === mouseLocVPSpaceY) {
      return;
    }
    const canvasDomElem = this.renderer.domElement;
    const canvasBCRect = this.boundingRect;
    const mouseLocCanvasSpaceX = mouseLocVPSpaceX - canvasBCRect.left;
    const mouseLocCanvasSpaceY = mouseLocVPSpaceY - canvasBCRect.top;
    const mouseLocNormScreenSpaceX = ((mouseLocCanvasSpaceX / canvasDomElem.clientWidth) * 2) - 1;
    const mouseLocNormScreenSpaceY = -((mouseLocCanvasSpaceY / canvasDomElem.clientHeight) * 2) + 1;
    const mouseLocNormScreenSpace = new THREE.Vector2(mouseLocNormScreenSpaceX, mouseLocNormScreenSpaceY);
    this.raycaster.setFromCamera(mouseLocNormScreenSpace, this.camera);
    this.raycaster_mouseLocation_viewportSpace.x = mouseLocVPSpaceX;
    this.raycaster_mouseLocation_viewportSpace.y = mouseLocVPSpaceY;
  }

  calculateMouseOver (immediate) {
    if (this.currentGraph) {
      this.raycaster.linePrecision = this.currentGraph.linePrecision || 1;
      const intersects = this.raycaster.intersectObjects(this.currentGraph.view.getInteractiveChildren());
      let userData = {};
      if (intersects.length > 0) {
        if (intersects[0].object.userData.object) {
          ({ userData } = intersects[0].object);
          userData = (userData.object && userData.object.loaded && (userData.object.isInteractive() || (this.options.allowDraggingOfNodes && userData.object.isDraggable()))) ? userData : {};
        } else {
          Console.warn('Mouse cursor intersected with a visible object that does not have an associated object model. The object should be set at userData.object');
        }
      }
      if (userData.object && userData.object.isClickable()) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = 'auto';
      }

      // Changed hovered object
      if (this.objectToSwitch !== userData.object) {
        this.objectToSwitch = userData.object;
        if (this.currentGraph.intersectedObject) {
          // If an object was previously moused over, clear the context
          this.currentGraph.setContext(undefined);
        }

        // if waiting for a hover effect on something else, clear it before moving on
        if (this.mouseOverTimer) {
          clearTimeout(this.mouseOverTimer);
        }

        if (!immediate && userData.object && !(this.currentGraph && this.currentGraph.highlightedObject)) {
          // if switching to an object and nothing is highlighted, set a timeout to perform the hover effect
          this.mouseOverTimer = setTimeout(() => {
            this.currentGraph.setIntersectedObject(this.objectToSwitch);
          }, 100);
        } else {
          // if removing a hover effect, or there is a highlighted object, do it immediately
          this.currentGraph.setIntersectedObject(userData.object);
        }
      }

      if (this.currentGraph && this.currentGraph.context !== userData.context) {
        this.currentGraph.setContext(userData.context);
      }
    }
  }

  onDocumentMouseMove (event) {
    event.preventDefault();
    if (!this.disableHoverInteractions) {
      this.validateRaycaster(event.clientX, event.clientY);
      this.calculateMouseOver();
    }
  }

  requestAnimationFrame () {
    requestAnimationFrame(this.animate.bind(this));
  }

  animate (time) {
    if (this.targetFrameLength === null) {
      this.requestAnimationFrame();
    } else {
      // Call requestAnimationFrame to be as close to the target frame rate as we can
      // performance.now allows sub-millisecond timing for maximum smoothness
      const now = performance.now();
      const nextRenderAt = Math.max(now, this.lastRenderAt + this.targetFrameLength);
      const nextRenderIn = nextRenderAt - now;
      setTimeout(this.requestAnimationFrame.bind(this), nextRenderIn);
      this.lastRenderAt = nextRenderAt;
    }
    this.render(time);
  }

  render (time) {
    TWEEN.update();

    // Check size
    if ((this.renderer.domElement.offsetWidth !== 0 && this.width !== this.renderer.domElement.offsetWidth)
        || (this.renderer.domElement.offsetHeight !== 0 && this.height !== this.renderer.domElement.offsetHeight)) {
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
export * from './base';
