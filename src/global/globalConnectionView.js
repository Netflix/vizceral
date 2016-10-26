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
import ConnectionView from '../base/connectionView';

class GlobalConnectionView extends ConnectionView {
  constructor (connection) {
    super(connection, 20000, true);
    this.updatePosition();
    this.updateVolume();
  }

  setParticleLevels () {
    super.setParticleLevels();
    this.maxParticleDelay = 400;

    // After some testing, it's pretty hard to see the difference in density after
    // 40.  It's still a linear growth curve, but since there is so much overlapping
    // differences much further than 40 are too difficult to spot
    this.maxParticleMultiplier = 40;
  }
}

export default GlobalConnectionView;
