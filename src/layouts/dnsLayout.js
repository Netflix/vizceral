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
  each, groupBy, map, sortBy
} from 'lodash';

class DNSLayout {
  run (graph, dimensions, layoutComplete) {
    const nodesByIndex = groupBy(graph.nodes, (n) => {
      try {
        return n.metadata.layout.rank;
      } catch (e) {
        return Math.Infinity;
      }
    });

    const ranks = map(Object.keys(nodesByIndex).sort(),
      idx => sortBy(nodesByIndex[idx], (node) => {
        try {
          return node.metadata.layout.rank;
        } catch (e) {
          return Math.Infinity;
        }
      }));

    const availableWidth = dimensions.width;
    const availableHeight = dimensions.height;

    const rankHeight = availableHeight / ranks.length;

    let rankIndex = 1;
    const yCenter = (ranks.length + 1) / 2.0;

    each(ranks, (rank) => {
      const y = -1 * rankHeight * (rankIndex - yCenter);

      const fileWidth = availableWidth / rank.length;
      let fileIndex = 1;

      const xCenter = (rank.length + 1) / 2.0;

      each(rank, (node) => {
        node.updatePosition({ x: fileWidth * (fileIndex - xCenter), y: y });
        fileIndex++;
      });
      rankIndex++;
    });
    layoutComplete();
  }
}

export default DNSLayout;
