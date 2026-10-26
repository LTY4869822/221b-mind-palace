/* The existing V5 character rig supplies the UV joints and eye regions.
   Here their weights bind glyphs instead of textured triangles. */
type Point = readonly [number, number];
export const OPENING_EXIT_MS = 960;
export const OPENING_FORMATION_SECONDS = 2.4;
export const FORMATION_RAMP = .12;
export const clamp = (value: number, low = 0, high = 1) => Math.max(low, Math.min(high, value));
export function smooth(value: number, low: number, high: number) {
  const x = clamp((value - low) / (high - low));
  return x * x * (3 - 2 * x);
}

const conanArm: Point[] = [[.645,.236],[.717,.216],[.76,.25],[.765,.292],[.785,.32],[.793,.381],[.761,.438],[.711,.424],[.674,.371],[.655,.312]];
const holmesHand: Point[] = [[.28,.338],[.433,.294],[.51,.258],[.55,.28],[.535,.338],[.445,.383],[.37,.435],[.264,.451],[.244,.401]];
function polygonWeight(x: number, y: number, polygon: readonly Point[]) {
  let inside = false, distance = 1;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy));
    distance = Math.min(distance, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
  }
  return smooth(inside ? distance : -distance, -.014, .014);
}

export function portraitBinding(u: number, v: number, kind: number): [number, number, number, number] {
  if (kind === 3) {
    const arm = polygonWeight(u, v, conanArm) * .98;
    const wrist = arm * (1 - smooth(v, .305, .355)) * .72;
    const head = (1 - arm) * (1 - smooth(Math.hypot((u - .51) / .31, (v - .165) / .166), .86, 1.04)) * .7;
    return [arm, wrist, head, 0];
  }
  const hand = polygonWeight(u, v, holmesHand) * .9;
  const head = (1 - hand) * (1 - smooth(Math.hypot((u - .5) / .22, (v - .14) / .17), .82, 1.08));
  const lower = smooth(v, .29, .78);
  const edge = Math.max(1 - smooth(u, .28, .415), smooth(u, .69, .81));
  const handProtect = 1 - smooth(u, .54, .58) * (1 - smooth(u, .69, .73)) * smooth(v, .47, .52) * (1 - smooth(v, .79, .83));
  return [hand, 0, head, edge * lower * handProtect * (1 - hand)];
}

export function conanEyeMask(u: number, v: number) {
  return Math.max(
    1 - smooth(Math.hypot((u - .462) / .068, (v - .214) / .041), .84, 1),
    1 - smooth(Math.hypot((u - .593) / .051, (v - .237) / .034), .84, 1),
  );
}

export function performanceAt(time: number, still = false) {
  const t = still ? 0 : Math.max(0, time - 2.6);
  const phase = t % 6.8;
  const raised = smooth(phase, .8, 1.85) * (1 - smooth(phase, 2.5, 3.4));
  const push = smooth(phase, 1.87, 2.09) * (1 - smooth(phase, 2.23, 2.5));
  const blink = smooth(phase, 1.94, 2.035) * (1 - smooth(phase, 2.085, 2.23)) + smooth(phase, 5.25, 5.32) * (1 - smooth(phase, 5.36, 5.49));
  return {
    elbow: .28 - raised * .31 - push * .018,
    wrist: -.04 + raised * .10 + push * .025,
    head: raised * .018,
    blink,
    gaze: Math.sin(t * Math.PI / 4.4) * .024,
    inspection: smooth(t % 8.8, .6, 2.4) * (1 - smooth(t % 8.8, 3, 4.5)) * -.055,
    capeLeft: Math.sin(t * Math.PI / 5) * .032,
    capeRight: Math.sin(t * Math.PI / 5 + 1.4) * .042,
    hemLeft: Math.sin(t * Math.PI / 5 + .6) * .066,
    hemRight: Math.sin(t * Math.PI / 5 + 2.3) * .08,
  };
}

// Overlap the last rain glyphs with the character's first thought. The integral
// keeps this handoff on the same beat at different frame rates and after a gap.
export const CONAN_HANDOFF = [.70,.94] as const;
function conanGateIntegral(progress:number) {
  const [start,end]=CONAN_HANDOFF;
  if(progress<=start)return 0;
  if(progress>=end)return progress-end+(end-start)*.5;
  const x=(progress-start)/(end-start);
  return (end-start)*(x*x*x-.5*x*x*x*x);
}

export function advanceConanTime(time:number,previousTravel:number,nextTravel:number,delta:number) {
  const previous=clamp(previousTravel),next=clamp(nextTravel);
  if(next===0)return 0;
  const distance=next-previous;
  const rate=Math.abs(distance)>1e-8
    ?(conanGateIntegral(next)-conanGateIntegral(previous))/distance
    :smooth(next,...CONAN_HANDOFF);
  return time+Math.max(0,delta)*clamp(rate);
}

/** Start at the neutral onset of the arm action, rather than another warm-up.
 * One clock spans arrival, blink, glasses push, follow-through and the idle loop. */
