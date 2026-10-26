/** One reversible score shared by glyphs and the HTML story, independent of scroll velocity. */
export const WORLD_TIMELINE={
  portrait:[.025,.30],
  bend:[.025,.60],
  land:[.46,.80],
  route:[.80,.98],
  signature:[.38,.72],
  story:[.78,.97],
} as const;

export function worldStage(progress:number,start:number,end:number) {
  const t=Math.max(0,Math.min(1,(progress-start)/(end-start)));
  return t*t*t*(t*(t*6-15)+10);
}

/** A single framing path is shared by surface, glyphs, thread and city anchors.
 * Large near-field ribbons become a smaller, offset planet without a scene cut. */
export function worldFraming(width:number,height:number,progress:number) {
  const mobile=width<700;
  const pullback=worldStage(progress,.13,.84);
  const drift=worldStage(progress,.17,.82);
  const radius=mobile
    ?Math.max(52,Math.min((height-(height<=720?330:380))*.44,width*.415))
    :Math.min(height*.37,width*.285,width*.30-18);
  const nearRadius=mobile?Math.max(width*.78,height*.65):Math.min(width*.74,height*.93);
  return {
    x:width*(mobile?.5:.51+drift*.18),
    y:height*(mobile?.61-drift*.12:.64-drift*.15),
    radius:nearRadius+(radius-nearRadius)*pullback,
  };
}

/** Preserve the original rain column and row ordering on spherical meridians. */
export function worldRibbonPoint(column:number,row:number):readonly [number,number,number] {
  const longitude=(column-.5)*Math.PI*2+58*Math.PI/180;
  const latitude=(.5-row)*Math.PI;
  return [Math.cos(latitude)*Math.sin(longitude),Math.sin(latitude),Math.cos(latitude)*Math.cos(longitude)];
}

export function worldStages(progress:number) {
  return {
    portrait:worldStage(progress,...WORLD_TIMELINE.portrait),
    bend:worldStage(progress,...WORLD_TIMELINE.bend),
    land:worldStage(progress,...WORLD_TIMELINE.land),
    route:worldStage(progress,...WORLD_TIMELINE.route),
    signature:worldStage(progress,...WORLD_TIMELINE.signature),
    story:worldStage(progress,...WORLD_TIMELINE.story),
  };
}

const number=(value:number)=>value.toFixed(5);
export const worldStageGLSL=`
float worldStage(float p,float a,float b){float t=clamp((p-a)/(b-a),0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
const vec2 WORLD_PORTRAIT=vec2(${WORLD_TIMELINE.portrait.map(number).join(",")});
const vec2 WORLD_BEND=vec2(${WORLD_TIMELINE.bend.map(number).join(",")});
const vec2 WORLD_LAND=vec2(${WORLD_TIMELINE.land.map(number).join(",")});
`;
