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

class GlobalStyles {
  constructor () {
    this.styles = {
      colorText: 'rgb(214, 214, 214)',
      colorTextDisabled: 'rgb(129, 129, 129)',
      colorNormal: 'rgb(186, 213, 237)',
      colorWarning: 'rgb(268, 185, 73)',
      colorDanger: 'rgb(184, 36, 36)',
      colorNormalDimmed: 'rgb(101, 117, 128)',
      colorBackgroundDark: 'rgb(35, 35, 35)',
      colorNormalDonut: 'rgb(91, 91, 91)',
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

  updateStyles (styles) {
    _.merge(this.styles, styles);
    this.updateComputedStyles();
  }

  updateComputedStyles () {
    this.styles.colorSeverity = [
      this.styles.colorNormal,
      this.styles.colorWarning,
      this.styles.colorDanger
    ];

    this.styles.colorSeverityHighlighted = [
      chroma(this.styles.colorNormal).brighten(3).css(),
      chroma(this.styles.colorWarning).brighten(3).css(),
      chroma(this.styles.colorDanger).brighten(3).css()
    ];

    this.threeStyles = {
      colorConnectionLine: new THREE.Color(this.styles.colorConnectionLine),
      colorDonutInternalColor: new THREE.Color(this.styles.colorDonutInternalColor),
      colorPageBackground: new THREE.Color(this.styles.colorPageBackground),
      colorSeverity: this.styles.colorSeverity.map(color => new THREE.Color(color)),
      colorSeverityHighlighted: this.styles.colorSeverityHighlighted.map(color => new THREE.Color(color))
    };
  }
}

export default new GlobalStyles();
