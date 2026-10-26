import {worldStageGLSL} from "./opening-world-motion";
import {formationFlightGLSL} from "./opening-character-motion";
/** The same glyph identities travel from rain, through Conan, into a reversible globe. */
export const openingVertexShader = `
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
${worldStageGLSL}
${formationFlightGLSL}
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
`;

export const openingFragmentShader = `
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
`;
