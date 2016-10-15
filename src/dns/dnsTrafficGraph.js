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

import DnsConnection from './dnsConnection';
import DnsNode from './dnsNode';
import TrafficGraph from '../base/trafficGraph';

const Console = console;

function positionNodes (nodes, dimensions) {
  const nodesByIndex = _.groupBy(nodes, (n) => {
    try {
      return n.metadata.layout.rank;
    } catch (e) {
      return Math.Infinity;
    }
  });

  const ranks = _.map(Object.keys(nodesByIndex).sort(),
    (idx) => _.sortBy(nodesByIndex[idx], (node) => {
      try {
        return node.metadata.layout.rank;
      } catch (e) {
        return Math.Infinity;
      }
    })
  );

  const nodeSize = 100;
  const availableWidth = dimensions.width;
  const availableHeight = dimensions.height;

  const rankHeight = availableHeight / ranks.length;

  let rankIndex = 1;
  const yCenter = (ranks.length + 1) / 2.0;

  _.each(ranks, rank => {
    const y = -1 * rankHeight * (rankIndex - yCenter);

    const fileWidth = availableWidth / rank.length;
    let fileIndex = 1;

    const xCenter = (rank.length + 1) / 2.0;

    _.each(rank, node => {
      node.size = nodeSize;
      node.loaded = true;
      node.position = {
        x: fileWidth * (fileIndex - xCenter),
        y: y
      };

      fileIndex++;
    });
    rankIndex++;
  });
}

class DNSTrafficGraph extends TrafficGraph {
  constructor (name, mainView, graphWidth, graphHeight) {
    super(name, mainView, graphWidth, graphHeight, DnsNode, DnsConnection, true);
    this.linePrecision = 50;
    this.state = {
      nodes: [],
      connections: []
    };
    this.contextDivs = {};

    this.dimensions = {
      width: graphWidth,
      height: graphHeight
    };

    this.hasPositionData = true;
  }

  setState (state, force) {
    try {
      _.each(state.nodes, node => {
        const existingNodeIndex = _.findIndex(this.state.nodes, { name: node.name });
        if (existingNodeIndex !== -1) {
          this.state.nodes[existingNodeIndex] = node;
        } else {
          this.state.nodes.push(node);
        }
      });

      _.each(state.connections, newConnection => {
        const existingConnectionIndex = _.findIndex(this.state.connections, { source: newConnection.source, target: newConnection.target });
        if (existingConnectionIndex !== -1) {
          this.state.connections[existingConnectionIndex] = newConnection;
        } else {
          this.state.connections.push(newConnection);
        }
      });

      // update maxVolume
      // depending on how the data gets fed, we might not have a global max volume.
      // If we do not, calculate it based on all the second level nodes max volume.
      //
      // Just for visual sake, we set the max volume to 150% of the greatest
      // connection volume. This allows for buffer room for failover traffic to be
      // more visually dense.
      let maxVolume = state.maxVolume || 0;
      if (!maxVolume) {
        _.each(this.state.nodes, node => {
          maxVolume = Math.max(maxVolume, node.maxVolume || 0);
        });
      }
      this.state.maxVolume = maxVolume * 1.5;
    } catch (e) {
      Console.log(e);
    }

    positionNodes(this.state.nodes, this.dimensions);
    super.setState(this.state, force);
  }

  setFilters () {
    // no-op
  }

  _relayout () {
    // no-op
  }
}

export default DNSTrafficGraph;
