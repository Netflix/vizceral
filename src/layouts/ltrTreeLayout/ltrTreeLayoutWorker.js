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
/* eslint-env worker */
/* eslint no-restricted-globals: 0 */
/* eslint no-restricted-syntax: 0 */
const LTRTreeLayouter = require('./ltrTreeLayouter.js');

self.ltrTreeLayouter = new LTRTreeLayouter();

self.layout = function (options) {
  // run the layout
  const nodePositions = self.ltrTreeLayouter.layout(options);

  // adjust the layout since our coordinates are center origin
  const halfWidth = options.dimensions.width / 2;
  const halfHeight = options.dimensions.height / 2;
  let nodeName;
  for (nodeName in nodePositions) {
    if ({}.hasOwnProperty.call(nodePositions, nodeName)) {
      nodePositions[nodeName].x -= halfWidth;
      nodePositions[nodeName].y -= halfHeight;
    }
  }

  self.postMessage(nodePositions);
  self.close();
};

self.addEventListener('message', (event) => {
  self.layout(event.data);
});
