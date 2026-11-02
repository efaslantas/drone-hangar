import {groundHeight} from './airframe-contact.js';
import {aerodynamicForce} from './aerodynamics.js';
import {surfaceAt} from './geo-terrain.js';
import { packSoc, solveBattery, integrateBattery } from './battery-model.js';
import { createRateController, rateController, rateSetpoint, allocateRotorForces, rotorWrench, integrateAngularVelocity } from "./rigid-body.js";
import { sampleReference, sampleReferenceAtVoltage, freshBatteryMetrics, throttleForForce, STANDARD_GRAVITY, REFERENCE_PROFILES } from "./propulsion-reference.js";
import { applyWorld } from "./collide.js";

const G = STANDARD_GRAVITY;
const IDLE_THROTTLE = 0.035;

export function createState(x = 0, y = 0.12, z = 0) {
  return {
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    qw: 1,
    qx: 0,
    qy: 0,
    qz: 0,
    armed: false,
    crashed: false,
    throttleOut: 0,
    motor: 0,
    rotorThrottle: null,
    rateController: null,
    sag: 1,
    gustX: 0,
    gustZ: 0,
    battery: 1,
    crashReason: "",
    wx: 0,
    wy: 0,
    wz: 0,
    altHold: null,
    grounded: y <= 0.2,
    groundedFor: y <= 0.2 ? 1 : 0,
    lastTouchdown: null,
  };
}

function qmul(aw, ax, ay, az, bw, bx, by, bz) {
  return [
    aw * bw - ax * bx - ay * by - az * bz,
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
  ];
}

function qnorm(w, x, y, z) {
  const n = Math.hypot(w, x, y, z) || 1;
  return [w / n, x / n, y / n, z / n];
}

export function rotateVec(qw, qx, qy, qz, vx, vy, vz) {
  const [iw, ix, iy, iz] = qmul(qw, qx, qy, qz, 0, vx, vy, vz);
  const [, rx, ry, rz] = qmul(iw, ix, iy, iz, qw, -qx, -qy, -qz);
  return [rx, ry, rz];
}

export function qFromYPR(yaw, pitch, roll) {
  const yw = Math.cos(yaw * 0.5);
  const yy = Math.sin(yaw * 0.5);
  const pw = Math.cos(pitch * 0.5);
  const px = Math.sin(pitch * 0.5);
  const rw = Math.cos(roll * 0.5);
  const rz = Math.sin(roll * 0.5);
  const [iw, ix, iy, iz] = qmul(yw, 0, yy, 0, pw, px, 0, 0);
  return qmul(iw, ix, iy, iz, rw, 0, 0, rz);
}

export function yawFromQ(qw, qx, qy, qz) {
  return Math.atan2(2 * (qw * qy + qx * qz), 1 - 2 * (qx * qx + qy * qy));
}

export function yawErrTo(state, x, z) {
  const yaw = yawFromQ(state.qw, state.qx, state.qy, state.qz);
  const bear = Math.atan2(x - state.x, -(z - state.z));
  let err = bear - yaw;
  while (err > Math.PI) err -= Math.PI * 2;
  while (err < -Math.PI) err += Math.PI * 2;
  return err;
}

export function eulerYXZ(qw, qx, qy, qz) {
  const [ux, uy, uz] = rotateVec(qw, qx, qy, qz, 0, 1, 0);
  const [fx, fy, fz] = rotateVec(qw, qx, qy, qz, 0, 0, -1);
  const pitch = Math.asin(Math.max(-1, Math.min(1, -fy)));
  const roll = Math.atan2(ux, uy);
  const yaw = Math.atan2(fx, fz);
  void uz;
  return { roll, pitch, yaw };
}

