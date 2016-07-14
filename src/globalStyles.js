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
import THREE from 'three';
import chroma from 'chroma-js';

const Console = console;

class GlobalStyles {
  constructor () {
    this.styles = {
      colorText: 'rgb(214, 214, 214)',
      colorTextDisabled: 'rgb(129, 129, 129)',
      colorTraffic: {
        normal: 'rgb(186, 213, 237)',
        normalDonut: 'rgb(91, 91, 91)',
        warning: 'rgb(268, 185, 73)',
        danger: 'rgb(184, 36, 36)'
      },
      colorNormalDimmed: 'rgb(101, 117, 128)',
      colorBackgroundDark: 'rgb(35, 35, 35)',
      colorLabelBorder: 'rgb(16, 17, 18)',
      colorLabelText: 'rgb(0, 0, 0)',
      colorDonutInternalColor: 'rgb(35, 35, 35)',
      colorDonutInternalColorHighlighted: 'rgb(255, 255, 255)',
      colorConnectionLine: 'rgb(91, 91, 91)',
      colorPageBackground: 'rgb(45, 45, 45)',
      colorPageBackgroundTransparent: 'rgba(45, 45, 45, 0)',
      colorBorderLines: 'rgb(137, 137, 137)'
    };

    this.updateComputedStyles();
  }

  getColorTraffic (key) {
    const color = this.styles.colorTraffic[key];
    if (!color) {
      Console.warn(`Attempted to get a color for key '${key}', but does not exist. Returned color for key 'normal' instead`);
      return this.styles.colorTraffic.normal;
    }
    return color;
  }

  getColorTrafficThree (key, highlighted) {
    const color = highlighted ? this.threeStyles.colorTrafficHighlighted[key] : this.threeStyles.colorTraffic[key];
    if (!color) {
      Console.warn(`Attempted to get a computed three.js color for key '${key}', but does not exist. Returned three.js color for key 'normal' instead`);
      return highlighted ? this.threeStyles.colorTrafficHighlighted.normal : this.threeStyles.colorTraffic.normal;
    }
    return color;
  }

  updateStyles (styles) {
    _.merge(this.styles, styles);
    this.updateComputedStyles();
  }

  updateComputedStyles () {
    this.styles.colorTrafficHighlighted = _.reduce(this.styles.colorTraffic, (acc, value, key) => {
      acc[key] = chroma(value).brighten(3).css();
      return acc;
    }, {});

    this.threeStyles = {
      colorConnectionLine: new THREE.Color(this.styles.colorConnectionLine),
      colorDonutInternalColor: new THREE.Color(this.styles.colorDonutInternalColor),
      colorPageBackground: new THREE.Color(this.styles.colorPageBackground),
      colorTraffic: _.reduce(this.styles.colorTraffic, (acc, value, key) => {
        acc[key] = new THREE.Color(value);
        return acc;
      }, {}),
      colorTrafficHighlighted: _.reduce(this.styles.colorTrafficHighlighted, (acc, value, key) => {
        acc[key] = new THREE.Color(value);
        return acc;
      }, {}),
    };
  }
}

export default new GlobalStyles();
