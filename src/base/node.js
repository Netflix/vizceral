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
import {
  assign, each, every, reduce, remove
} from 'lodash';

import GraphObject from './graphObject';
import Notices from '../notices';

const Console = console;

class Node extends GraphObject {
  constructor (node, renderer, entryNode) {
    super();
    this.type = 'node';
    this.update(node);
    this.minimumNoticeLevel = 0;
    this.entryNode = entryNode;

    this.graphRenderer = renderer;
    this.position = this.position || {};
    this.position.x = this.position.x || 0;
    this.position.y = this.position.y || 0;

    this.updateBoundingBox();

    this.incomingConnections = [];
    this.outgoingConnections = [];

    this.connected = false;

    this.invalidatedSinceLastViewUpdate = true;

    this.options = {
      showLabel: true
    };

    this.data = {
      volume: NaN,
      volumePercent: 0,
      classPercents: {}
    };

    this.metadata = node.metadata;
    this.detailedMode = 'volume'; // 'volume' is default, can be a string that matches a data set in metadata: { details: {} }
  }

  addIncomingConnection (connection) {
    this.incomingConnections.push(connection);
    this.invalidateIncomingVolume();
    this.connected = true;
  }

  addOutgoingConnection (connection) {
    this.outgoingConnections.push(connection);
    this.invalidateOutgoingVolume();
    this.connected = true;
  }

  removeIncomingConnection (connection) {
    remove(this.incomingConnections, incomingConnection => incomingConnection.name === connection.name);
    this.invalidateIncomingVolume();
    if (this.incomingConnections.length === 0 && this.outgoingConnections.length === 0) {
      this.connected = false;
    }
  }

  removeOutgoingConnection (connection) {
    remove(this.outgoingConnections, outgoingConnection => outgoingConnection.name === connection.name);
    this.invalidateOutgoingVolume();
    if (this.incomingConnections.length === 0 && this.outgoingConnections.length === 0) {
      this.connected = false;
    }
  }

  invalidateIncomingVolume () {
    this.invalidatedSinceLastViewUpdate = true;
    this.incomingVolumeTotal = undefined;
    this.incomingVolume = {};
  }

  validateIncomingVolume () {
    this.incomingVolumeTotal = reduce(this.incomingConnections, (total, connection) => total + connection.getVolumeTotal(), 0);
    each(this.incomingConnections, (c) => {
      each(c.volume, (value, key) => {
        this.incomingVolume[key] = this.incomingVolume[key] || 0;
        this.incomingVolume[key] += value;
      });
    });
  }

  getIncomingVolume (key) {
    if (!key) {
      if (!this.incomingVolumeTotal) { this.validateIncomingVolume(); }
      return this.incomingVolumeTotal;
    }

    if (!this.incomingVolume[key]) { this.validateIncomingVolume(); }
    return this.incomingVolume[key];
  }

  invalidateOutgoingVolume () {
    this.invalidatedSinceLastViewUpdate = true;
    this.outgoingVolumeTotal = undefined;
    this.outgoingVolume = {};
  }

  validateOutgoingVolume () {
    this.outgoingVolumeTotal = reduce(this.outgoingConnections, (total, connection) => total + connection.getVolumeTotal(), 0);
    each(this.outgoingConnections, (c) => {
      each(c.volume, (value, key) => {
        this.outgoingVolume[key] = this.outgoingVolume[key] || 0;
        this.outgoingVolume[key] += value;
      });
    });
  }

  getOutgoingVolume (key) {
    if (!key) {
      if (!this.outgoingVolumeTotal) { this.validateOutgoingVolume(); }
      return this.outgoingVolumeTotal;
    }

    if (!this.outgoingVolume[key]) { this.validateOutgoingVolume(); }
    return this.outgoingVolume[key];
  }

  updatePosition (position, depth) {
    if (position !== undefined) {
      if ((position.x !== undefined && position.x !== this.position.x)
        || (position.y !== undefined && position.y !== this.position.y)) {
        this.position.x = position.x;
        this.position.y = position.y;
      }
    }
    if (depth !== undefined) {
      this.depth = depth;
    }
    this.updateBoundingBox();
  }