export function conanPerformanceAt(time:number,still=false) {
  const pose=performanceAt(time+3.4,still);
  if(still)return pose;
  const phase=(Math.max(0,time)+.8)%6.8;
  pose.blink=smooth(phase,1.20,1.29)*(1-smooth(phase,1.35,1.51))
    +smooth(phase,5.25,5.32)*(1-smooth(phase,5.36,5.49));
  return pose;
}

export type ScatterSpring = { value: number; velocity: number; target: number };
export const createScatterSpring = (): ScatterSpring => ({ value: 0, velocity: 0, target: 0 });

export type FormationTween = ScatterSpring & {
  from: number; initialVelocity: number; elapsed: number; duration: number;
};
export const createFormationTween = (): FormationTween => ({
  value:0,velocity:0,target:0,from:0,initialVelocity:0,elapsed:0,duration:0,
});

/** Keep position and velocity on retarget, with a short brake when reversing. */
export function retargetFormation(tween:FormationTween,target:0|1) {
  if(tween.target===target)return;
  tween.from=tween.value;
  tween.initialVelocity=tween.velocity;
  tween.target=target;
  tween.elapsed=0;
  const distance=Math.abs(target-tween.value),speed=Math.abs(tween.velocity);
  tween.duration=Math.max(.32,OPENING_FORMATION_SECONDS*Math.sqrt(distance));
  if(tween.velocity*(target-tween.value)<0 && speed>1e-6) {
    // Analytic bound on the old-direction portion of the Hermite segment.
    const brake=.10;
    const limit=(3*brake+Math.sqrt(9*brake*brake+24*brake*distance/speed))/2;
    // Repeated quick toggles can leave more velocity than the old endpoint has
    // room for. Bound its overshoot before it happens, rather than clamp and wait.
    const margin=tween.velocity>0?1-tween.value:tween.value;
    const boundaryLimit=Math.sqrt(12*distance*margin*.9)/speed;
    tween.duration=Math.min(tween.duration,limit,boundaryLimit);
  }
}

export function stepFormation(tween:FormationTween,delta:number) {
  if(tween.value===tween.target && tween.velocity===0)return tween.value;
  tween.elapsed=Math.min(tween.duration,tween.elapsed+Math.max(0,delta));
  if(tween.elapsed>=tween.duration) {
    tween.value=tween.target;tween.velocity=0;
    return tween.value;
  }
  const s=tween.elapsed/tween.duration,s2=s*s,s3=s2*s;
  const tangent=tween.initialVelocity*tween.duration;
  const value=(2*s3-3*s2+1)*tween.from+(s3-2*s2+s)*tangent+(-2*s3+3*s2)*tween.target;
  tween.value=clamp(value);
  tween.velocity=value<=0||value>=1?0:((6*s2-6*s)*tween.from+(3*s2-4*s+1)*tangent+(-6*s2+6*s)*tween.target)/tween.duration;
  return tween.value;
}

/** Undo the controller's endpoint easing before each glyph applies its own easing.
 * Otherwise two nested eases stall the departure and rush the middle of the flight. */
export function formationTravel(value:number) {
  if(value<=0 || value>=1)return clamp(value);
  return .5-Math.sin(Math.asin(1-2*value)/3);
}

/** Integrate a smooth velocity ramp around a steady cruise. C2 at every join;
 * no long quintic departure or fast middle followed by an extended landing. */
export function formationFlight(value:number) {
  const t=clamp(value),edge=FORMATION_RAMP;
  if(t<edge) {
    const x=t/edge;
    return edge*(x*x*x-.5*x*x*x*x)/(1-edge);
  }
  if(t>1-edge) {
    const x=(1-t)/edge;
    return 1-edge*(x*x*x-.5*x*x*x*x)/(1-edge);
  }
  return (t-edge*.5)/(1-edge);
}

export const formationFlightGLSL=`
float formationFlight(float value){
  float t=clamp(value,0.,1.);
  const float edge=${FORMATION_RAMP.toFixed(5)};
  if(t<edge){float x=t/edge;return edge*(x*x*x-.5*x*x*x*x)/(1.-edge);}
  if(t>1.-edge){float x=(1.-t)/edge;return 1.-edge*(x*x*x-.5*x*x*x*x)/(1.-edge);}
  return (t-edge*.5)/(1.-edge);
}
`;

/** Exact critically damped spring: fast scatter, slower reconstruction, stable across frame gaps. */
export function stepScatter(spring: ScatterSpring, delta: number, attack = 16, release = 10) {
  const omega = spring.target > spring.value ? attack : release;
  const dt = Math.min(1,Math.max(0,delta));
  const displacement = spring.value-spring.target;
  const tangent = spring.velocity+omega*displacement;
  const decay = Math.exp(-omega*dt);
  spring.value = spring.target+(displacement+tangent*dt)*decay;
  spring.velocity = (spring.velocity-omega*tangent*dt)*decay;
  if (Math.abs(spring.value - spring.target) < .0002 && Math.abs(spring.velocity) < .001) {
    spring.value = spring.target;
    spring.velocity = 0;
  }
  return clamp(spring.value);
}
