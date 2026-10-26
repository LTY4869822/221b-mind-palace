import coastlines from "./data/coastlines.json" with {type:"json"};
import {greatCircle} from "./atlas-math.ts";
import {pairFlowPoints} from "./opening-flow.ts";

type LonLat=readonly [number,number];
type Vector=readonly [number,number,number];
type Ring={points:LonLat[];minX:number;maxX:number;minY:number;maxY:number};
type Segment={from:Vector;to:Vector;length:number;end:number};
const RAD=Math.PI/180,TAU=Math.PI*2;
const fraction=(value:number)=>value-Math.floor(value);
const rawRings=coastlines as number[][][];

/** East, north, Greenwich. This unit space is shared by glyphs, lines and city pins. */
export function unitGlobePoint(longitude:number,latitude:number):Vector {
  const phi=latitude*RAD,lambda=longitude*RAD,c=Math.cos(phi);
  return [c*Math.sin(lambda),Math.sin(phi),c*Math.cos(lambda)];
}

// Unwrap each polygon once. This preserves land on both sides of the date line.
const rings:Ring[]=rawRings.map(source=>{
  let previous=source[0][0];
  const points:LonLat[]=source.map(([lon,lat])=>{
    let x=lon;
    while(x-previous>180)x-=360;
    while(x-previous< -180)x+=360;
    previous=x;
    return [x,lat];
  });
  return {
    points,minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),
    minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1])),
  };
});

function insideLand(longitude:number,latitude:number) {
  for(const ring of rings){
    if(latitude<ring.minY||latitude>ring.maxY)continue;
    const center=(ring.minX+ring.maxX)/2;
    const x=longitude+Math.round((center-longitude)/360)*360;
    if(x<ring.minX||x>ring.maxX)continue;
    let inside=false;
    for(let i=0,j=ring.points.length-1;i<ring.points.length;j=i++){
      const a=ring.points[i],b=ring.points[j];
      if((a[1]>latitude)!==(b[1]>latitude)&&x<(b[0]-a[0])*(latitude-a[1])/(b[1]-a[1])+a[0])inside=!inside;
    }
    if(inside)return true;
  }
  return false;
}

const segments:Segment[]=[];
let coastLength=0;
for(const ring of rawRings){
  for(let i=1;i<ring.length;i++){
    const from=unitGlobePoint(ring[i-1][0],ring[i-1][1]),to=unitGlobePoint(ring[i][0],ring[i][1]);
    const length=Math.acos(Math.max(-1,Math.min(1,from.reduce((sum,n,j)=>sum+n*to[j],0))));
    if(length<1e-9)continue;
    coastLength+=length;segments.push({from,to,length,end:coastLength});
  }
}

let inland:Vector[]|undefined,ocean:Vector[]|undefined;
function sampleSurface() {
  if(inland&&ocean)return {inland,ocean};
  inland=[];ocean=[];
  // Equal area Fibonacci samples avoid polar crowding and are reused on resize.
  const total=32768,golden=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<total;i++){
    const latitude=Math.asin(1-2*(i+.5)/total)/RAD;
    const longitude=fraction(i*golden/TAU)*360-180;
    (insideLand(longitude,latitude)?inland:ocean).push(unitGlobePoint(longitude,latitude));
  }
  return {inland,ocean};
}

function sampleCoast(phase:number):Vector {
  const distance=fraction(phase)*coastLength;
  let low=0,high=segments.length-1;
  while(low<high){const mid=(low+high)>>>1;if(segments[mid].end<distance)low=mid+1;else high=mid;}
  const segment=segments[low],t=(distance-(segment.end-segment.length))/segment.length;
  const a=Math.sin((1-t)*segment.length)/Math.sin(segment.length),b=Math.sin(t*segment.length)/Math.sin(segment.length);
  return [segment.from[0]*a+segment.to[0]*b,segment.from[1]*a+segment.to[1]*b,segment.from[2]*a+segment.to[2]*b];
}

