/* eslint-disable no-restricted-syntax */
/**
 * Created by jbrekelmans on 21/10/2016.
 */
import { each, keys } from 'lodash';

const objectPrototype = Object.prototype;
const objectGetPrototypeOf = Object.getPrototypeOf;
const hasOwnPropFunc = objectPrototype.hasOwnProperty;
const Console = console;
const canCoerceToFiniteDouble = Number.isFinite;

class Vector2 {
  constructor (x, y) {
    this.x = x;
    this.y = y;
  }

  set (x, y) {
    this.x = x;
    this.y = y;
  }
}

class Particle {
  constructor () {
    this.trafficGraphNode = null;
    this.wasSimulatedInLastUpdate = false;
    this.p = new Vector2(0, 0);
    this.dp_dt = new Vector2(0, 0);
    this.v = new Vector2(0, 0);
    this.dv_dt = new Vector2(0, 0);
    this.f = new Vector2(0, 0);
    this.mass = 0.5;
  }

  getPositionFromTrafficGraphNode () {
    const tgn = this.trafficGraphNode;
    const pos = tgn.position;
    if (pos == null) {
      return false;
    }
    const posx = pos.x;
    const posy = pos.y;
    if (typeof posx !== 'number' || !canCoerceToFiniteDouble(posx)
        || typeof posy !== 'number' || !canCoerceToFiniteDouble(posy)) {
      return false;
    }
    this.p.set(posx, posy);
    return true;
  }
}

class HooksSpring {
  constructor (fromParticle, toParticle, springConstant, dampingConstant, restLength) {
    this.fromParticle = fromParticle;
    this.toParticle = toParticle;
    this.springConstant = springConstant;
    this.dampingConstant = dampingConstant;
    this.restLength = restLength;
  }
}

const doubleSqrt = Math.sqrt;
const SENTINEL = {};
function getOwnProp (o, p) {
  return hasOwnPropFunc.call(o, p) ? o[p] : SENTINEL;
}

class ParticleSystem {
  constructor (trafficGraph, width, height, isEnabled) {
    this._id = trafficGraph.name;
    this._nodeSpaceSpan2D = new Vector2(width, height);
    this._trafficGraph = trafficGraph;
    this._lastUpdateTime = null;
    this._viscousDragCoefficient = 0.1;
    this._particleFromNodeName = {};
    this._particles_mass = 0.5;
    this._fJaspersReplusionBetweenParticles = true;
    this._hooksSprings = [];
    this._hooksSprings_restLength = 400;
    this._hooksSprings_springConstant = 0.2;
    this._hooksSprings_dampingConstant = 0.1;
    this._disabled = !isEnabled;
    this._numberOfErrorLogsFromUpdate = 0;
    this._isFirstUpdateAfterSetLastUpdateTime = false;
  }

  disable () {
    if (this._disabled) return;
    this._disabled = true;
    Console.log('ParticleSystem disabled: ', this._id);
  }

  enable () {
    if (!this._disabled) return;
    this._disabled = false;
    Console.log('ParticleSystem enabled: ', this._id);
  }

  debugEnsureStructureConsistency () {
    const { nodes } = this._trafficGraph;
    const particleFromNodeName = this._particleFromNodeName;
    let hasParticleNodeInconsistency = false;
    const nodesKeys = keys(nodes);
    const nodeCount = nodesKeys.length;
    const particleFromNodeNameKeys = keys(particleFromNodeName);
    const particleCount = particleFromNodeNameKeys.length;
    for (let i = 0; i < particleCount; i++) {
      if (!hasOwnPropFunc.call(nodes, particleFromNodeNameKeys[i])) {
        hasParticleNodeInconsistency = true;
      }
    }
    if (particleCount !== nodeCount) {
      hasParticleNodeInconsistency = true;
    }
    if (hasParticleNodeInconsistency) {
      Console.error('ParticleSystem seems inconsistent with graph during update, resynchronizing: ', this._id);
      this.synchronizeStructure();
    }
  }

  _getParticlesToSimulate () {
    const simParticles = [];
    let n1 = 0;
    const particleFromNodeName = this._particleFromNodeName;
    const particleFromNodeNameKeys = keys(particleFromNodeName);
    const n = particleFromNodeNameKeys.length;
    for (let i = 0; i < n; i++) {
      const nodeName = particleFromNodeNameKeys[i];
      const particle = particleFromNodeName[nodeName];
      particle.wasSimulatedInLastUpdate = particle.trafficGraphNode.isVisible() && particle.getPositionFromTrafficGraphNode();
      if (particle.wasSimulatedInLastUpdate) {
        simParticles[n1++] = particle;
      }
    }
    return simParticles;
  }

