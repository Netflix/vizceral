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
import { each, findIndex } from 'lodash';

import DnsConnection from './dnsConnection';
import DnsLayout from '../layouts/dnsLayout';
import DnsNode from './dnsNode';
import TrafficGraph from '../base/trafficGraph';

const Console = console;

class DNSTrafficGraph extends TrafficGraph {
  constructor (name, mainView, parentGraph, graphWidth, graphHeight, Layout = DnsLayout) {
    super(name, mainView, parentGraph, graphWidth, graphHeight, DnsNode, DnsConnection, Layout);
    this.type = 'dns';
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
    // This function cannot remove any nodes and leaks, but this is not our problem for now.
    try {
      each(state.nodes, (node) => {
        const existingNodeIndex = findIndex(this.state.nodes, { name: node.name });
        if (existingNodeIndex !== -1) {
          this.state.nodes[existingNodeIndex] = node;
        } else {
          this.state.nodes.push(node);
        }
      });

      each(state.connections, (newConnection) => {
        const existingConnectionIndex = findIndex(this.state.connections, { source: newConnection.source, target: newConnection.target });
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
        each(this.state.nodes, (node) => {
          maxVolume = Math.max(maxVolume, node.maxVolume || 0);
        });
      }
      this.state.maxVolume = maxVolume * 1.5;
    } catch (e) {
      Console.log(e);
    }

    super.setState(this.state, force);
  }

  setFilters () {
    // no-op
  }
}

export default DNSTrafficGraph;
