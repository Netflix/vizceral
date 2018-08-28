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
  cloneDeep, get, uniqBy, filter, reduce, clone, find, remove
} from 'lodash';
import FocusedTrafficGraph from './focusedTrafficGraph';

class FocusedChildTrafficGraph extends FocusedTrafficGraph {
  manipulateState (state, parentState) {
    // set up the focused node
    const thisNode = cloneDeep(state);
    delete thisNode.renderer;
    thisNode.focused = true;
    thisNode.size = 120;

    this.layoutOptions = { noRankPromotion: true };

    // manipulate nodes and connections based on parent graph
    state.connections = filter(parentState.connections, connection => connection.source === state.name || connection.target === state.name);
    state.nodes = uniqBy(reduce(state.connections, (acc, connection) => {
      acc.push(clone(find(parentState.nodes, { name: connection.source })));
      acc.push(clone(find(parentState.nodes, { name: connection.target })));
      return acc;
    }, []), 'name');

    // replace focused node
    remove(state.nodes, node => node.name === thisNode.name);
    state.nodes.push(thisNode);

    // clean up new state
    state.nodes.forEach(node => delete node.renderer);
    state.maxVolume = state.maxVolume || get(this.parentGraph, ['volume', 'max'], 0);
  }

  setState (state, force, parentState) {
    this.manipulateState(state, parentState);
    super.setState(state, force, parentState);
  }
}

export default FocusedChildTrafficGraph;
