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
import { merge } from 'lodash';

class GlobalDefinitions {
  constructor () {
    this.definitions = {
      detailedNode: {
        volume: {
          default: {
            top: { header: 'RPS', data: 'data.volumePercent', format: '0.0%' },
            bottom: { header: 'ERROR RATE', data: 'data.classPercents.danger', format: '0.00%' },
            donut: {
              data: 'data.globalClassPercents',
              indices: [
                { key: 'danger' },
                { key: 'warning' },
                { key: 'normal', class: 'normalDonut' }
              ]
            },
            arc: {}
          },
          focused: {
            top: { header: 'RPS', data: 'data.volume', format: '0,0' },
            donut: {
              data: 'data.classPercents'
            }
          },
          entry: {
            top: { header: 'TOTAL RPS', data: 'data.volume', format: '0,0' }
          }
        }
      }
    };
  }

  updateDefinitions (definitions) {
    merge(this.definitions, definitions);
  }

  getDefinitions () {
    return this.definitions;
  }

  getDefinition (category, definition, renderer, override) {
    const def = this.definitions[category][definition];
    return def ? merge({}, def.default, def[renderer], def[override]) : {};
  }
}

export default new GlobalDefinitions();
