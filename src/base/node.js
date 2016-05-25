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

import GraphObject from './graphObject';
import NodeViewStandard from './nodeViewStandard';
import NodeViewDetailed from './nodeViewDetailed';
import Notices from '../notices';

const Console = console;

class Node extends GraphObject {
  constructor (node, type) {
    super();
    this.update(node);
    this.minimumNoticeLevel = 0;

    this.type = type;
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
      rps: { type: 'number', value: NaN },
      rpsPercent: { type: 'percent', value: 0 },
      errorPercent: { type: 'percent', value: 0 },
      degradedPercent: { type: 'percent', value: 0 }
    };
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
    this.incomingConnections = _.remove(this.incomingConnections, incomingConnection => incomingConnection.name === connection.name);
    if (this.incomingConnections.length === 0 && this.outgoingConnections.length === 0) {
      this.connected = false;
    }
  }

  removeOutgoingConnection (connection) {
    this.outgoingConnections = _.remove(this.outgoingConnections, outgoingConnection => outgoingConnection.name === connection.name);
    if (this.incomingConnections.length === 0 && this.outgoingConnections.length === 0) {
      this.connected = false;
    }
  }

  invalidateIncomingVolume () {
    this.invalidatedSinceLastViewUpdate = true;
    this.incomingVolume = undefined;
    this.incomingDegradedVolume = undefined;
    this.incomingErrorVolume = undefined;
  }

  validateIncomingVolume () {
    this.incomingVolume = _.reduce(this.incomingConnections, (total, connection) => total + connection.getTotalVolume(), 0);
    this.incomingDegradedVolume = _.reduce(this.incomingConnections, (total, connection) => total + connection.getDegradedVolume(), 0);
    this.incomingErrorVolume = _.reduce(this.incomingConnections, (total, connection) => total + connection.getErrorVolume(), 0);
  }

  getIncomingVolume () {
    if (!this.incomingVolume) { this.validateIncomingVolume(); }
    return this.incomingVolume;
  }

  getIncomingDegradedVolume () {
    if (!this.incomingDegradedVolume) { this.validateIncomingVolume(); }
    return this.incomingDegradedVolume;
  }

  getIncomingErrorVolume () {
    if (!this.incomingErrorVolume) { this.validateIncomingVolume(); }
    return this.incomingErrorVolume;
  }

  invalidateOutgoingVolume () {
    this.invalidatedSinceLastViewUpdate = true;
    this.outgoingVolume = undefined;
    this.outgoingDegradedVolume = undefined;
    this.outgoingErrorVolume = undefined;
  }

  validateOutgoingVolume () {
    this.outgoingVolume = _.reduce(this.outgoingConnections, (total, connection) => total + connection.getTotalVolume(), 0);
    this.outgoingDegradedVolume = _.reduce(this.outgoingConnections, (total, connection) => total + connection.getDegradedVolume(), 0);
    this.outgoingErrorVolume = _.reduce(this.outgoingConnections, (total, connection) => total + connection.getErrorVolume(), 0);
  }

  getOutgoingVolume () {
    if (!this.outgoingVolume) { this.validateOutgoingVolume(); }
    return this.outgoingVolume;
  }

  getOutgoingDegradedVolume () {
    if (!this.outgoingDegradedVolume) { this.validateOutgoingVolume(); }
    return this.outgoingDegradedVolume;
  }

  getOutgoingErrorVolume () {
    if (!this.outgoingErrorVolume) { this.validateOutgoingVolume(); }
    return this.outgoingErrorVolume;
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

  getSeverity () {
    if (this.score === undefined) {
      Console.warn(`Node ${this.name} does not have a score, returning 0.`);
    }
    return Math.round(this.score || 0);
  }

  hasVisibleConnections () {
    return !(_.every(this.incomingConnections, connection => !connection.isVisible())
      && _.every(this.outgoingConnections, connection => !connection.isVisible()));
  }

  hasDefaultVisibleConnections () {
    return !(_.every(this.incomingConnections, connection => connection.defaultFiltered)
      && _.every(this.outgoingConnections, connection => connection.defaultFiltered));
  }

  render () {
    this.views = {
      standard: new NodeViewStandard(this),
      detailed: new NodeViewDetailed(this)
    };
    // Set the default view type
    this.view = this.type === 'region' ? this.views.detailed : this.views.standard;
  }

  showNotices () {
    if (this.view) { Notices.showNotices(this.view.container, this.notices); }
  }


  showDetailedView (showDetailed) {
    if (!this.views) { this.render(); }
    const detailedViewShown = this.view === this.views.detailed;
    if (detailedViewShown !== showDetailed) {
      if (showDetailed) {
        this.view = this.views.detailed;
        this.focused = true;
        this.view.refresh();
      } else {
        this.view = this.views.standard;
        this.focused = false;
      }
    }
  }

  updateData (rps) {
    let updated = false;

    if (this.invalidatedSinceLastViewUpdate) {
      this.invalidatedSinceLastViewUpdate = false;
      const serviceRPS = this.isEntryNode() ? rps : this.getIncomingVolume();
      if (this.data.rps.value !== serviceRPS) {
        this.data.rps.value = serviceRPS;
        updated = true;
      }
      if (!serviceRPS) {
        this.data.rpsPercent.value = 0;
        this.data.errorPercent.value = 0;
        this.data.degradedPercent.value = 0;
      } else {
        const rpsPercent = serviceRPS / rps;
        if (this.data.rpsPercent.value !== rpsPercent) {
          this.data.rpsPercent.value = rpsPercent;
          updated = true;
        }
        const errorVolume = (this.isEntryNode() ? this.getOutgoingErrorVolume() : this.getIncomingErrorVolume()) / serviceRPS;
        if (this.data.errorPercent.value !== errorVolume) {
          this.data.errorPercent.value = errorVolume;
          updated = true;
        }
        const degradedVolume = (this.isEntryNode() ? this.getOutgoingDegradedVolume() : this.getIncomingDegradedVolume()) / serviceRPS;
        if (this.data.degradedPercent.value !== degradedVolume) {
          this.data.degradedPercent.value = degradedVolume;
          updated = true;
        }
      }
    }
    return updated;
  }

  update (stateNode) {
    const needsRefresh = this.score !== stateNode.score;
    _.assign(this, stateNode);
    if (needsRefresh && this.view) { this.view.refresh(); }
  }

  updateRPS (rps) {
    this.updated = this.updateData(rps);
  }

  showLabel (showLabel) {
    if (this.options.showLabel !== showLabel) {
      this.options.showLabel = showLabel;
      if (this.view !== undefined) {
        _.each(this.views, view => {
          view.showLabel(showLabel);
        });
      }
    }
  }

  connectedTo (nodeName) {
    if (super.connectionTo(nodeName)) { return true; }

    return !(_.every(this.incomingConnections, connection => connection.source.getName() !== nodeName)
      && _.every(this.outgoingConnections, connection => connection.source.getName() !== nodeName));
  }

  isEntryNode () {
    return this.getName() === 'INTERNET';
  }

  isClickable () {
    return this.isInteractive();
  }

  isInteractive () {
    return (this.type === 'region' && !this.isEntryNode())
      || (this.type === 'service' && this.view !== this.views.detailed);
  }

  cleanup () {
    if (this.views) {
      _.each(this.views, view => view.cleanup());
    }
  }
}

export default Node;