  getOptions () {
    return {
      viscousDragCoefficient: this._viscousDragCoefficient,
      particles: {
        mass: this._particles_mass,
      },
      hooksSprings: {
        restLength: this._hooksSprings_restLength,
        springConstant: this._hooksSprings_springConstant,
        dampingConstant: this._hooksSprings_dampingConstant
      }
    };
  }

  setOptions (options) {
    let v = getOwnProp(options, 'viscousDragCoefficient');
    if (v !== SENTINEL) {
      if (typeof v !== 'number' || v < 0 || v > 1 || !canCoerceToFiniteDouble(v)) {
        Console.warn('ParticleSystem.setOptions: got invalid viscous drag coefficient. Expected number in range [0, 1], but got: ', v);
      } else {
        this._viscousDragCoefficient = v;
      }
    }
    v = getOwnProp(options, 'jaspersReplusionBetweenParticles');
    if (v !== SENTINEL) {
      if (typeof v !== 'boolean') {
        Console.warn('ParticleSystem.setOptions(options): options.jaspersReplusionBetweenParticles was expected to be a boolean, but got:', v);
      } else {
        this._fJaspersReplusionBetweenParticles = v;
      }
    }
    v = getOwnProp(options, 'particles');
    if (v !== SENTINEL) {
      if (objectGetPrototypeOf(v) !== objectPrototype) {
        Console.warn('ParticleSystem.setOptions(options): options.particles was expected to be a pojo, but got:', v);
      }
      v = getOwnProp(v, 'mass');
      if (v !== SENTINEL) {
        if (typeof v !== 'number' || v < 0.1 || !canCoerceToFiniteDouble(v)) {
          Console.warn('ParticleSystem.setOptions(options): got invalid options.particles.mass. Expected number in range [0.1, Inf), but got: ', v);
        } else {
          this._particles_mass = v;
          each(this._particleFromNodeName, (node) => {
            node.mass = v;
          });
        }
      }
    }
    v = getOwnProp(options, 'hooksSprings');
    if (v !== SENTINEL) {
      const optsHS = options.hooksSprings;
      if (objectGetPrototypeOf(optsHS) !== objectPrototype) {
        Console.warn('ParticleSystem.setOptions(options): options.hooksSpring was expected to be a pojo, but got:', optsHS);
      } else {
        let restLen = getOwnProp(optsHS, 'restLength');
        if (restLen !== SENTINEL) {
          if (typeof restLen !== 'number' || !canCoerceToFiniteDouble(restLen) || restLen < 0) {
            Console.warn('ParticleSystem.setOptions: hooksSpring.restLength was expected to be a non-negative finite number, but got:', restLen);
            restLen = SENTINEL;
          } else {
            this._hooksSprings_restLength = restLen;
          }
        }
        let springConst = getOwnProp(optsHS, 'springConstant');
        if (springConst !== SENTINEL) {
          if (typeof springConst !== 'number' || !canCoerceToFiniteDouble(springConst) || springConst < 0 || springConst > 1) {
            Console.warn('ParticleSystem.setOptions: hooksSpring.restLength was expected to be a non-negative finite number, but got:', springConst);
            springConst = SENTINEL;
          } else {
            this._hooksSprings_springConstant = springConst;
          }
        }
        let dampingConst = getOwnProp(optsHS, 'dampingConstant');
        if (dampingConst !== SENTINEL) {
          if (typeof dampingConst !== 'number' || !canCoerceToFiniteDouble(dampingConst) || dampingConst < 0 || dampingConst > 1) {
            Console.warn('ParticleSystem.setOptions: hooksSpring.restLength was expected to be a non-negative finite number, but got:', dampingConst);
            dampingConst = SENTINEL;
          } else {
            this._hooksSprings_dampingConstant = dampingConst;
          }
        }
        const hsList = this._hooksSprings;
        for (let i = 0, n = hsList.length; i < n; i++) {
          if (springConst !== SENTINEL) {
            hsList[i].springConstant = springConst;
          }
          if (dampingConst !== SENTINEL) {
            hsList[i].dampingConstant = dampingConst;
          }
          if (restLen !== SENTINEL) {
            hsList[i].restLength = restLen;
          }
        }
      }
      Console.debug('ParticleSystem.setOptions: ', options, this.getOptions());
    }
  }

