import * as THREE from "three";
import {worldStageGLSL} from "./opening-world-motion";

type GlobeSurfaceUniforms = {
  uViewport: {value: THREE.Vector2};
  uWorldLayout: {value: THREE.Vector3};
  uWorldRotation?: {value: THREE.Vector2};
  uTime?: {value: number};
  uWorld: {value: number};
  uExit: {value: number};
};

/** Textured Earth and independent cloud optics in the rain renderer's one quad. */
export function createOpeningGlobeSurface(shared: GlobeSurfaceUniforms, onTextureReady?: () => void) {
  let disposed=false,loaded=0,failed=0;
  const textures=new Set<THREE.Texture>();
  const placeholder=(rgba:readonly number[]):THREE.Texture=>{
    const texture=new THREE.DataTexture(new Uint8Array(rgba),1,1,THREE.RGBAFormat);
    texture.needsUpdate=true;
    textures.add(texture);
    return texture;
  };
  const midnight=placeholder([13,28,43,255]),black=placeholder([0,0,0,255]);
  const uniforms={
    ...shared,
    uWorldRotation:shared.uWorldRotation ?? {value:new THREE.Vector2()},
    uTime:shared.uTime ?? {value:0},
    uDayMap:{value:midnight},uNightMap:{value:black},uCloudMap:{value:black},
    uDayReady:{value:0},uNightReady:{value:0},uCloudReady:{value:0},
  };
  const geometry=new THREE.PlaneGeometry(2.12,2.12);
  const material=new THREE.ShaderMaterial({
    transparent:true,
    side:THREE.DoubleSide,
    forceSinglePass:true,
    depthTest:false,
    depthWrite:false,
    uniforms,
    vertexShader:`
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
      }`,
    fragmentShader:`
      uniform sampler2D uDayMap,uNightMap,uCloudMap;
      uniform vec2 uWorldRotation;
      uniform float uWorld,uExit,uTime,uDayReady,uNightReady,uCloudReady;
      varying vec2 vSphere;
      const float PI=3.14159265359;
      const float TAU=6.28318530718;
      ${worldStageGLSL}
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
      }`,
  });
  const object=new THREE.Mesh(geometry,material);
  object.frustumCulled=false;
  object.renderOrder=-2;
  object.visible=false;
  const loader=new THREE.TextureLoader();
  for(const [name,sampler,ready] of [
    ["day",uniforms.uDayMap,uniforms.uDayReady],
    ["night",uniforms.uNightMap,uniforms.uNightReady],
    ["clouds",uniforms.uCloudMap,uniforms.uCloudReady],
  ] as const){
    const pending=loader.load(`${import.meta.env.BASE_URL}media/earth-v21/${name}.webp`,texture=>{
      if(disposed){texture.dispose();return;}
      texture.flipY=false;
      texture.wrapS=THREE.RepeatWrapping;
      texture.wrapT=THREE.ClampToEdgeWrapping;
      texture.colorSpace=THREE.NoColorSpace;
      // atan UVs jump at the antimeridian. Implicit mip derivatives there would
      // sample a dark whole-map average through the bright polar terrain.
      texture.minFilter=THREE.LinearFilter;
      texture.generateMipmaps=false;
      texture.magFilter=THREE.LinearFilter;
      texture.anisotropy=2;
      sampler.value=texture;
      ready.value=1;
      loaded++;
      onTextureReady?.();
    },undefined,()=>{
      if(disposed)return;
      failed++;
      onTextureReady?.();
    });
    textures.add(pending);
  }
  return {
    object,
    get status(){return loaded===3?"ready":failed>0?(loaded>0?"partial":"fallback"):"loading";},
    update(progress:number){object.visible=progress>.40;},
    dispose(){disposed=true;geometry.dispose();material.dispose();textures.forEach(texture=>texture.dispose());textures.clear();},
  };
}
