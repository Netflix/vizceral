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
import { merge, reduce } from 'lodash';
import chroma from 'chroma-js';

const Console = console;

function getRGBA (color) {
  const chromaColor = chroma(color);
  const rgb = chromaColor.rgb();
  return {
    r: rgb[0] / 255,
    g: rgb[1] / 255,
    b: rgb[2] / 255,
    a: chromaColor.alpha()
  };
}

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
      colorBorderLines: 'rgb(137, 137, 137)',
      colorArcBackground: 'rgb(60, 60, 60)'
    };

    this.updateComputedStyles();
  }

  getColorTraffic (key, highlighted) {
    const color = !highlighted ? this.styles.colorTraffic[key] : this.styles.colorTrafficHighlighted[key];
    if (!color) {
      Console.warn(`Attempted to get a color for key '${key}', but does not exist. Returned color for key 'normal' instead`);
      return !highlighted ? this.styles.colorTraffic.normal : this.styles.colorTrafficHighlighted.normal;
    }
    return color;
  }

  getColorTrafficRGBA (key, highlighted) {
    const color = highlighted ? this.rgba.colorTrafficHighlighted[key] : this.rgba.colorTraffic[key];
    if (!color) {
      Console.warn(`Attempted to get a computed color for key '${key}', but does not exist. Returned color for key 'normal' instead`);
      return highlighted ? this.rgba.colorTrafficHighlighted.normal : this.rgba.colorTraffic.normal;
    }
    return color;
  }

  getColorSeverityRGBA (key) {
    return [
      this.rgba.colorTraffic.normal,
      this.rgba.colorTraffic.warning,
      this.rgba.colorTraffic.danger
    ][key];
  }

  updateStyles (styles) {
    merge(this.styles, styles);
    this.updateComputedStyles(styles);
  }

  updateComputedStyles (styles) {
    this.styles.colorTrafficHighlighted = reduce(this.styles.colorTraffic, (acc, value, key) => {
      if (styles && styles.colorTrafficHighlighted && styles.colorTrafficHighlighted[key]) {
        acc[key] = styles.colorTrafficHighlighted[key];
      } else {
        acc[key] = chroma(value).brighten(3).css();
      }

      return acc;
    }, {});

    this.rgba = {
      colorArcBackground: getRGBA(this.styles.colorArcBackground),
      colorConnectionLine: getRGBA(this.styles.colorConnectionLine),
      colorDonutInternalColor: getRGBA(this.styles.colorDonutInternalColor),
      colorPageBackground: getRGBA(this.styles.colorPageBackground),
      colorTraffic: reduce(this.styles.colorTraffic, (acc, value, key) => {
        acc[key] = getRGBA(value);
        return acc;
      }, {}),
      colorTrafficHighlighted: reduce(this.styles.colorTrafficHighlighted, (acc, value, key) => {
        acc[key] = getRGBA(value);
        return acc;
      }, {}),
    };
  }
}

export default new GlobalStyles();