  setLastUpdateTime (time) {
    this._lastUpdateTime = time;
    this._isFirstUpdateAfterSetLastUpdateTime = true;
    // Console.log('ParticleSystem setLastUpdateTime', time);
  }

  update (time) {
    const lastUpdateTime = this._lastUpdateTime;
    this._lastUpdateTime = time;
    try {
      if (this._disabled || lastUpdateTime === null) return;
      const dt = (time - lastUpdateTime) / 1000;
      if (dt > 100) return;
      if (this._isFirstUpdateAfterSetLastUpdateTime) {
        this._isFirstUpdateAfterSetLastUpdateTime = false;
        Console.debug('ParticleSystem update: first update after current graph was selected', lastUpdateTime, time);
      }
      this.debugEnsureStructureConsistency();

      // Deal with filtered nodes, otherwise hidden nodes and nodes without a valid position object.
      const simParticles = this._getParticlesToSimulate();
      const simHooksSprings = this._hooksSprings.filter(hooksSpring => hooksSpring.fromParticle.wasSimulatedInLastUpdate && hooksSpring.toParticle.wasSimulatedInLastUpdate);
      if (simParticles.some(p => !canCoerceToFiniteDouble(p.p.x) || !canCoerceToFiniteDouble(p.p.y))) {
        Console.warn('ParticleSystem update: NaN/Inf positions after getParticlesToSimulate');
      }
      // http://paulbourke.net/miscellaneous/particle/

      this._calculateForces(simParticles, simHooksSprings);
      if (simParticles.some(p => !canCoerceToFiniteDouble(p.f.x) || !canCoerceToFiniteDouble(p.f.y))) {
        Console.warn('ParticleSystem update: NaN/Inf forces after calculateForces');
      }
      ParticleSystem.calculateDerivatives(simParticles);
      if (simParticles.some(p => !canCoerceToFiniteDouble(p.dp_dt.x) || !canCoerceToFiniteDouble(p.dp_dt.y))) {
        Console.warn('ParticleSystem update: NaN/Inf dp/dt after calculateDerivatives');
      }
      if (simParticles.some(p => !canCoerceToFiniteDouble(p.dv_dt.x) || !canCoerceToFiniteDouble(p.dv_dt.y))) {
        Console.warn('ParticleSystem update: NaN/Inf dv/dt after calculateDerivatives');
      }

      for (const p of simParticles) {
        // Euler
        p.p.x += p.dp_dt.x * dt;
        p.p.y += p.dp_dt.y * dt;
        p.v.x += p.dv_dt.x * dt;
        p.v.y += p.dv_dt.y * dt;
      }

      if (simParticles.some(p => !canCoerceToFiniteDouble(p.p.x) || !canCoerceToFiniteDouble(p.p.y))) {
        Console.warn('ParticleSystem update: NaN/Inf positions after solve');
      }
      if (simParticles.some(p => !canCoerceToFiniteDouble(p.v.x) || !canCoerceToFiniteDouble(p.v.y))) {
        Console.warn('ParticleSystem update: NaN/Inf velocities after solve');
      }

      const simNodeNames = {};
      for (const partic of simParticles) {
        const node = partic.trafficGraphNode;
        const nodePos = node.position;
        const particPos = partic.p;
        nodePos.x = particPos.x;
        nodePos.y = particPos.y;
        node.updateBoundingBox();
        const nodeView = node.view;
        if (nodeView) {
          nodeView.updatePosition();
        }
        simNodeNames[node.name] = 1;
      }
      const { connections } = this._trafficGraph;
      each(connections, (conn) => {
        const connView = conn.view;
        if (connView
          && (hasOwnPropFunc.call(simNodeNames, conn.source.name)
          || hasOwnPropFunc.call(simNodeNames, conn.target.name))) {
          connView.updatePosition();
        }
      });
    } catch (e) {
      this._logErrorFromUpdate(e);
    }
  }

