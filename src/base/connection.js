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
  clone, sortBy, sum, isEmpty, values, reduce
} from 'lodash';
import GraphObject from './graphObject';
import Notices from '../notices';

const Console = console;

class Connection extends GraphObject {
  constructor (options) {
    super();
    this.type = 'connection';
    this.source = options.source;
    this.target = options.target;

    this.source.addOutgoingConnection(this);
    this.target.addIncomingConnection(this);

    this.name = `${this.source.name}--${this.target.name}`;

    this.update(options.data);
    this.loaded = true;
  }

  getName () {
    return this.name;
  }

  getVolume (key) {
    return this.volume[key];
  }

  getVolumePercent (key) {
    return this.volumePercent[key];
  }

  getVolumeTotal () {
    return this.volumeTotal;
  }

  update (data) {
    this.metadata = data.metadata || this.metadata;
    this.annotations = data.annotations || this.annotations;

    this.class = data.class || 'normal';
    this.volume = data.metrics ? clone(data.metrics) : {};
    if (isEmpty(this.volume)) {
      // Add info notice to the connection with missing metrics
      this.notices = this.notices || [];
      this.notices.push({ title: 'Connection found, but no metrics.', severity: 0 });
    }
    this.volumeTotal = sum(values(this.volume));
    this.notices = data.notices || undefined;

    // Store percentages on the object to not have to calculate it when
    // launching new particles in the view
    this.volumePercent = reduce(this.volume, (acc, value, key) => {
      acc[key] = (this.volumeTotal && this.volumeTotal > 0) ? (value / this.volumeTotal) : 0;
      return acc;
    }, {});

    this.volumePercentKeysSorted = sortBy(Object.keys(this.volumePercent), key => this.volumePercent[key]);

    // Invalidate the volumes on the nodes themselves
    this.source.invalidateOutgoingVolume();
    this.target.invalidateIncomingVolume();

    if (this.view) {
      this.view.refresh();
    }
  }

  updateGreatestVolume (greatestVolume) {
    this.volumeGreatest = greatestVolume;
    if (this.view) {
      this.view.updateVolume();
    }
  }

  render () {
    Console.warn('Attempted to render a Connection base class. Extend the Connection class and provide a render() function.');
  }

  showNotices () {
    if (this.view && this.view.noticeView) { Notices.showNotices(this.view.noticeView.container, this.notices); }
  }

  connectedTo (nodeName) {
    return this.source.getName() === nodeName || this.target.getName() === nodeName;
  }

  isInteractive () {
    return this.view !== undefined;
  }
}

export default Connection;