/** One stable target per original rain glyph; w controls final land/coast brightness. */
export function buildOpeningGlobeTargets(count:number):Float32Array {
  if(!Number.isSafeInteger(count)||count<0)throw new RangeError("Globe glyph count must be a nonnegative integer");
  const result=new Float32Array(count*4);
  if(count===0)return result;
  const pools=sampleSurface();
  for(let i=0;i<count;i++){
    // Every ten adjacent rain ids contain all three regions, without ordered bands.
    const category=(i*7)%10,phase=fraction((i+.5)*.618033988749895);
    let point:Vector,weight:number;
    if(category<7){
      point=pools.inland[Math.min(pools.inland.length-1,Math.floor(phase*pools.inland.length))];
      weight=.9+fraction(i*.754877666246693)*.1;
    }else if(category<9){point=sampleCoast(phase);weight=1.2;}
    else{point=pools.ocean[Math.min(pools.ocean.length-1,Math.floor(phase*pools.ocean.length))];weight=.14;}
    const offset=i*4;
    result[offset]=point[0];result[offset+1]=point[1];result[offset+2]=point[2];result[offset+3]=weight;
  }
  return result;
}

const shellCache=new Map<number,Float32Array>();
/** Uniform intermediate shell, indexed by the matching final geographic target.
 * Each Fibonacci sample is used once. Spatial pairing keeps the later continental
 * development local instead of sending adjacent glyphs across opposite hemispheres.
 * Callers treat the bounded cached arrays as read-only geometry source data. */
export function buildOpeningGlobeShellTargets(count:number):Float32Array {
  if(!Number.isSafeInteger(count)||count<0)throw new RangeError("Globe glyph count must be a nonnegative integer");
  const cached=shellCache.get(count);
  if(cached)return cached;
  const result=new Float32Array(count*3);
  if(count>0){
    const destinations=buildOpeningGlobeTargets(count),golden=Math.PI*(3-Math.sqrt(5));
    // Cut the longitude chart over the Pacific, keeping London and Tokyo nearby.
    const chart=(point:Vector,index:number)=>{
      const longitude=Math.atan2(point[0],point[2])-58*RAD;
      return {x:Math.atan2(Math.sin(longitude),Math.cos(longitude)),y:Math.asin(Math.max(-1,Math.min(1,point[1]))),index,point};
    };
    const uniform=Array.from({length:count},(_,i)=>{
      const north=1-2*(i+.5)/count,radius=Math.sqrt(Math.max(0,1-north*north)),angle=i*golden;
      return chart([radius*Math.sin(angle),north,radius*Math.cos(angle)],i);
    });
    const land=Array.from({length:count},(_,i)=>chart([destinations[i*4],destinations[i*4+1],destinations[i*4+2]],i));
    for(const [sample,target] of pairFlowPoints(uniform,land))result.set(sample.point,target.index*3);
  }
  if(shellCache.size>=4)shellCache.delete(shellCache.keys().next().value!);
  shellCache.set(count,result);
  return result;
}

let coastPairs:Float32Array|undefined;
/** Coastline line-segment pairs, including both date-line sides without a screen seam. */
export function openingGlobeCoastlines():Float32Array {
  if(!coastPairs){
    coastPairs=new Float32Array(segments.length*6);
    for(let i=0;i<segments.length;i++)coastPairs.set([...segments[i].from,...segments[i].to],i*6);
  }
  return coastPairs;
}

let storyRoute:Float32Array|undefined;
/** A slightly elevated London–Tokyo arc; endpoints and all reveal samples stay stable. */
export function buildOpeningGlobeRoute():Float32Array {
  if(!storyRoute){
    const samples=greatCircle([-.13,51.51],[139.69,35.69],110).map((point,i)=>{
      const radius=1.028+Math.sin(i/110*Math.PI)*.055;
      const unit=unitGlobePoint(...point);
      return [unit[0]*radius,unit[1]*radius,unit[2]*radius] as const;
    });
    storyRoute=new Float32Array((samples.length-1)*6);
    for(let i=1;i<samples.length;i++)storyRoute.set([...samples[i-1],...samples[i]],(i-1)*6);
  }
  return storyRoute;
}