  updateBoundingBox () {
    if (this.view) {
      this.boundingBox = {
        top: this.position.y - this.view.radius,
        right: this.position.x + this.view.radius,
        bottom: this.position.y + this.view.radius,
        left: this.position.x - this.view.radius
      };
    } else {
      this.boundingBox = {
        top: this.position.y - 16,
        right: this.position.x + 16,
        bottom: this.position.y + 16,
        left: this.position.x - 16
      };
    }
  }

  getClass () {
    return this.class || 'normal';
  }

  hasVisibleConnections () {
    return !(every(this.incomingConnections, connection => !connection.isVisible())
      && every(this.outgoingConnections, connection => !connection.isVisible()));
  }

  hasDefaultVisibleConnections () {
    return !(every(this.incomingConnections, connection => connection.defaultFiltered)
      && every(this.outgoingConnections, connection => connection.defaultFiltered));
  }

  setContext (context) {
    super.setContext(context);
    if (this.view) { this.view.updateText(); }
  }

  render () {
    Console.warn('Attempted to render a Node base class. Extend the Node base class and provide a render() function that creates a view property.');
  }

  showNotices () {
    if (this.view) { Notices.showNotices(this.view.container, this.notices); }
  }


  updateData (totalVolume) {
    let updated = false;

    if (this.invalidatedSinceLastViewUpdate) {
      this.invalidatedSinceLastViewUpdate = false;
      const serviceVolume = this.isEntryNode() ? totalVolume : this.getIncomingVolume();
      const serviceVolumePercent = serviceVolume / totalVolume;
      if (this.data.volume !== serviceVolume) {
        this.data.volume = serviceVolume;
        updated = true;
      }
      if (!serviceVolume) {
        this.data.volumePercent = 0;
        each(this.data.classPercents, (v, k) => { this.data.classPercents[k] = 0; });
      } else {
        if (this.data.volumePercent !== serviceVolumePercent) {
          this.data.volumePercent = serviceVolumePercent;
          updated = true;
        }
        each(this.isEntryNode() ? this.outgoingVolume : this.incomingVolume, (volume, key) => {
          const classVolumePercent = volume / serviceVolume;
          this.data.classPercents[key] = this.data.classPercents[key] || 0;
          if (this.data.classPercents[key] !== classVolumePercent) {
            this.data.classPercents[key] = classVolumePercent;
            updated = true;
          }
        });
      }
    }

    if (updated) {
      this.data.globalClassPercents = this.data.globalClassPercents || {};
      const percentGlobal = this.data.volume / totalVolume;
      // generate global class percents
      each(this.data.classPercents, (classPercent, key) => {
        // Emprically found that percentages smaller than 5e-8 will cause THREE RingGeometry(see addDonutSlice) to have a
        // thetaLength so short it won't generate faces.  This prevents too small values. aSqrd-eSqrd, 29-Apr-2019
        this.data.globalClassPercents[key] = (classPercent * percentGlobal) < 5e-8 ? 5e-8 : (classPercent * percentGlobal);
      });
    }

    return updated;
  }

  update (stateNode) {
    this.classInvalidated = this.class !== stateNode.class;
    assign(this, stateNode);
    this.notices = stateNode.notices;
    if (this.view) { this.view.refresh(false); }
  }

  updateVolume (volume) {
    this.updated = this.updateData(volume);
  }

  showLabel (showLabel) {
    if (this.options.showLabel !== showLabel) {
      this.options.showLabel = showLabel;
      if (this.view !== undefined) {
        this.view.showLabel(showLabel);
      }
    }
  }

  setModes (modes) {
    this.detailedMode = modes.detailedNode;
    if (this.view) { this.view.refresh(true); }
  }

  connectedTo (nodeName) {
    if (super.connectionTo(nodeName)) { return true; }

    return !(every(this.incomingConnections, connection => connection.source.getName() !== nodeName)
      && every(this.outgoingConnections, connection => connection.source.getName() !== nodeName));
  }

  // If entryNode is specified within graph we're checking if this node is entryNode
  // else we define entryNode based on amount of incoming and outgoing connections
  isEntryNode () {
    if (this.entryNode) {
      return this.name === this.entryNode;
    }
    return this.incomingConnections.length === 0 && this.outgoingConnections.length > 0;
  }

  cleanup () {
    if (this.view) {
      this.view.cleanup();
    }
  }
}

export default Node;