  _logErrorFromUpdate (...args) {
    if (++this._numberOfErrorLogsFromUpdate < 6) {
      Console.error(...['ParticleSystem update, got error during update'].concat(args));
    }
    if (this._numberOfErrorLogsFromUpdate === 6) {
      Console.warn('ParticleSystem update, hiding errors to avoid spam');
    }
  }

  static calculateDerivatives (simParticles) {
    for (const p of simParticles) {
      p.dp_dt.x = p.v.x;
      p.dp_dt.y = p.v.y;
      const massReciproc = 1 / p.mass;
      p.dv_dt.x = p.f.x * massReciproc;
      p.dv_dt.y = p.f.y * massReciproc;
    }
  }

  _calculateForces (simParticles, simHooksSprings) {
    const viscousDragCoefficient = this._viscousDragCoefficient;
    const n = simParticles.length;
    for (let i = 0; i < n; i++) {
      const particle = simParticles[i];
      particle.f.set(
        particle.v.x * -viscousDragCoefficient,
        particle.v.y * -viscousDragCoefficient
      );
    }
    if (simParticles.some(p => !canCoerceToFiniteDouble(p.f.x) || !canCoerceToFiniteDouble(p.f.y))) {
      const partic = simParticles.filter(p => !canCoerceToFiniteDouble(p.f.x) || !canCoerceToFiniteDouble(p.f.y))[0];
      Console.warn('ParticleSystem update calculateForces: NaN/Inf forces after reset forces and calculate viscous drag:', partic);
    }
    let flag = false;
    let flag3 = false;
    for (const hooksSpring of simHooksSprings) {
      const partic1 = hooksSpring.fromParticle;
      const partic2 = hooksSpring.toParticle;
      const v1X = partic1.p.x - partic2.p.x;
      const v1Y = partic1.p.y - partic2.p.y;
      const v1Len = doubleSqrt((v1X * v1X) + (v1Y * v1Y));
      const forceNum1 = hooksSpring.springConstant * (v1Len - hooksSpring.restLength);
      if (!canCoerceToFiniteDouble(forceNum1)) {
        if (!flag) {
          Console.warn('ParticleSystem update calculateForces: NaN/Inf forces during hookSpring force calculation: forceNum1');
        }
        flag = true;
      }
      const v2X = partic1.v.x - partic2.v.x;
      const v2Y = partic1.v.y - partic2.v.y;
      const v1LenReciproc = 1 / v1Len;
      let v3X;
      let v3Y;
      if (!canCoerceToFiniteDouble(v1LenReciproc)) {
        v3X = 0;
        v3Y = 0;
      } else {
        v3X = v1X * v1LenReciproc;
        v3Y = v1Y * v1LenReciproc;
      }
      if (!canCoerceToFiniteDouble(v3X) || !canCoerceToFiniteDouble(v3Y)) {
        if (!flag3) {
          Console.warn('ParticleSystem update calculateForces: NaN/Inf normalized v1', v1LenReciproc);
        }
        flag3 = true;
      }
      const forceOnPartic1X = -v3X * (forceNum1 + (hooksSpring.dampingConstant * v2X * v3X));
      const forceOnPartic1Y = -v3Y * (forceNum1 + (hooksSpring.dampingConstant * v2Y * v3Y));
      partic1.f.x += forceOnPartic1X;
      partic1.f.y += forceOnPartic1Y;
      partic2.f.x -= forceOnPartic1X;
      partic2.f.y -= forceOnPartic1Y;
    }

    if (this._fJaspersReplusionBetweenParticles) {
      const jRestLen = 140;
      const jSprintConst = 0.2;
      const jDampingConst = 0;
      flag = false;
      flag3 = false;
      for (let i = 0; i < n; i++) {
        const partic1 = simParticles[i];
        for (let j = 0; j < n; j++) {
          const partic2 = simParticles[j];
          if (partic1 !== partic2) {
            const v1X = partic1.p.x - partic2.p.x;
            const v1Y = partic1.p.y - partic2.p.y;
            const v1Len = doubleSqrt((v1X * v1X) + (v1Y * v1Y));
            if (v1Len <= jRestLen) {
              const forceNum1 = jSprintConst * (v1Len - jRestLen);
              if (!canCoerceToFiniteDouble(forceNum1)) {
                if (!flag) {
                  Console.warn('ParticleSystem update calculateForces: NaN/Inf forces during Jasper\'s repulsion force calculation: forceNum1');
                }
                flag = true;
              }
              const v2X = partic1.v.x - partic2.v.x;
              const v2Y = partic1.v.y - partic2.v.y;
              const v1LenReciproc = 1 / v1Len;
              let v3X;
              let v3Y;
              if (!canCoerceToFiniteDouble(v1LenReciproc)) {
                v3X = 0;
                v3Y = 0;
              } else {
                v3X = v1X * v1LenReciproc;
                v3Y = v1Y * v1LenReciproc;
              }
              if (!canCoerceToFiniteDouble(v3X) || !canCoerceToFiniteDouble(v3Y)) {
                if (!flag3) {
                  Console.warn('ParticleSystem update calculateForces: NaN/Inf normalized v1', v1LenReciproc);
                }
                flag3 = true;
              }
              const forceOnPartic1X = -v3X * (forceNum1 + (jDampingConst * v2X * v3X));
              const forceOnPartic1Y = -v3Y * (forceNum1 + (jDampingConst * v2Y * v3Y));
              partic1.f.x += forceOnPartic1X;
              partic1.f.y += forceOnPartic1Y;
              partic2.f.x -= forceOnPartic1X;
              partic2.f.y -= forceOnPartic1Y;
            }
          }
        }
      }
    }
  }