function qslerp(aw, ax, ay, az, bw, bx, by, bz, t) {
  let dot = aw * bw + ax * bx + ay * by + az * bz;
  if (dot < 0) {
    bw = -bw;
    bx = -bx;
    by = -by;
    bz = -bz;
    dot = -dot;
  }
  if (dot > 0.9995) {
    return qnorm(aw + (bw - aw) * t, ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
  }
  const th = Math.acos(Math.min(1, dot));
  const s = Math.sin(th) || 1;
  const w1 = Math.sin((1 - t) * th) / s;
  const w2 = Math.sin(t * th) / s;
  return qnorm(aw * w1 + bw * w2, ax * w1 + bx * w2, ay * w1 + by * w2, az * w1 + bz * w2);
}

function applyBodyRates(s, ox, oy, oz, dt) {
  const hx = ox * dt * 0.5;
  const hy = oy * dt * 0.5;
  const hz = oz * dt * 0.5;
  const [nw, nx, ny, nz] = qmul(s.qw, s.qx, s.qy, s.qz, 0, hx, hy, hz);
  const [w, x, y, z] = qnorm(s.qw + nw, s.qx + nx, s.qy + ny, s.qz + nz);
  s.qw = w;
  s.qx = x;
  s.qy = y;
  s.qz = z;
}

function advanceReferenceRotors(state,spec,input,throttle,dt) {
  const p=spec.dynamics,profile=spec.propulsion.profile;
  const setup=spec.propulsion, rint=setup.battery?.mode==='rint';
  const j=[p.inertiaX,p.inertiaY,p.inertiaZ];
  if(!state.rotorThrottle)state.rotorThrottle=Array(4).fill(state.motor||0);
  if(!state.rateController)state.rateController=createRateController([state.wx,state.wy,state.wz]);
  const targets=[-rateSetpoint(input.pitch,spec.maxRate,p),-rateSetpoint(input.yaw,spec.yawRate,p),-rateSetpoint(input.roll,spec.maxRate,p)];
  const count=Math.max(1,Math.ceil(dt*240-1e-10)),h=dt/count;
  let totalForce=0,totalCurrent=0;
  const worldForce=[0,0,0];
  for(let n=0;n<count;n++) {
    const powered=state.armed&&state.battery>0&&!state.packCutoff;
    const idle=powered?IDLE_THROTTLE:0;
    const predicted=rint?solveBattery(setup.battery,REFERENCE_PROFILES[profile].cells,packSoc(setup,state.battery),state.rotorThrottle.map(t=>sampleReference(profile,t)),setup.electronicsA,powered):null;
    const voltage=predicted?.terminalV;
    const sample=t=>rint?sampleReferenceAtVoltage(profile,t,voltage):sampleReference(profile,t);
    const minForce=sample(idle).thrustN;
    const maxForce=Math.max(...REFERENCE_PROFILES[profile].points.map(row=>sample((row[0]-1000)/1000).thrustN));
    const collective=powered?4*sample(Math.max(idle,throttle)).thrustN:0;
    const rates=[state.wx,state.wy,state.wz];
    const torque=rateController(state.rateController,rates,targets,p,h,powered);
    const allocation=powered?allocateRotorForces(collective,torque,p,minForce,maxForce):{forces:[0,0,0,0],saturated:false};
    state.rateController.saturated=allocation.saturated;
    let outputs=allocation.forces.map((force,i)=>{
      const target=powered?(throttleForForce(profile,force,voltage)??1):0;
      state.rotorThrottle[i]+=(target-state.rotorThrottle[i])*(1-Math.exp(-h/(p.motorTauMs/1000)));
      return sampleReference(profile,state.rotorThrottle[i]);
    });
    if(rint) {
      const power=solveBattery(setup.battery,REFERENCE_PROFILES[profile].cells,packSoc(setup,state.battery),outputs,setup.electronicsA,powered);
      outputs=power.rotors;
      integrateBattery(state,setup,power,h);
      totalCurrent+=power.currentA/count;
    }
    const wrench=rotorWrench(outputs.map(o=>o.thrustN),p);
    const applied=wrench.torqueNm.map((value,i)=>value-p.angularDamping*rates[i]);
    const next=integrateAngularVelocity(rates,applied,j,h);
    [state.wx,state.wy,state.wz]=next;
    applyBodyRates(state,...next,h);
    const direction=rotateVec(state.qw,state.qx,state.qy,state.qz,0,1,0);
    for(let i=0;i<3;i++)worldForce[i]+=direction[i]*wrench.forceN/count;
    totalForce+=wrench.forceN/count;
    if(!rint)totalCurrent+=powered?outputs.reduce((sum,o)=>sum+o.currentA,0)/count:0;
  }
  state.motor=state.rotorThrottle.reduce((sum,v)=>sum+v,0)/4;
  return {thrustN:totalForce/4,currentA:totalCurrent/4,packCurrentA:rint?totalCurrent:null,worldForce};
}

export function hoverThrottle(spec) {
  return spec.propulsion?.battery?.mode==='rint' ? spec.referenceHoverThrottle ?? 1 : spec.propulsion ? throttleForForce(spec.propulsion.profile, spec.mass * G / 4) ?? 1 : 1 / spec.maxThrustG;
}

/**
 * The same airframe with a slung parcel: less thrust-to-weight, blunter
 * handling, shorter endurance. `frac` is parcel mass as a fraction of the
 * airframe's own mass, so every catalog entry can still lift it (arcade).
 */
export function withPayload(spec, frac = 0.45) {
  const k = 1 + Math.max(0, Number(frac) || 0);
  const next = {
    ...spec,
    payload: k - 1,
    ...(spec.aerodynamics?{aerodynamics:{...spec.aerodynamics,...Object.fromEntries(['cdaX','cdaY','cdaZ'].map(key=>[key,spec.aerodynamics[key]*1.2]))}}:{}),
    maxThrustG: Math.max(1.2, spec.maxThrustG / k),
    drag: spec.drag * 1.2,
    maxRate: spec.propulsion ? spec.maxRate : spec.maxRate * 0.8,
    yawRate: spec.propulsion ? spec.yawRate : spec.yawRate * 0.85,
    maxAngle: spec.maxAngle * 0.85,
    angleKp: (spec.angleKp || 8) * 0.8,
    brakeIdle: (spec.brakeIdle ?? 1.6) * 0.8,
    endurance: (spec.endurance ?? 300) / k,
    mass: (spec.mass || 0.4) * k,
    ...(spec.dynamics ? { dynamics:{...spec.dynamics,inertiaX:spec.dynamics.inertiaX*k,inertiaY:spec.dynamics.inertiaY*k,inertiaZ:spec.dynamics.inertiaZ*k} } : {}),
  };
  if(spec.propulsion?.battery?.mode==='rint')next.referenceHoverThrottle=freshBatteryMetrics(next).hoverThrottle;
  return next;
}

export function collectiveToThrottle(lift, spec, r2 = 0) {
  if (r2 > 0.28) return clamp(r2, 0, 1);
  const h = hoverThrottle(spec);
  const l = clamp(lift, -1, 1);
  if (spec.fpv) {
    // A PS stick springs to centre while an RC transmitter throttle does not.
    // Centre therefore remains hover, but the upper half must still reach the
    // full motor range. The power curve keeps fine control around hover.
    if (l >= 0) return clamp(h + Math.pow(l, spec.throttleExpo ?? 2.2) * (1 - h), 0, 1);
    return clamp(h * (1 + l), 0, 1);
  }
  return l >= 0 ? h + l * (1 - h) : h * (1 + l);
}

function cutMotors(state,spec) {
  state.motor=0;state.throttleOut=0;state.currentA=0;
  state.rotorThrottle?.fill(0);state.rateController=null;
  if(spec?.propulsion?.battery?.mode==='rint') {
    const setup=spec.propulsion,soc=packSoc(setup,state.battery);
    const power=solveBattery(setup.battery,REFERENCE_PROFILES[setup.profile].cells,soc,[],0,false);
    state.packSoc=soc;state.packVoltageV=power.terminalV;state.packCellV=power.cellV;state.packOpenV=power.openCircuitV;state.packLowTime=0;
  }
}

export function step(state, input, spec, dt, play) {
  if (state.crashed) {cutMotors(state,spec);return state;}
  dt = Math.min(Math.max(dt, 0), 0.05);
  if(!(dt>0))return state;
  // Keep translation, attitude-dependent drag, motors and battery on the same
  // reference Acro clock; averaging a rotated force over a long frame is biased.
  const rigidReference=spec.aerodynamics&&spec.dynamics&&spec.propulsion&&!!(play?.real||input.real)&&!(input.angleMode??spec.defaultMode==='angle');
  if(rigidReference&&dt>1/240+1e-10){const count=Math.ceil(dt*240-1e-10);for(let i=0;i<count&&!state.crashed;i++)step(state,input,spec,dt/count,play);return state;}
  const rint=spec.propulsion?.battery?.mode==='rint';
  if(rint&&state.packCutoff)state.armed=false;
  const wasGrounded = !!state.grounded;
  const previousGroundedFor=state.groundedFor||0;state.worldTouchdown=null;
  state.motionStart={x:state.x,y:state.y,z:state.z};
  state.grounded = false;

  const angleMode = input.angleMode ?? spec.defaultMode === "angle";
  const realAcro = !!(play?.real || input.real) && !angleMode;
  const rigidAcro=realAcro&&!!spec.dynamics&&!!spec.propulsion;
  if(!rigidAcro){state.rotorThrottle=null;state.rateController=null;}
  const rollCmd = clamp(input.roll ?? 0, -1, 1);
  const pitchCmd = clamp(input.pitch ?? 0, -1, 1);
  const yawCmd = clamp(input.yaw ?? 0, -1, 1);
  const r2 = input.r2 || 0;
  const lift = typeof input.lift === "number" ? input.lift : 0;
  let thr =
    typeof input.lift === "number"
      ? collectiveToThrottle(lift, spec, r2)
      : clamp(input.throttle, 0, 1);

  if (!state.armed || state.battery <= 0) {
    thr = 0;
    state.altHold = null;
  }

  if (angleMode && state.armed) {
    const yaw = yawFromQ(state.qw, state.qx, state.qy, state.qz) - yawCmd * spec.yawRate * 0.65 * dt;
    const [tw, tx, ty, tz] = qFromYPR(yaw, -pitchCmd * spec.maxAngle, -rollCmd * spec.maxAngle);
    const a = 1 - Math.exp(-(spec.angleKp || 8) * dt);
    const [nw, nx, ny, nz] = qslerp(state.qw, state.qx, state.qy, state.qz, tw, tx, ty, tz, a);
    state.qw = nw;
    state.qx = nx;
    state.qy = ny;
    state.qz = nz;
    state.wx = 0;
    state.wy = 0;
    state.wz = 0;
  } else if (state.armed && !rigidAcro) {
    // Positive pitch input means nose-forward in both Angle and Acro modes.
    const tox = -pitchCmd * spec.maxRate;
    const toy = -yawCmd * spec.yawRate;
    const toz = -rollCmd * spec.maxRate;
    const mass = Math.max(spec.mass || 0.4, 0.02);
    const inertia = realAcro ? clamp(0.22 / mass, 0.35, 1.2) : 1;
    const follow = 1 - Math.exp(-(spec.rateFollow || 10) * inertia * dt);
    state.wx += (tox - state.wx) * follow;
    state.wy += (toy - state.wy) * follow;
    state.wz += (toz - state.wz) * follow;
    applyBodyRates(state, state.wx, state.wy, state.wz, dt);
  }

  let [ux, uy, uz] = rotateVec(state.qw, state.qx, state.qy, state.qz, 0, 1, 0);
  const maxAcc = spec.maxThrustG * G;

  if (typeof input.lift === "number" && angleMode && state.armed && state.battery > 0 && spec.holdAlt !== false && play?.assists?.altitude !== false) {
    const hold =
      Math.abs(lift) < 0.12 &&
      r2 <= 0.28 &&
      Math.abs(pitchCmd) < 0.12 &&
      Math.abs(rollCmd) < 0.12;
    if (hold) {
      if (state.altHold == null) state.altHold = state.y;
      const desA = (state.altHold - state.y) * 2.2 - state.vy * 3.2;
      const vert = G + desA;
      const den = Math.max(uy, 0.42);
      thr = spec.propulsion ? throttleForForce(spec.propulsion.profile, Math.max(0, vert) * spec.mass / (4 * den)) ?? 1 : clamp(vert / (den * maxAcc), 0, 1);
    } else {
      state.altHold = null;
      if (uy > 0.38 && play?.assists?.tiltComp !== false) thr = spec.propulsion ? throttleForForce(spec.propulsion.profile, sampleReference(spec.propulsion.profile, thr).thrustN / uy) ?? 1 : clamp(thr / uy, 0, 1);
    }
  } else {
    state.altHold = null;
    if (typeof input.lift === "number" && state.armed && uy > 0.38 && !realAcro && play?.assists?.tiltComp !== false) thr = spec.propulsion ? throttleForForce(spec.propulsion.profile, sampleReference(spec.propulsion.profile, thr).thrustN / uy) ?? 1 : clamp(thr / uy, 0, 1);
  }

  let rigidOutput=null;
  if(rigidAcro) {
    rigidOutput=advanceReferenceRotors(state,spec,input,thr,dt);
    [ux,uy,uz]=rotateVec(state.qw,state.qx,state.qy,state.qz,0,1,0);
  } else if (realAcro) {
    const mass = Math.max(spec.mass || 0.4, 0.02);
    const tau = clamp(0.035 + mass * 0.08, 0.04, 0.18);
    const k = 1 - Math.exp(-dt / tau);
    // Real ESCs keep the motors turning over at a low idle whenever armed
    // (Betaflight's motor_idle) rather than letting them spin down to a full
    // stop at zero stick — armed acro never free-falls with silent props.
    const target = state.armed && state.battery > 0 ? Math.max(thr, IDLE_THROTTLE) : 0;
    state.motor += (target - (state.motor || 0)) * k;
  } else {
    state.motor = thr;
  }
  const motor = state.motor || 0;
  let sag = 1;
  if (realAcro && !spec.propulsion) {
    const empty = 1 - state.battery;
    sag = clamp(1 - empty * 0.18 - motor * motor * empty * 0.42, 0.45, 1);
  }
  state.sag = sag;
  let referenceOutput = rigidOutput || (spec.propulsion ? sampleReference(spec.propulsion.profile, motor) : null);
  let scalarPower=null;
  if(rint&&!rigidOutput) {
    scalarPower=solveBattery(spec.propulsion.battery,REFERENCE_PROFILES[spec.propulsion.profile].cells,packSoc(spec.propulsion,state.battery),Array(4).fill(referenceOutput),spec.propulsion.electronicsA,state.armed&&state.battery>0&&!state.packCutoff);
    referenceOutput=scalarPower.rotors[0];
    integrateBattery(state,spec.propulsion,scalarPower,dt);
  }
  const thrustAcc = referenceOutput ? 4 * referenceOutput.thrustN / spec.mass : motor * maxAcc * sag;
  state.currentA = state.armed && state.battery > 0 && referenceOutput ? 4 * referenceOutput.currentA + spec.propulsion.electronicsA : 0;
  if(rint)state.currentA=state.packCutoff?0:(rigidOutput?.packCurrentA??scalarPower.currentA);
  const wind = play?.wind;
  if (realAcro && state.armed) {
    // A bounded random walk represents gust velocity. Fixed simulation steps
    // keep its character independent of the monitor refresh rate.
    const gustMax = 0.3 + (wind ? 1.2 : 0);
    const gustJerk = 5;
    state.gustX = clamp((state.gustX || 0) + (Math.random() - 0.5) * gustJerk * dt, -gustMax, gustMax);
    state.gustZ = clamp((state.gustZ || 0) + (Math.random() - 0.5) * gustJerk * dt, -gustMax, gustMax);
  } else {
    state.gustX = 0;
    state.gustZ = 0;
  }
  const windX = state.armed || spec.aerodynamics ? (wind?.x || 0) + state.gustX : 0;
  const windZ = state.armed || spec.aerodynamics ? (wind?.z || 0) + state.gustZ : 0;
  const airVx = state.vx - windX;
  const airVz = state.vz - windZ;
  const spd = Math.hypot(airVx, state.vy, airVz);
  const damp = spec.aerodynamics ? 0 : spec.drag * (1 + 0.035 * spd);
  const dragForce=spec.aerodynamics?aerodynamicForce([airVx,state.vy-(wind?.y||0),airVz],[state.qw,state.qx,state.qy,state.qz],spec.aerodynamics):[0,0,0];
  const ax = (rigidOutput ? rigidOutput.worldForce[0]/spec.mass : ux * thrustAcc) - airVx * damp + dragForce[0]/spec.mass;
  let ay = (rigidOutput ? rigidOutput.worldForce[1]/spec.mass : uy * thrustAcc) - state.vy * damp - G + dragForce[1]/spec.mass;
  const az = (rigidOutput ? rigidOutput.worldForce[2]/spec.mass : uz * thrustAcc) - airVz * damp + dragForce[2]/spec.mass;
  state.vx += ax * dt;
  state.vy += ay * dt;
  state.vz += az * dt;
  state.x += state.vx * dt;
  state.y += state.vy * dt;
  state.z += state.vz * dt;

  if (angleMode && state.armed && play?.assists?.brake !== false) {
    const idle = Math.abs(pitchCmd) < 0.05 && Math.abs(rollCmd) < 0.05;
    const brake = idle ? spec.brakeIdle ?? 1.6 : spec.brakeMove ?? 0.22;
    const k = Math.exp(-brake * dt);
    state.vx *= k;
    state.vz *= k;
  }

  state.throttleOut = motor;
  if (!rint && state.armed && (motor > 0.02 || spec.propulsion)) {
    const drain = play?.drain ?? 1;
    // Draw is relative to the airframe's own hover point, so a 7" loafing at a
    // tenth of its thrust outlasts a racer punching at the same stick position.
    const load = motor / Math.max(hoverThrottle(spec), 0.05);
    const draw = 0.25 + 0.75 * Math.min(load, 4) ** 1.35;
    const consumption = spec.propulsion
      ? state.currentA * dt / (spec.propulsion.capacityMah * spec.propulsion.usableFraction / 1000 * 3600)
      : (dt / (spec.endurance ?? 300)) * draw;
    state.battery = Math.max(0, state.battery - consumption * (spec.propulsion ? 1 : drain));
  }

  const ground=groundHeight(spec,state,surfaceAt(play,state.x,state.z));
  if (!play?.terrain && state.y < ground) {
    const impact = -state.vy;
    const horizontalSpeed = Math.hypot(state.vx, state.vz);
    state.y = ground;
    state.vy = 0;
    state.vx *= 0.45;
    state.vz *= 0.45;
    state.grounded = true;
    state.groundedFor = (wasGrounded ? state.groundedFor || 0 : 0) + dt;
    if (!wasGrounded) {
      state.lastTouchdown = {
        verticalSpeed: Math.max(0, impact),
        horizontalSpeed,
      };
    }
    if (state.altHold != null) state.altHold = Math.max(state.altHold, ground);
    if (state.armed && impact > 9) {
      state.crashed = true;
      state.crashReason = "sert iniş";
      state.armed = false;
      state.vx = 0;
      state.vz = 0;
      state.altHold = null;
    }
  } else {
    state.groundedFor = 0;
  }

  const cap = play?.ceil ?? 80;
  if (state.y > cap) {
    state.crashed = true;
    state.crashReason = "irtifa limiti";
    state.armed = false;
    state.altHold = null;
    state.vx = 0;
    state.vy = 0;
    state.vz = 0;
  }

  applyWorld(state, spec, play);
  if(state.worldTouchdown&&!state.crashed){state.groundedFor=(wasGrounded?previousGroundedFor:0)+dt;if(!wasGrounded)state.lastTouchdown=state.worldTouchdown;}
  if(state.crashed)cutMotors(state,spec);

  if (state.battery <= 0 && state.grounded) {
    state.armed = false;
    state.altHold = null;
  }

  return state;
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
