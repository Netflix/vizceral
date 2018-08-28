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
import { map, max, some } from 'lodash';
import EventEmitter from 'events';

const Console = console;

class GraphObject extends EventEmitter {
  constructor () {
    super();
    this.minimumNoticeLevel = 0;
    this.metadata = {};
  }

  getName () {
    return this.name;
  }

  getDisplayName () {
    return this.displayName || this.name;
  }

  hasNotices () {
    if (this.notices && this.notices.length > 0) {
      if (this.minimumNoticeLevel > 0) {
        return some(this.notices, notice => notice.severity >= this.minimumNoticeLevel);
      }
      return true;
    }
    return false;
  }

  highestNoticeLevel () {
    if (this.hasNotices()) {
      return max(map(this.notices, n => n.severity || 0));
    }
    return undefined;
  }

  setMinimumNoticeLevel (minimumNoticeLevel = 0) {
    this.minimumNoticeLevel = minimumNoticeLevel;
    if (this.view) {
      this.view.refresh(true);
    }
  }

  showNotices () {
    Console.warn('Attempted to show notices on a GraphObject base class. Extend the GraphObject base class and provide a showNotices() function.');
  }

  setContext (context) {
    this.context = context;
  }

  render () {
    Console.warn('Attempted to render a GraphObject base class. Extend the GraphObject base class and provide a render() function.');
  }

  getView () {
    if (this.view === undefined) { this.render(); }
    return this.view;
  }

  connectedTo (nodeName) {
    if (this.getName() === nodeName) { return true; }
    return false;
  }

  isVisible () {
    return !this.filtered;
  }

  isClickable () {
    return this.isInteractive() || this.isDraggable();
  }

  isInteractive () {
    return false;
  }

  isDraggable () {
    return false;
  }

  cleanup () {
    if (this.view) {
      this.view.cleanup();
    }
  }
}

export default GraphObject;