  synchronizeStructureParticlesWithNodes () {
    const { nodes } = this._trafficGraph;
    const particleFromNodeName = this._particleFromNodeName;
    const particleFromNodeNameKeys = keys(particleFromNodeName);
    const particleRecycleList = [];
    for (const nodeName of particleFromNodeNameKeys) {
      if (!hasOwnPropFunc.call(nodes, nodeName)) {
        particleRecycleList.push(particleFromNodeName[nodeName]);
        delete particleFromNodeName[nodeName];
      }
    }
    const nodesKeys = keys(nodes);
    for (const nodeName of nodesKeys) {
      const node = nodes[nodeName];
      if (!hasOwnPropFunc.call(particleFromNodeName, nodeName)) {
        let particle = particleRecycleList.pop();
        if (particle === undefined) {
          particle = new Particle();
          particleFromNodeName[nodeName] = particle;
        }
        particle.trafficGraphNode = node;
        particle.mass = this._particles_mass;
      }
    }
  }

  synchronizeStructureHooksSpringsWithConnections () {
    const particleFromNodeName = this._particleFromNodeName;
    const { connections } = this._trafficGraph;
    const hooksSpringList = this._hooksSprings;
    let i = 0;
    const oldCount = hooksSpringList.length;
    // const oneOverMaxVolume = 1 / this._trafficGraph.volume.max;
    each(connections, (conn) => {
      const srcNodeName = conn.source.name;
      if (!hasOwnPropFunc.call(particleFromNodeName, srcNodeName)) {
        return;
      }
      const dstNodeName = conn.target.name;
      if (!hasOwnPropFunc.call(particleFromNodeName, dstNodeName)) {
        return;
      }
      const fromParticle = particleFromNodeName[conn.source.name];
      const toParticle = particleFromNodeName[conn.target.name];
      let hooksSpring;
      if (i < oldCount) {
        hooksSpring = hooksSpringList[i];
        hooksSpring.fromParticle = fromParticle;
        hooksSpring.toParticle = toParticle;
      } else {
        hooksSpring = new HooksSpring(
          fromParticle,
          toParticle,
          this._hooksSprings_springConstant,
          this._hooksSprings_dampingConstant,
          this._hooksSprings_restLength
        );
        hooksSpringList[i] = hooksSpring;
      }
      // const connVolume = conn.volume;
      // let connVolumeNum = 0;
      // for (let volumeCat in connVolume) {
      //   if (!hasOwnPropFunc.call(connVolume, volumeCat)) break;
      //   connVolumeNum += connVolume[volumeCat];
      // }
      // const connVolumeDensity = connVolumeNum * oneOverMaxVolume;
      // hooksSpring.springConstant = 0.05 + connVolumeDensity;
      i += 1;
    });
    hooksSpringList.length = i;
  }

  synchronizeStructure () {
    this.synchronizeStructureParticlesWithNodes();
    this.synchronizeStructureHooksSpringsWithConnections();
  }

  onTrafficGraphChanged () {
    try {
      this.synchronizeStructure();
    } catch (e) {
      Console.error('ParticleSystem synchronizeStructure, got error:', e);
    }
  }
}

export default ParticleSystem;
