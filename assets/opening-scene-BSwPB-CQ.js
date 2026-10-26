import{a as e,c as t,d as n,f as r,h as i,i as a,l as o,m as s,n as c,o as l,p as u,r as d,s as f,u as p}from"./index-D_2UgA5n.js";import{B as m,D as h,H as g,M as ee,N as te,O as _,P as v,R as y,S as b,V as x,c as S,d as C,f as w,j as ne,k as T,l as re,m as E,o as ie,s as ae,t as oe,u as D,v as se,y as ce}from"./three.module-CXV02X8a.js";import{n as O,t as le}from"./coastlines-8wFrTNCT.js";import{a as ue,i as de,n as fe,o as k,r as pe}from"./Opening-CCbdPRJM.js";var me=`
attribute vec4 aStyle, aRig, aLuma, aRain, aStream, aPath;
attribute vec3 aShell;
attribute vec2 aFlight;
uniform vec2 uViewport, uPointer;
uniform vec4 uLayout;
uniform vec2 uAnchors;
uniform float uDpr, uTime, uPointerPower, uPulse, uExit, uMobile, uReduced, uMorph, uFlowTime, uArrival, uForming;
uniform float uRainRows, uRainGlyphCount, uRainTime, uWorld;
uniform vec2 uWorldRotation;
uniform vec3 uWorldLayout;
uniform vec4 uConanPose, uHolmesPose;
uniform vec2 uHem, uScatter, uScatterLeftOrigin, uScatterRightOrigin;
uniform vec4 uQuietAreas[5];
varying float vGlyph, vPortraitGlyph, vGlyphBlend, vOpacity, vCharacter, vHighlight, vTone;
varying vec3 vPortraitInk;
varying float vGlobe, vGlobeLight;
const float TAU = 6.28318530718;
${k}
${t}
vec2 joint(vec2 point, vec2 pivot, float angle) {
  vec2 d = point-pivot;
  float s=sin(angle), c=cos(angle);
  return pivot+vec2(d.x*c-d.y*s,d.x*s+d.y*c);
}
vec2 modelPoint(vec2 uv) { return (uv-.5)*vec2(.667,1.); }
float quietAt(vec2 point) {
  float quiet=0.;
  for(int i=0;i<5;i++) {
    vec4 area=uQuietAreas[i];
    vec2 d=abs(point-area.xy)-area.zw;
    float distance=length(max(d,0.))+min(max(d.x,d.y),0.);
    quiet=max(quiet,(1.-smoothstep(0.,48.,distance))*step(.1,area.z));
  }
  return quiet;
}
vec3 globePoint(vec3 point) {
  float a=uWorldRotation.x,b=uWorldRotation.y;
  float x=point.x*cos(a)-point.z*sin(a);
  float z=point.x*sin(a)+point.z*cos(a);
  return vec3(x,point.y*cos(b)-z*sin(b),point.y*sin(b)+z*cos(b));
}
vec3 rainStream(float time) {
  // Classic Matrix cell model: a moving bright head writes a long fading history.
  // References and the implementation boundary are in research/motion-v9.
  float cycle=aStream.x;
  float head=mod(aStream.y*cycle+time*aStream.w,cycle);
  float behind=mod(head-aRain.y+cycle,cycle);
  float length=aStream.z;
  float window=1.-smoothstep(length*.76,length,behind);
  float trail=pow(max(0.,1.-behind/length),1.25)*window;
  float tip=(1.-smoothstep(.15,1.3,behind*uRainRows))*window;
  return vec3(trail,tip,window);
}
void main() {
  float kind=aStyle.x, seed=aStyle.w;
  float t=uTime*(1.-uReduced);
  float right=step(2.5,kind);
  float local=clamp((uMorph-aFlight.x)/(aFlight.y-aFlight.x),0.,1.);
  // Short C2 departure/arrival ramps leave the middle of the journey evenly paced.
  float flight=formationFlight(local);
  float assembly=smoothstep(.16,.82,local);
  float landingDetail=worldStage(local,.64,.985);
  float isHolmes=step(1.5,kind)*(1.-right);
  float character=max(isHolmes,right*assembly);
  float rainTime=mix(uRainTime*(1.-uReduced),uFlowTime*(1.-uReduced),right);
  vec2 rain=aRain.xy*uViewport;
  vec3 stream=rainStream(rainTime);
  float tail=stream.x,tip=stream.y;
  float rainAlpha=(.12+tail*1.04+tip*.35)*stream.z*(.65+aRain.z*.35);
  float rainSize=mix(17.6,15.2,uMobile)+aRain.z*.8;
  float cycleRate=mix(.8+seed*1.8,11.,tip);
  float glyph=16.+mod(aStyle.y+floor(rainTime*cycleRate),uRainGlyphCount);
  vPortraitGlyph=glyph;
  vGlyphBlend=0.;
  vec2 p=rain;
  float size=rainSize, alpha=rainAlpha;
  vHighlight=tip*.94+tail*.04;
  vTone=1.;
  vPortraitInk=vec3(0.);
  vGlobe=0.;vGlobeLight=0.;
  if(kind>1.5) {
    float height=mix(uLayout.x,uLayout.y,right);
    float anchorX=mix(uLayout.z,uLayout.w,right);
    float anchorY=mix(uAnchors.x,uAnchors.y,right);
    vec2 q=position.xy*vec2(.667,1.);
    float brightness=aLuma.x;
    if(right>.5) {
      q+=(joint(q,modelPoint(vec2(.711,.316)),uConanPose.y)-q)*aRig.y;
      q+=(joint(q,modelPoint(vec2(.738,.405)),uConanPose.x)-q)*aRig.x;
      q+=(joint(q,modelPoint(vec2(.505,.31)),uConanPose.z)-q)*aRig.z;
      float eye=aLuma.z*uConanPose.w;
      brightness=mix(aLuma.x,aLuma.y,eye);
      float eyeY=position.x+.5<.53?.214:.237;
      q.y-=(position.y+.5-eyeY)*eye*.55;
    } else {
      q+=(joint(q,modelPoint(vec2(.5,.29)),uHolmesPose.x)-q)*aRig.z;
      q+=(joint(q,modelPoint(vec2(.29,.425)),uHolmesPose.y)-q)*aRig.x;
      float side=step(0.,position.x);
      float cape=mix(uHolmesPose.z,uHolmesPose.w,side);
      float hem=mix(uHem.x,uHem.y,side)*smoothstep(.56,.9,position.y+.5);
      q+=(joint(q,modelPoint(vec2(mix(.22,.79,side),.34)),cape)-q)*aRig.w;
      q+=(joint(q,modelPoint(vec2(mix(.22,.79,side),.65)),hem)-q)*aRig.w;
      q.x+=(sin(t*1.1+position.y*8.)*.009+sin(t*1.8-position.y*12.)*.004)*aRig.w;
    }
    vec2 target=vec2(anchorX,anchorY)+q*height;
    vec2 origin=mix(uScatterLeftOrigin,uScatterRightOrigin,right);
    float scatter=mix(uScatter.x,uScatter.y,right)*(1.-right*uForming);
    vec2 away=target-origin;
    float proximity=1.-smoothstep(25.,height*.58,length(away));
    float release=scatter*proximity;
    vec2 radial=normalize(away+vec2(.01));
    vec2 tangent=vec2(-radial.y,radial.x);
    target+=(radial*(38.+seed*93.)+tangent*sin(seed*TAU*3.7+t*.8)*40.)*release;
    float edgeInk=aLuma.w*mix(1.,mix(.48,1.,landingDetail),right);
    float portraitAlpha=(.57+pow(max(brightness,0.),.57)*1.12+edgeInk*.37+aRig.z*.1)
      *(1.-smoothstep(.88,1.,position.y+.5))*(1.-release*.22);
    float rows=mix(150.,120.,right)*mix(1.,.5,uMobile);
    float portraitSize=clamp(height/rows*1.84,4.1,9.6);
    float portraitGlyph=floor(clamp(brightness,0.,.999)*15.);
    if(right>.5) {
      // The SAME glyphs occupy the rain grid and the portrait; no crossfaded image.
      // One continuous route: preserve neighbourhoods and avoid an orbit-to-body splice.
      float remaining=1.-flight;
      vec2 approach=target+aPath.zw;
      p=remaining*remaining*remaining*rain+3.*remaining*remaining*flight*aPath.xy
        +3.*remaining*flight*flight*approach+flight*flight*flight*target;
      float travelLight=16.*flight*flight*remaining*remaining;
      alpha=mix(rainAlpha,portraitAlpha,assembly)+travelLight*.26;
      size=mix(rainSize,portraitSize,smoothstep(.03,.92,local));
      vPortraitGlyph=portraitGlyph;
      vGlyphBlend=smoothstep(.22,.96,local);
    } else {
      p=target;
      alpha=portraitAlpha*uArrival;
      size=portraitSize;
      glyph=portraitGlyph;
    }
    vHighlight=mix(tip*.94+tail*.04,smoothstep(.2,.8,brightness)*.40+aRig.z*.09,character);
    vTone=mix(1.,0.,isHolmes);
    vPortraitInk=vec3(brightness,edgeInk,mix(1.,assembly,right));
  }
  // The same original columns bow into meridian ribbons, then close over a
  // sphere. No shuffled point assignments or second canvas during the pullback.
  float worldFlight=0.;
  // The globe is absent at the rain chapter; skip all its surface work there.
  if(uWorld>0.) {
  float worldGlyph=1.-isHolmes;
  float delay=(sin(aRain.x*TAU*3.)*.5+.5)*.018;
  worldFlight=worldStage(uWorld,WORLD_BEND.x+delay,WORLD_BEND.y+delay);
  float landReveal=worldStage(uWorld,WORLD_LAND.x,WORLD_LAND.y);
  if(worldGlyph>.5) {
    float closeSphere=worldStage(uWorld,.16,WORLD_BEND.y);
    float equator=sqrt(max(.00001,1.-aShell.y*aShell.y));
    vec3 cylinder=vec3(aShell.x/equator,(.5-aRain.y)*2.,aShell.z/equator);
    vec3 spherePosition=mix(cylinder,aShell,closeSphere);
    vec3 globe=globePoint(spherePosition);
    vec2 globeTarget=uWorldLayout.xy+vec2(globe.x,-globe.y)*uWorldLayout.z;
    vec2 source=p;
    // A continuous deformation of each vertical strip preserves its head/tail
    // topology. The shallow banking term vanishes with zero endpoint velocity.
    float bank=sin(worldFlight*3.14159265);
    p=mix(source,globeTarget,worldFlight);
    p.x+=sin(aRain.y*3.14159265)*bank*bank*uViewport.x*.026;
    float surface=worldStage(uWorld,.22,.64);
    float facing=smoothstep(-.08,.13,globe.z);
    float light=max(0.,dot(normalize(globe),normalize(vec3(-.58,.53,.82))));
    // Imagery supplies the terrain. The original glyphs become quiet residual
    // traces, avoiding a second noisy continent map pasted over the Earth.
    float etching=0.;
    float globeAlpha=mix(.52,etching,landReveal)*(.42+light*.58)*facing;
    alpha=mix(alpha,globeAlpha,surface);
    float shellSize=mix(8.,1.6,landReveal);
    size=mix(size,shellSize*(.85+max(0.,globe.z)*.15),surface);
    vHighlight=mix(vHighlight,.25+light*.30,surface);
    character*=1.-surface;
    vGlyphBlend*=1.-surface;
    vGlobe=surface;
    vGlobeLight=light;
  } else {
    float departure=worldStage(uWorld,WORLD_PORTRAIT.x,WORLD_PORTRAIT.y);
    p+=vec2(-uViewport.x*.035,-uViewport.y*.025)*departure;
    alpha*=1.-departure;
  }
  }
  vec2 diff=p-(uPointer+uViewport*.5);
  float distanceToPointer=length(diff);
  float formationInteraction=1.-right*uForming;
  float influence=exp(-distanceToPointer*distanceToPointer/13500.)*uPointerPower*formationInteraction;
  vec2 radial=normalize(diff+vec2(.001));
  vec2 tangent=vec2(-radial.y,radial.x);
  p+=(radial*(76.+sin(t*1.4+seed*TAU)*9.)+tangent*sin(seed*TAU)*19.)*influence*(1.-character)*mix(1.,.48,uWorld);
  float pulseAge=uTime-uPulse;
  float wave=exp(-pow((distanceToPointer-pulseAge*260.)/37.,2.))*exp(-max(0.,pulseAge)*1.4);
  p+=radial*wave*14.*(1.-character)*formationInteraction;
  // Feather controls and avoid noisy rain inside the two portraits.
  vec2 n=p/uViewport;
  float holmesShade=1.-smoothstep(.55,1.15,length((p-vec2(uLayout.z,uAnchors.x))/vec2(uLayout.x*.31,uLayout.x*.52)));
  float conanShade=(1.-smoothstep(.5,1.14,length((p-vec2(uLayout.w,uAnchors.y))/vec2(uLayout.y*.34,uLayout.y*.54))))*smoothstep(.65,1.,uMorph);
  float background=(1.-holmesShade*.94)*(1.-conanShade*.98)*(1.-uMorph*.45);
  alpha*=mix(mix(background,1.,character),1.,worldFlight);
  // A shallow control-only feather, never an empty rectangle behind the signature.
  if(isHolmes<.5) alpha*=1.-quietAt(p)*.42*(1.-right*smoothstep(.93,1.,uMorph))*(1.-worldFlight);
  float edge=(.75+smoothstep(0.,.04,n.y)*.25)*(1.-smoothstep(.94,1.,n.y));
  alpha*=mix(edge,1.,max(character,worldFlight));
  vec2 cameraCentre=uViewport*vec2(.57,.52);
  // A coherent optical push: each portrait stays on one depth plane.
  float depth=mix(.48+aRain.z*.23,.64,max(character,worldFlight));
  float projection=1./(1.-uExit*depth);
  p=cameraCentre+(p-cameraCentre)*projection;
  size*=projection;
  vOpacity=max(0.,alpha)*(1.-smoothstep(.45,1.,uExit));
  vGlyph=glyph;
  vCharacter=character;
  gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0.,1.);
  gl_PointSize=size*uDpr;
}
`,he=`
uniform sampler2D uAtlas;
uniform vec2 uAtlasGrid;
varying float vGlyph, vPortraitGlyph, vGlyphBlend, vOpacity, vCharacter, vHighlight, vTone;
varying vec3 vPortraitInk;
varying float vGlobe, vGlobeLight;
float glyphInk(float glyph) {
  float index=floor(glyph);
  vec2 cell=vec2(mod(index,uAtlasGrid.x),floor(index/uAtlasGrid.x));
  vec2 uv=(cell+gl_PointCoord)/uAtlasGrid;
  uv.y=1.-uv.y;
  return texture2D(uAtlas,uv).a;
}
void main() {
  if(vOpacity<.005) discard;
  // Two atlas reads only during the brief glyph transition; no threshold swap.
  float ink;
  if(vGlyphBlend>.999) ink=glyphInk(vPortraitGlyph);
  else if(vGlyphBlend<.001) ink=glyphInk(vGlyph);
  else ink=mix(glyphInk(vGlyph),glyphInk(vPortraitGlyph),vGlyphBlend);
  float dotInk=1.-smoothstep(.30,.48,length(gl_PointCoord-.5));
  ink=mix(ink,dotInk,vGlobe);
  if(vCharacter>.001) {
    float plate=1.-smoothstep(.31,.48,max(abs(gl_PointCoord.x-.5),abs(gl_PointCoord.y-.5)));
    float engraving=plate*(.10+pow(max(vPortraitInk.x,0.),.7)*.34+vPortraitInk.y*.08);
    ink=max(ink,engraving*vCharacter*vPortraitInk.z);
  }
  if(ink<.018) discard;
  vec3 rain=mix(vec3(.045,.42,1.),vec3(.66,.91,1.),vHighlight);
  vec3 portrait=mix(vec3(1.,.84,.58),vec3(.36,.76,1.),vTone);
  portrait*=.63+pow(max(vPortraitInk.x,0.),.64)*.48;
  vec3 highlight=mix(vec3(1.,.97,.88),vec3(.80,.94,1.),vTone);
  portrait=mix(portrait,highlight,vHighlight);
  vec3 colour=mix(rain,portrait,vCharacter);
  vec3 globeInk=mix(vec3(.13,.29,.38),vec3(.68,.84,.88),pow(vGlobeLight,.65));
  colour=mix(colour,globeInk,vGlobe);
  ink=mix(ink,pow(ink,.76),vCharacter);
  gl_FragColor=vec4(colour,ink*min(.99,vOpacity));
}
`;function ge(e,t){if(e.length!==t.length)throw Error(`Formation requires one source per destination`);let n=[];function r(e,t){if(e.length<2){e.length&&n.push([e[0],t[0]]);return}let i=(e,t)=>{let n=1/0,r=-1/0;for(let i of e)n=Math.min(n,i[t]),r=Math.max(r,i[t]);return r-n},a=i(e,`x`)+i(t,`x`)>i(e,`y`)+i(t,`y`)?`x`:`y`;e.sort((e,t)=>e[a]-t[a]),t.sort((e,t)=>e[a]-t[a]);let o=Math.floor(e.length/2);r(e.slice(0,o),t.slice(0,o)),r(e.slice(o),t.slice(o))}return r([...e],[...t]),n}function _e(e,t,n,r,i){let a=t.x-e.x,o=Math.hypot(a,t.y-e.y),s=Math.min(n*.13,o*.12)*(i-.5),c=Math.max(14,Math.min(n*.19,o*.14)),l=Math.max(10,Math.min(n*.14,o*.1));return{controls:[e.x+a*.22+s*.2,e.y+c,-a*.16+s,-l],timing:[.008+(1-r)*.035+i*.005,.91+(1-r)*.07]}}var ve=Math.PI/180,A=le;function ye(e,t){let n=t*ve,r=e*ve,i=Math.cos(n);return[i*Math.sin(r),Math.sin(n),i*Math.cos(r)]}A.map(e=>{let t=e[0][0],n=e.map(([e,n])=>{let r=e;for(;r-t>180;)r-=360;for(;r-t<-180;)r+=360;return t=r,[r,n]});return{points:n,minX:Math.min(...n.map(e=>e[0])),maxX:Math.max(...n.map(e=>e[0])),minY:Math.min(...n.map(e=>e[1])),maxY:Math.max(...n.map(e=>e[1]))}});var be=[],j=0;for(let e of A)for(let t=1;t<e.length;t++){let n=ye(e[t-1][0],e[t-1][1]),r=ye(e[t][0],e[t][1]),i=Math.acos(Math.max(-1,Math.min(1,n.reduce((e,t,n)=>e+t*r[n],0))));i<1e-9||(j+=i,be.push({from:n,to:r,length:i,end:j}))}var M;function xe(){if(!M){let e=O([-.13,51.51],[139.69,35.69],110).map((e,t)=>{let n=1.028+Math.sin(t/110*Math.PI)*.055,r=ye(...e);return[r[0]*n,r[1]*n,r[2]*n]});M=new Float32Array((e.length-1)*6);for(let t=1;t<e.length;t++)M.set([...e[t-1],...e[t]],(t-1)*6)}return M}function Se(e,t){let n=!1,r=0,i=0,a=new Set,o=e=>{let t=new w(new Uint8Array(e),1,1,T);return t.needsUpdate=!0,a.add(t),t},s=o([13,28,43,255]),c=o([0,0,0,255]),l={...e,uWorldRotation:e.uWorldRotation??{value:new m},uTime:e.uTime??{value:0},uDayMap:{value:s},uNightMap:{value:c},uCloudMap:{value:c},uDayReady:{value:0},uNightReady:{value:0},uCloudReady:{value:0}},u=new h(2.12,2.12),d=new v({transparent:!0,side:2,forceSinglePass:!0,depthTest:!1,depthWrite:!1,uniforms:l,vertexShader:`
      uniform vec2 uViewport;
      uniform vec3 uWorldLayout;
      uniform float uExit;
      varying vec2 vSphere;
      void main(){
        vSphere=position.xy;
        vec2 p=uWorldLayout.xy+position.xy*uWorldLayout.z;
        vec2 centre=uViewport*vec2(.57,.52);
        p=centre+(p-centre)/(1.-uExit*.64);
        gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0.,1.);
      }`,fragmentShader:`
      uniform sampler2D uDayMap,uNightMap,uCloudMap;
      uniform vec2 uWorldRotation;
      uniform float uWorld,uExit,uTime,uDayReady,uNightReady,uCloudReady;
      varying vec2 vSphere;
      const float PI=3.14159265359;
      const float TAU=6.28318530718;
      ${k}
      // Exact inverse of the shared unitGlobePoint rotation. Greenwich is u=.5.
      vec3 geographicNormal(vec3 q){
        float a=uWorldRotation.x,b=uWorldRotation.y;
        float y=q.y*cos(b)+q.z*sin(b);
        float z=-q.y*sin(b)+q.z*cos(b);
        return vec3(q.x*cos(a)+z*sin(a),y,-q.x*sin(a)+z*cos(a));
      }
      vec2 geographicUv(vec3 q){
        vec3 n=geographicNormal(q);
        return vec2(.5+atan(n.x,n.z)/TAU,.5-asin(clamp(n.y,-1.,1.))/PI);
      }
      void main(){
        float reveal=worldStage(uWorld,.40,min(.78,WORLD_LAND.y))*(1.-smoothstep(.45,1.,uExit));
        float radius=length(vSphere);
        if(radius>1.045 || reveal<.001)discard;
        float edgeWidth=max(.0008,fwidth(radius));
        float edge=1.-smoothstep(1.-edgeWidth,1.+edgeWidth,radius);
        float z=sqrt(max(0.,1.-radius*radius));
        vec3 normal=normalize(vec3(vSphere.x,-vSphere.y,z));
        vec3 sun=normalize(vec3(-.82,.36,.44));
        float incidence=dot(normal,sun);
        float daySide=smoothstep(-.13,.20,incidence);
        float daylight=.035+.965*pow(max(0.,incidence),.62);
        vec2 uv=geographicUv(normal);

        // Source maps remain sRGB data; lighting is computed in linear light.
        vec3 sampleDay=texture2D(uDayMap,uv).rgb;
        vec3 albedo=pow(sampleDay,vec3(2.2));
        float luma=dot(albedo,vec3(.2126,.7152,.0722));
        albedo=mix(vec3(luma),albedo,.83);
        float ocean=smoothstep(.025,.105,sampleDay.b-max(sampleDay.r,sampleDay.g));
        albedo=mix(albedo,albedo*.54+vec3(.001,.006,.017),ocean*.74);
        vec3 colour=albedo*daylight;
        colour+=albedo*vec3(.035,.055,.075)*(1.-daySide);

        // The cloud shell turns independently, with a small altitude parallax.
        float cloudRadius=1.006;
        vec2 cloudXY=vSphere/cloudRadius;
        vec3 cloudNormal=normalize(vec3(cloudXY.x,-cloudXY.y,sqrt(max(0.,1.-dot(cloudXY,cloudXY)))));
        vec2 cloudUv=geographicUv(cloudNormal);
        cloudUv.x=fract(cloudUv.x+uTime*.000095);
        float cloud=pow(texture2D(uCloudMap,cloudUv).r,1.45)*uCloudReady;
        float cloudAlpha=cloud*.44;
        colour*=1.-cloudAlpha*.19*daySide;
        vec3 cloudColour=vec3(.69,.76,.81)*(.035+pow(max(0.,incidence),.72)*.72);
        colour=mix(colour,cloudColour,cloudAlpha);

        // Cities emit only on the night side; warm lights stay smaller than land.
        vec3 night=pow(texture2D(uNightMap,uv).rgb,vec3(1.65));
        float nightLuma=dot(night,vec3(.2126,.7152,.0722));
        night=mix(night,nightLuma*vec3(1.14,.79,.46),.38);
        colour+=night*.79*(1.-smoothstep(-.14,.19,incidence))*uNightReady*(1.-cloudAlpha*.42);

        // A thin illuminated limb, not a luminous outline around the whole globe.
        float fresnel=pow(1.-z,4.8);
        float rimLight=.25+.75*smoothstep(-.25,.45,incidence);
        colour+=vec3(.007,.030,.065)*fresnel*rimLight;
        vec3 encoded=pow(max(colour,vec3(0.)),vec3(1./2.2));
        float halo=exp(-max(0.,radius-1.)*83.)*(1.-edge)*.085*rimLight;
        vec3 haloColour=vec3(.18,.43,.61);
        float alpha=(edge*.995+halo)*reveal*mix(.30,1.,uDayReady);
        if(alpha<.001)discard;
        gl_FragColor=vec4(mix(haloColour,encoded,edge),alpha);
      }`}),f=new b(u,d);f.frustumCulled=!1,f.renderOrder=-2,f.visible=!1;let p=new y;for(let[e,o,s]of[[`day`,l.uDayMap,l.uDayReady],[`night`,l.uNightMap,l.uNightReady],[`clouds`,l.uCloudMap,l.uCloudReady]]){let c=p.load(`./media/earth-v21/${e}.webp`,e=>{n?e.dispose():(e.flipY=!1,e.wrapS=ne,e.wrapT=D,e.colorSpace=``,e.minFilter=ce,e.generateMipmaps=!1,e.magFilter=ce,e.anisotropy=2,o.value=e,s.value=1,r++,t?.())},void 0,()=>{n||(i++,t?.())});a.add(c)}return{object:f,get status(){return r===3?`ready`:i>0?r>0?`partial`:`fallback`:`loading`},update(e){f.visible=e>.4},dispose(){n=!0,u.dispose(),d.dispose(),a.forEach(e=>e.dispose()),a.clear()}}}var Ce=[`0`,`1`,`:`,`+`,`/`,`≈`,`·`,`=`,`—`,`7`,`2`,`B`,`4`,`8`,`6`,`9`],we=Array.from(`0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ{}`),Te=[...Ce,...we],Ee=8,De=Math.ceil(Te.length/Ee),Oe=e=>`./media/${e}`;function ke(t,h){let y=!1,b;try{b=new oe({alpha:!0,antialias:!1,powerPreference:`high-performance`})}catch{return t.dataset.status=`fallback`,h.onReady?.(),()=>{y=!0}}t.dataset.status=`loading`,t.dataset.playing=`false`;let w=b.domElement;w.setAttribute(`aria-hidden`,`true`),w.style.cssText=`position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none`,b.setClearColor(331031,0),b.outputColorSpace=ee,b.toneMapping=0,t.appendChild(w);let ne=document.createElement(`canvas`);ne.width=256,ne.height=De*32;let T=ne.getContext(`2d`);T.font=`23px "SFMono-Regular", Consolas, "Liberation Mono", monospace`,T.textAlign=`center`,T.textBaseline=`middle`,T.fillStyle=`white`,Te.forEach((e,t)=>{T.font=t<Ce.length?`600 24px "SFMono-Regular", Consolas, "Liberation Mono", monospace`:`600 25px Consolas, "Liberation Mono", monospace`,T.shadowBlur=t<Ce.length?0:3,T.shadowColor=`rgba(255,255,255,.55)`,T.fillText(e,t%Ee*32+16,Math.floor(t/Ee)*32+17)});let D=new re(ne);D.minFilter=ce,D.magFilter=ce,D.generateMipmaps=!1,D.colorSpace=``;let O={uAtlas:{value:D},uAtlasGrid:{value:new m(Ee,De)},uRainGlyphCount:{value:we.length},uRainRows:{value:60},uTime:{value:0},uViewport:{value:new m(1280,720)},uDpr:{value:1},uPointer:{value:new m(0,0)},uPointerPower:{value:0},uPulse:{value:-100},uExit:{value:0},uMobile:{value:0},uReduced:{value:+!!h.reduced},uConanPose:{value:new g},uHolmesPose:{value:new g},uHem:{value:new m},uScatter:{value:new m},uScatterLeftOrigin:{value:new m},uScatterRightOrigin:{value:new m},uLayout:{value:new g},uAnchors:{value:new m},uMorph:{value:0},uForming:{value:0},uFlowTime:{value:0},uRainTime:{value:0},uWorld:{value:0},uWorldRotation:{value:new m(58*Math.PI/180,33*Math.PI/180)},uWorldLayout:{value:new x},uArrival:{value:0},uQuietAreas:{value:Array.from({length:5},()=>new g)}},le=new v({transparent:!0,depthTest:!1,depthWrite:!1,blending:1,uniforms:O,vertexShader:me,fragmentShader:he}),k=new te,ve=new S,A=new ae,be=new _(A,le);be.frustumCulled=!1,k.add(be);let j=Se(O,()=>{!y&&!L&&!document.hidden&&Z(performance.now())});k.add(j.object);let M=[];function ke(e,t,n,r,i=!1){let a=new ae;a.setAttribute(`position`,new ie(e,3));let o=new Float32Array(e.length/3);if(i)for(let e=0;e<o.length;e++)o[e]=(Math.floor(e/2)+e%2)/(o.length/2);a.setAttribute(`aPhase`,new ie(o,1));let s=new v({transparent:!0,depthTest:!1,depthWrite:!1,uniforms:{uViewport:O.uViewport,uWorldRotation:O.uWorldRotation,uWorldLayout:O.uWorldLayout,uWorld:O.uWorld,uExit:O.uExit,uInk:{value:new C(t)},uLineOpacity:{value:n},uStage:{value:new m(...r)},uRoute:{value:+!!i}},vertexShader:`
    uniform vec2 uViewport,uWorldRotation;
    uniform vec3 uWorldLayout;
    attribute float aPhase;
    uniform float uWorld,uExit;
    varying float vFacing,vPhase;
    void main(){
      float a=uWorldRotation.x,b=uWorldRotation.y;
      float x=position.x*cos(a)-position.z*sin(a);
      float z=position.x*sin(a)+position.z*cos(a);
      vec3 q=vec3(x,position.y*cos(b)-z*sin(b),position.y*sin(b)+z*cos(b));
      vec2 p=uWorldLayout.xy+vec2(q.x,-q.y)*uWorldLayout.z;
      vec2 centre=uViewport*vec2(.57,.52);
      p=centre+(p-centre)/(1.-uExit*.64);
      vFacing=smoothstep(-.015,.07,q.z);
      vPhase=aPhase;
      gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0.,1.);
    }`,fragmentShader:`
    uniform vec3 uInk;
    uniform vec2 uStage;
    uniform float uWorld,uLineOpacity,uExit,uRoute;
    varying float vFacing,vPhase;
    void main(){
      float reveal=smoothstep(uStage.x,uStage.y,uWorld);
      // The story thread writes from London to Tokyo after land has developed.
      float pen=reveal*1.035;
      float thread=1.-smoothstep(pen-.025,pen+.008,vPhase);
      reveal*=mix(1.,thread,uRoute);
      float opacity=vFacing*reveal*uLineOpacity*(1.-smoothstep(.45,1.,uExit));
      if(opacity<.003)discard;
      gl_FragColor=vec4(uInk,opacity);
    }`}),c=new se(a,s);c.frustumCulled=!1,c.visible=!1,c.renderOrder=i?3:2,k.add(c),M.push({geometry:a,material:s,object:c})}ke(xe(),14928792,.76,fe.route,!0);let N=0,P=0,F=!1,Ae=[],I=e=>{let t=Math.sin(e*127.1+311.7)*43758.5453;return t-Math.floor(t)};function je(){let e=P*.16+218,t=P*.45+116,n=F?Math.min(P*.55,N*1.12,P*.92-e):Math.min(780,P*.83,N*.68),r=F?Math.min(P*.34,N*.76,P*.915-t):Math.min(440,P*.48,N*.38);return{holmesHeight:n,conanHeight:r,holmesX:N*(F?.23:.245),conanX:N*(F?.78:.805),holmesY:F?e+n*.5:P*.535,conanY:F?t+r*.5:P*.705}}function Me(e=O.uWorld.value){return pe(N,P,e)}function Ne(){if(y||!N||!P)return;let e=[],n=[],r=[],i=[],a=[],o=[],s=[],c=[],l=e=>e.samples.filter(t=>!F||!(Math.floor((t.x+.5)*(e.kind===2?100:80))%2||Math.floor((t.y+.5)*(e.kind===2?150:120))%2)),u=Ae.find(e=>e.kind===3),f=u?l(u):[],p=Math.ceil(N/(F?12:13)),m=Math.max(Math.ceil(P/(F?14:15)),Math.ceil(f.length*1.45/p)),h=[];for(let e=0;e<p;e++){let t=I(e*19+71),n=I(e*31+43);for(let r=0;r<m;r++)h.push({value:[(e+.5)/p,(r+.5)/m,t,n],order:I(e+1031)+r/m*1e-5})}h.sort((e,t)=>e.order-t.order);let g=je(),ee=h.slice(0,f.length).map((e,t)=>({x:e.value[0]*N,y:e.value[1]*P,index:t})),te=f.map(e=>({x:g.conanX+e.x*.667*g.conanHeight,y:g.conanY+e.y*g.conanHeight,sample:e})),_=new Map(ge(ee,te).map(([e,t])=>[e.index,t])),v=0,b=(t,l,u,f,p,m)=>{e.push(t,l,0),n.push(u,Math.floor(f*we.length),1,f),r.push(...m?.binding??[0,0,0,0]),i.push(...m?[m.brightness,m.closed,m.eye,m.edge]:[0,0,0,0]),a.push(...p);let h=p[2];if(o.push(1.18+I(h*17)*.38,I(h*91),.32+I(h*43)*.48,.105+p[3]*.145),m&&u===3){let e={x:p[0]*N,y:p[1]*P},t={x:g.conanX+m.x*.667*g.conanHeight,y:g.conanY+m.y*g.conanHeight},n=d(m.edge*.68+m.binding[2]*.27+m.eye*.6),r=d(n*.7+(1-(m.y+.5))*.3),i=_e(e,t,g.conanHeight,r,f);s.push(...i.controls),c.push(...i.timing),v+=Math.hypot(t.x-e.x,t.y-e.y)}else s.push(0,0,0,0),c.push(0,1)};h.forEach((e,t)=>{let n=_.get(t)?.sample;b(n?.x??0,n?.y??0,n?3:0,I(t+7167),e.value,n)});let x=Ae.find(e=>e.kind===2);x&&l(x).forEach((e,t)=>b(e.x,e.y,2,I(t+4321),[0,0,0,0],e));let S=new ae;S.setAttribute(`position`,new E(e,3)),S.setAttribute(`aStyle`,new E(n,4)),S.setAttribute(`aRig`,new E(r,4)),S.setAttribute(`aLuma`,new E(i,4)),S.setAttribute(`aRain`,new E(a,4)),S.setAttribute(`aStream`,new E(o,4)),S.setAttribute(`aPath`,new E(s,4)),S.setAttribute(`aFlight`,new E(c,2));let C=new Float32Array(e.length);h.forEach((e,t)=>C.set(de(e.value[0],e.value[1]),t*3)),S.setAttribute(`aShell`,new ie(C,3)),be.geometry=S,A.dispose(),A=S,t.dataset.geometryId=A.uuid,t.dataset.particles=String(e.length/3),t.dataset.rainParticles=String(h.length),t.dataset.morphParticles=String(f.length),t.dataset.rainStyle=`matrix-blue-streams`,t.dataset.flow=`spatial-bezier`,t.dataset.meanTravel=(v/Math.max(1,f.length)).toFixed(1),t.dataset.rainColumns=String(p),t.dataset.rainRows=String(m),t.dataset.worldGlyphs=String(h.length),t.dataset.worldTransport=`ordered-meridian-ribbons`,O.uRainRows.value=m}let L=!1,Pe=!1,Fe=!0,Ie=performance.now(),Le=0,Re=0,ze=0,R=0,z=0,B=58,V=33,H=58,U=33,Be=``,W=-1,G=0,Ve=0,He=0,Ue=null,We=0,Ge=0,Ke=[],qe=[],Je=new m,Ye=new m,K=[f(),f()],q=l(),J=0,Xe=!1,Ze=``,Qe=0,$e=0,Y=[new m,new m],et=[new m,new m],tt=0,nt=0,rt=new URLSearchParams(window.location.search).get(`openingTime`),it=rt!==null&&Number.isFinite(Number(rt))?Math.max(0,Number(rt)):null,at=window.matchMedia(`(prefers-reduced-motion: reduce)`),ot=()=>h.reduced||at.matches,X=()=>ot()||document.documentElement.dataset.paused===`true`,st=()=>!y&&!Pe&&Fe&&!document.hidden&&!X()&&it===null;function Z(n){if(y||Pe)return;let r=n-Ie,a=Math.max(0,r/1e3),l=Math.min(a,.2);Ie=n,L&&(Le+=a);let f=it??Le;(X()||f>=1.8)&&(Xe=!0),O.uArrival.value=Xe?1:u(f,.15,1.8),O.uTime.value=f,O.uReduced.value=+!!ot();let m=X()||it!==null;if(L||m){let e=1-Math.exp(-l*12);z=m?R:z+(R-z)*e,Math.abs(R-z)<1e-4&&(z=R);let t=1-Math.exp(-l*8);B=m?H:B+(H-B)*t,V=m?U:V+(U-V)*t,Math.abs(H-B)<.001&&(B=H),Math.abs(U-V)<.001&&(V=U)}O.uWorld.value=z;let g=Me(z);O.uWorldLayout.value.set(g.x,g.y,g.radius);let ee=1-ue(z,.16,.84);O.uWorldRotation.value.set((B-11*ee)*Math.PI/180,(V+8*ee)*Math.PI/180),(W<0||Math.abs(z-W)>=5e-4||z!==W&&(z===0||z===1))&&(W=z,t.dispatchEvent(new CustomEvent(`opening:world-progress`,{detail:z}))),j.update(z),M.forEach(e=>{e.object.visible=z>e.material.uniforms.uStage.value.x});let te=R<=1e-4&&z<=1e-4;if(L&&(ze+=a*(1-ue(z,0,.48))),L&&te){let e=O.uMorph.value,t=Math.max(0,q.duration-q.elapsed),n=Math.min(a,t),r=o(s(q,a));O.uMorph.value=r,G=c(G,e,r,n),G=c(G,r,r,a-n),Re+=a*(1-u(q.value,0,.28))}O.uRainTime.value=ze,O.uFlowTime.value=Re,O.uForming.value=te&&(q.value!==q.target||q.velocity!==0)?1:0;let _=p(f,ot()),v=e(G,ot());if(O.uConanPose.value.set(v.elbow,v.wrist,v.head,v.blink),O.uHolmesPose.value.set(_.gaze,_.inspection,_.capeLeft,_.capeRight),O.uHem.value.set(_.hemLeft,_.hemRight),L){O.uScatter.value.set(i(K[0],a),i(K[1],a));for(let e=0;e<2;e++)K[e].target>.03&&Y[e].lerp(et[e],1-Math.exp(-a*18))}O.uScatterLeftOrigin.value.copy(Y[0]),O.uScatterRightOrigin.value.copy(Y[1]);let x=1-Math.exp(-l*7);Je.lerp(Ye,x),We+=(Ge-We)*x,O.uPointer.value.copy(Je),O.uPointerPower.value=X()?0:We;let S=O.uMorph.value,C=S<.002?`rain`:S<.32?`gather`:S<.73?`trace`:S<1?`develop`:`formed`;if(C!==Ze&&(Ze=C,t.dataset.phase=C,h.onPhase?.(C)),q.value===q.target&&q.velocity===0&&J!==q.target&&(J=q.target,t.dataset.formation=J===1?`formed`:`raining`,h.onFormed?.(J===1)),(t.dataset.exiting===`true`||t.dataset.exiting===`1`)&&Ue===null){let e=Number(t.dataset.exitStartedAt);Ue=Number.isFinite(e)?e:n}let w=Ue===null?0:d((n-Ue)/960);He=w*w*(3-2*w),O.uExit.value=X()?0:He;try{let e=performance.now();b.render(k,ve);let i=performance.now()-e;if(Ve++,(n-Qe>=120||!L)&&(Qe=n,t.dataset.frame=String(Ve),t.dataset.time=f.toFixed(2),t.dataset.drawCalls=String(b.info.render.calls),t.dataset.conanBlink=v.blink.toFixed(3),t.dataset.conanArm=v.elbow.toFixed(3),t.dataset.conanClock=G.toFixed(3),t.dataset.conanWrist=v.wrist.toFixed(3),t.dataset.conanHead=v.head.toFixed(3),t.dataset.holmesCape=_.hemRight.toFixed(3),t.dataset.scatterHolmes=K[0].value.toFixed(3),t.dataset.scatterConan=K[1].value.toFixed(3),t.dataset.transition=He.toFixed(3),t.dataset.morph=q.value.toFixed(3),t.dataset.travel=S.toFixed(3),t.dataset.morphTarget=String(q.target),t.dataset.forming=String(O.uForming.value===1),t.dataset.formationDuration=q.duration.toFixed(3),t.dataset.pointerPower=We.toFixed(3),t.dataset.worldProgress=z.toFixed(4),t.dataset.worldTarget=R.toFixed(4),t.dataset.worldStage=z<.16?`portrait-departure`:z<.55?`sphere-curvature`:z<.84?`continent-development`:`two-city-thread`,t.dataset.worldSurface=`satellite-blue-marble`,t.dataset.worldTextures=j.status,t.dataset.worldRadius=g.radius.toFixed(1),t.dataset.worldCentre=`${g.x.toFixed(1)},${g.y.toFixed(1)}`,t.dataset.worldLongitude=B.toFixed(2),t.dataset.globeLongitude=B.toFixed(2),t.dataset.worldLatitude=V.toFixed(2),t.dataset.rainClock=ze.toFixed(3)),ct(),L&&Ve>8&&(qe.push(i),r>0&&Ke.push(r),qe.length>90&&qe.shift(),Ke.length>90&&Ke.shift(),n-$e>=750)){$e=n;let e=[...Ke].sort((e,t)=>e-t);t.dataset.renderMs=(qe.reduce((e,t)=>e+t,0)/qe.length).toFixed(3),t.dataset.frameP95=(e[Math.floor((e.length-1)*.95)]??0).toFixed(2),t.dataset.metricScope=`js-submit-and-callback-interval`}}catch{wt()}}function ct(){let e=Me(),n=O.uWorldRotation.value.x,r=O.uWorldRotation.value.y,i=[[`london`,-.13,51.51],[`tokyo`,139.69,35.69]].map(([t,i,a])=>{let o=ye(i,a),s=o[0]*Math.cos(n)-o[2]*Math.sin(n),c=o[0]*Math.sin(n)+o[2]*Math.cos(n),l=o[1]*Math.cos(r)-c*Math.sin(r),u=o[1]*Math.sin(r)+c*Math.cos(r);return{id:t,x:e.x+s*e.radius,y:e.y-l*e.radius,visible:u>.02&&z>.7}}),a=i.map(e=>`${e.id}:${Math.round(e.x*2)}:${Math.round(e.y*2)}:${e.visible}`).join(`|`);a!==Be&&(Be=a,t.dispatchEvent(new CustomEvent(`opening:globe-cities`,{detail:i})))}function Q(){if(y)return;let e=st();e===L?!e&&!document.hidden&&Fe&&Z(performance.now()):(L=e,Ie=performance.now(),t.dataset.playing=String(L),b.setAnimationLoop(L?Z:null),!L&&!document.hidden&&Fe&&Z(Ie))}function lt(){if(y)return;let e=t.getBoundingClientRect(),n=Math.max(1,e.width),r=Math.max(1,e.height),i=n<700,a=Math.abs(N-n)>2||Math.abs(P-r)>2||i!==F;N=n,P=r,F=i,tt=e.left+window.scrollX,nt=e.top+window.scrollY;let{holmesHeight:o,conanHeight:s,holmesX:c,conanX:l,holmesY:u,conanY:d}=je();Y[0].set(c,u),Y[1].set(l,d),O.uLayout.value.set(o,s,c,l),O.uAnchors.value.set(u,d),t.dataset.holmesHeight=o.toFixed(1),t.dataset.conanHeight=s.toFixed(1),et.forEach((e,t)=>e.copy(Y[t]));let f=Math.min(window.devicePixelRatio||1,F?1.15:1.25);b.setPixelRatio(f),b.setSize(N,P,!1),O.uViewport.value.set(N,P),O.uDpr.value=f,t.dataset.pixelRatio=f.toFixed(2),O.uMobile.value=+!!F;let p=Me();O.uWorldLayout.value.set(p.x,p.y,p.radius),t.dataset.worldRadius=p.radius.toFixed(1),ft(),a&&Ne(),Z(performance.now())}let $=t.closest(`[data-opening-scroll]`)??t.parentElement??t,ut=t.closest(`[data-opening-scroll]`),dt=()=>{mt()};function ft(){if(y)return;let e=t.getBoundingClientRect(),n=[`.opening-enter`,`.opening-reveal`,`.opening-brand`,`.opening-skip`,`.opening-controls`].map((t,n)=>{let r=$.querySelector(t);if(!r)return O.uQuietAreas.value[n].set(0,0,0,0),null;let i=r.getBoundingClientRect(),a=i.left-e.left-8,o=i.top-e.top-8,s=i.width+16,c=i.height+16;return O.uQuietAreas.value[n].set(a+s*.5,o+c*.5,s*.5,c*.5),{selector:t,x:Math.round(a),y:Math.round(o),w:Math.round(s),h:Math.round(c)}});t.dataset.quietAreas=JSON.stringify(n.filter(Boolean))}let pt=e=>{if(X()||e.pointerType===`touch`)return;let t=e.pageX-tt,n=e.pageY-nt;if(Ye.set(t-N*.5,n-P*.5),Ge=1,!F){let e=je();for(let r=0;r<2;r++){let i=r===0?e.holmesHeight:e.conanHeight,a=r===0?e.holmesX:e.conanX,o=r===0?e.holmesY:e.conanY,s=Math.hypot((t-a)/(i*.39),(n-o)/(i*.55)),c=q.target===1&&q.value===1&&q.velocity===0;K[r].target=r===1&&!c?0:1-u(s,.25,1.12),K[r].target>.03&&et[r].set(t,n)}}},mt=()=>{Ge=0,Ye.set(0,0),K.forEach(e=>{e.target=0})},ht=()=>{X()||(O.uPulse.value=O.uTime.value)},gt=e=>{e.button!==0||X()||e.target instanceof Element&&e.target.closest(`button,a,input,select,textarea,[role=button]`)||ht()},_t=e=>{let n=+!!e.detail;J=-1,r(q,n),Object.assign(K[1],f()),O.uScatter.value.y=0,t.dataset.formation=n===1?`gathering`:`raining`,(X()||it!==null)&&(q.value=n,q.velocity=0,q.elapsed=q.duration,O.uMorph.value=n,Z(performance.now()))},vt=e=>{let n=Number(e.detail);Number.isFinite(n)&&(R=d(n),t.dataset.worldTarget=R.toFixed(4),!L&&!document.hidden&&Z(performance.now()))},yt=e=>{let n=e.detail;if(n!==`london`&&n!==`tokyo`)return;let r=(((n===`london`?25:120)-B+180)%360+360)%360-180;H=B+r,U=n===`london`?35:40,t.dataset.worldCity=n,X()&&(B=H,V=U),!L&&!document.hidden&&Z(performance.now())},bt=e=>{let t=e.detail;t&&Number.isFinite(t.dx)&&Number.isFinite(t.dy)&&(H-=t.dx*.32,U=d(U+t.dy*.25,-65,65),X()&&(B=H,V=U),!L&&!document.hidden&&Z(performance.now()))},xt=e=>{let t=e.detail;!t||!Number.isFinite(t.x)||!Number.isFinite(t.y)||t.x<0||t.y<0||t.x>N||t.y>P?mt():X()||(Ye.set(t.x-N*.5,t.y-P*.5),Ge=1)},St=()=>{Le=0,Re=0,ze=0,G=0,He=0,Ue=null,J=0,R=0,z=0,B=58,V=33,H=58,U=33,Be=``,W=-1,Xe=X(),Object.assign(q,l()),O.uMorph.value=0,O.uForming.value=0,O.uFlowTime.value=0,O.uRainTime.value=0,O.uWorld.value=0,K.forEach(e=>Object.assign(e,{value:0,velocity:0,target:0})),O.uScatter.value.set(0,0),O.uPulse.value=-100,mt(),Z(performance.now()),Q()},Ct=e=>{e.preventDefault(),wt()};function wt(){y||(Pe=!0,L=!1,b.setAnimationLoop(null),t.dataset.status=`fallback`,t.dataset.playing=`false`,w.style.opacity=`0`,h.onReady?.())}$.addEventListener(`pointermove`,pt,{passive:!0}),$.addEventListener(`pointerleave`,mt,{passive:!0}),$.addEventListener(`pointerdown`,gt,{passive:!0}),ut?.addEventListener(`scroll`,dt,{passive:!0}),$.addEventListener(`opening:pulse`,ht),$.addEventListener(`opening:replay`,St),t.addEventListener(`opening:pulse`,ht),t.addEventListener(`opening:replay`,St),t.addEventListener(`opening:reveal`,_t),t.addEventListener(`opening:world`,vt),t.addEventListener(`opening:world-city`,yt),t.addEventListener(`opening:world-rotate`,bt),t.addEventListener(`opening:world-pointer`,xt),w.addEventListener(`webglcontextlost`,Ct),document.addEventListener(`visibilitychange`,Q),at.addEventListener(`change`,Q);let Tt=new ResizeObserver(lt);Tt.observe(t);let Et=$.querySelector(`.opening-copy`);Et&&Tt.observe(Et),document.fonts.ready.then(()=>{y||(ft(),L||Z(performance.now()))});let Dt=new IntersectionObserver(([e])=>{Fe=e.isIntersecting&&e.intersectionRatio>.001,t.dataset.onscreen=String(Fe),Q()},{threshold:[0,.001]});Dt.observe(t);let Ot=new MutationObserver(Q);Ot.observe(document.documentElement,{attributes:!0,attributeFilter:[`data-paused`]}),lt(),Q(),t.dispatchEvent(new Event(`opening:ready`));async function kt(e){let n=new Image;return n.decoding=`async`,n.src=Oe(e),await n.decode(),y||(t.dataset.loadedAssets=String(Number(t.dataset.loadedAssets??0)+1)),n}async function At(){try{let[e,r,i]=await Promise.all([kt(`holmes-cinematic-v4.webp`),kt(`conan-cinematic-v4.webp`),kt(`conan-blink-v5.webp`).catch(()=>null)]);if(y||Pe)return;let o=document.createElement(`canvas`),s=o.getContext(`2d`,{willReadFrequently:!0});if(!s)throw Error(`No sampling context`);for(let[t,c]of[[e,2],[r,3]]){let e=c===2?100:80,r=c===2?150:120;o.width=e,o.height=r;let l=t=>(s.clearRect(0,0,e,r),s.drawImage(t,0,0,e,r),s.getImageData(0,0,e,r).data),u=l(t),f=c===3&&i?l(i):u,p=[],m=(t,n,i)=>{let a=(d(i,0,r-1)*e+d(n,0,e-1))*4;return(t[a]*.2126+t[a+1]*.7152+t[a+2]*.0722)/255*(t[a+3]/255)};for(let t=0;t<r;t++)for(let i=0;i<e;i++){let o=(t*e+i)*4,s=m(u,i,t);if(u[o+3]<72||s<.028)continue;let l=Math.min(1,Math.abs(m(u,i+1,t)-m(u,i-1,t))*3+Math.abs(m(u,i,t+1)-m(u,i,t-1))*3),d=(i+.5)/e,h=(t+.5)/r;p.push({x:d-.5,y:h-.5,brightness:s,closed:m(f,i,t),eye:c===3?a(d,h):0,edge:l,binding:n(d,h,c)})}Ae.push({kind:c,samples:p})}Ne(),t.dataset.portraits=`ready`,t.dataset.status=`ready`,h.onReady?.(),L||Z(performance.now())}catch(e){if(y)return;t.dataset.status=`partial`,t.dataset.assetError=e instanceof Error?e.message:`Character sampling failed`,h.onReady?.()}}return At(),()=>{y=!0,L=!1,b.setAnimationLoop(null),$.removeEventListener(`pointermove`,pt),$.removeEventListener(`pointerleave`,mt),$.removeEventListener(`pointerdown`,gt),ut?.removeEventListener(`scroll`,dt),$.removeEventListener(`opening:pulse`,ht),$.removeEventListener(`opening:replay`,St),t.removeEventListener(`opening:pulse`,ht),t.removeEventListener(`opening:replay`,St),t.removeEventListener(`opening:reveal`,_t),t.removeEventListener(`opening:world`,vt),t.removeEventListener(`opening:world-city`,yt),t.removeEventListener(`opening:world-rotate`,bt),t.removeEventListener(`opening:world-pointer`,xt),w.removeEventListener(`webglcontextlost`,Ct),document.removeEventListener(`visibilitychange`,Q),at.removeEventListener(`change`,Q),Tt.disconnect(),Dt.disconnect(),Ot.disconnect(),A.dispose(),j.dispose(),M.forEach(e=>{e.geometry.dispose(),e.material.dispose()}),le.dispose(),D.dispose(),k.clear(),b.dispose(),b.forceContextLoss(),w.remove(),t.dataset.playing=`false`}}export{ke as mountOpeningScene};