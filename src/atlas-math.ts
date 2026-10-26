export type AtlasPoint = readonly [number,number];
const rad=Math.PI/180;
export const wrapLongitude=(value:number)=>((value+180)%360+360)%360-180;

export function projectAtlas(point:AtlasPoint,longitude:number,latitude:number) {
  const phi=point[1]*rad,lambda=(point[0]-longitude)*rad,tilt=latitude*rad;
  const c=Math.cos(phi),s=Math.sin(phi),cl=Math.cos(lambda);
  return {x:c*Math.sin(lambda),y:s*Math.cos(tilt)-c*cl*Math.sin(tilt),z:s*Math.sin(tilt)+c*cl*Math.cos(tilt)};
}

export function unprojectAtlas(x:number,y:number,longitude:number,latitude:number):AtlasPoint|null {
  if(x*x+y*y>1)return null;
  const z=Math.sqrt(Math.max(0,1-x*x-y*y)),tilt=latitude*rad;
  const phi=Math.asin(Math.max(-1,Math.min(1,y*Math.cos(tilt)+z*Math.sin(tilt))));
  const lambda=Math.atan2(x,z*Math.cos(tilt)-y*Math.sin(tilt));
  return [wrapLongitude(longitude+lambda/rad),phi/rad];
}

export function greatCircle(from:AtlasPoint,to:AtlasPoint,steps=80):AtlasPoint[] {
  const unit=([lon,lat]:AtlasPoint)=>[Math.cos(lat*rad)*Math.cos(lon*rad),Math.cos(lat*rad)*Math.sin(lon*rad),Math.sin(lat*rad)];
  const a=unit(from),b=unit(to),angle=Math.acos(Math.max(-1,Math.min(1,a.reduce((sum,n,i)=>sum+n*b[i],0))));
  return Array.from({length:steps+1},(_,i)=>{
    const t=i/steps;
    const p=angle<.00001?a:a.map((n,j)=>(Math.sin((1-t)*angle)*n+Math.sin(t*angle)*b[j])/Math.sin(angle));
    return [Math.atan2(p[1],p[0])/rad,Math.atan2(p[2],Math.hypot(p[0],p[1]))/rad] as const;
  });
}
