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

import Node from '../base/node';

class GlobalNode extends Node {
  constructor (node) {
    super(node, 'global');
    this.loaded = this.isEntryNode();
  }

  updateData (totalVolume) {
    const updated = super.updateData(totalVolume);
    if (updated) {
      this.data.globalClassPercents = this.data.globalClassPercents || {};
      const percentGlobal = this.data.volume / totalVolume;
      // generate global class percents
      _.each(this.data.classPercents, (classPercent, key) => {
        this.data.globalClassPercents[key] = classPercent * percentGlobal;
      });
    }
    return updated;
  }
}

export default GlobalNode;
