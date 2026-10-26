import{a as e,l as t,o as n,t as r}from"./use-reduced-motion-BOnByf-t.js";import{n as i,t as a}from"./arrow-up-right-Cq-YTmTP.js";import{h as o}from"./useButton-DpF5ofHR.js";import{D as s,b as c,v as l,y as u}from"./index-DgxjhrSm.js";import{A as d,B as f,D as p,E as m,M as ee,N as h,P as g,R as _,S as v,_ as te,a as ne,h as re,p as ie,v as y,x as b}from"./three.module-CXV02X8a.js";import{n as x,r as ae,t as oe}from"./webgl-utils-DZov_579.js";var S={name:`image`,size:24,node:[[`rect`,{width:`18`,height:`18`,x:`3`,y:`3`,rx:`2`,ry:`2`,key:`1m3agn`}],[`circle`,{cx:`9`,cy:`9`,r:`2`,key:`af1f0g`}],[`path`,{d:`m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21`,key:`1xmnt7`}]]};S.node;var C=i(S),w={name:`move-horizontal`,size:24,node:[[`path`,{d:`m18 8 4 4-4 4`,key:`1ak13k`}],[`path`,{d:`M2 12h20`,key:`9i4pu4`}],[`path`,{d:`m6 8-4 4 4 4`,key:`15zrgr`}]]};w.node;var T=i(w),E={name:`scan-eye`,size:24,node:[[`path`,{d:`M3 7V5a2 2 0 0 1 2-2h2`,key:`aa7l1z`}],[`path`,{d:`M17 3h2a2 2 0 0 1 2 2v2`,key:`4qcy5o`}],[`path`,{d:`M21 17v2a2 2 0 0 1-2 2h-2`,key:`6vwrx8`}],[`path`,{d:`M7 21H5a2 2 0 0 1-2-2v-2`,key:`ioqczr`}],[`circle`,{cx:`12`,cy:`12`,r:`1`,key:`41hilf`}],[`path`,{d:`M18.944 12.33a1 1 0 0 0 0-.66 7.5 7.5 0 0 0-13.888 0 1 1 0 0 0 0 .66 7.5 7.5 0 0 0 13.888 0`,key:`11ak4c`}]]};E.node;var D=i(E),O=t(n(),1),k=e(),A=`
  varying vec2 vUv;
  uniform float uBend;
  void main(){
    vUv=uv;vec3 p=position;
    p.z+=sin(uv.x*3.14159)*uBend;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }
`,se=`
  varying vec2 vUv;
  uniform sampler2D uImage;
  uniform vec2 uImageSize;
  uniform vec2 uPointer;
  uniform float uTime,uHover,uOpacity,uReflection,uReveal,uInspect;
  // Dual displaced UVs adapted from robin-dela/hover-effect (MIT).
  // No extra renderer, GSAP runtime or displacement image is loaded.
  mat2 getRotM(float angle){float s=sin(angle),c=cos(angle);return mat2(c,-s,s,c);}
  // Dither ordering adapted from React Bits PixelTransition; license in public notices.
  float bayer(vec2 cell) {
    mat4 order=mat4(0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    return order[int(mod(cell.y,4.))][int(mod(cell.x,4.))]/16.;
  }
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  void main(){
    vec2 uv=vUv;
    float imageRatio=uImageSize.x/uImageSize.y;
    float cardRatio=1.5;
    if(imageRatio>cardRatio)uv.x=(uv.x-.5)*cardRatio/imageRatio+.5;
    else uv.y=(uv.y-.5)*imageRatio/cardRatio+.5;
    vec2 delta=vUv-uPointer;
    float lens=exp(-dot(delta,delta)*18.)*uHover;
    uv-=delta*lens*.1;
    float shift=lens*.005;
    vec3 color=vec3(texture2D(uImage,uv+vec2(shift,0.)).r,texture2D(uImage,uv).g,texture2D(uImage,uv-vec2(shift,0.)).b);
    if(uInspect>.001){
      vec2 dispVec=vec2(sin(uv.y*31.+uv.x*9.),cos(uv.x*26.-uv.y*8.))*.009;
      vec2 displacedA=uv+getRotM(.785398)*dispVec*uInspect;
      vec2 displacedB=uv+getRotM(-2.356194)*dispVec*(1.-uInspect);
      vec3 original=texture2D(uImage,displacedA).rgb;
      vec3 sampled=texture2D(uImage,displacedB).rgb;
      vec2 pixel=1.8/uImageSize;
      vec3 dx=texture2D(uImage,displacedB+vec2(pixel.x,0.)).rgb-texture2D(uImage,displacedB-vec2(pixel.x,0.)).rgb;
      vec3 dy=texture2D(uImage,displacedB+vec2(0.,pixel.y)).rgb-texture2D(uImage,displacedB-vec2(0.,pixel.y)).rgb;
      float edge=clamp(length(dx)+length(dy),0.,1.);
      float silver=dot(sampled,vec3(.299,.587,.114));
      vec3 blueprint=vec3(.002,.010,.020)+vec3(.12,.32,.46)*(1.-silver)*.09+edge*vec3(.24,.55,.72)*.65;
      vec2 grid=abs(fract(vUv*vec2(30.,20.))-.5);
      blueprint+=vec3(.07,.15,.19)*smoothstep(.47,.50,max(grid.x,grid.y))*.45;
      float radius=length((vUv-uPointer)*vec2(1.5,1.));
      float aperture=(1.-smoothstep(.20,.215,radius))*uHover;
      vec2 magnified=clamp(uPointer+(uv-uPointer)*.78,vec2(.001),vec2(.999));
      blueprint=mix(blueprint,texture2D(uImage,magnified).rgb,aperture);
      blueprint+=vec3(.68,.88,.91)*exp(-pow((radius-.214)/.0025,2.))*uHover*.65;
      color=mix(original,blueprint,uInspect);
    }
    float gloss=pow(max(0.,1.-abs(vUv.x+vUv.y*.45-(.7+sin(uTime*.2)*.6))*4.),7.);
    color+=vec3(.8,.7,.5)*gloss*(.025+uHover*.09);
    if(uReveal<.999) {
      vec2 cells=vec2(54.,36.),cell=floor(vUv*cells);
      float radial=length((vUv-vec2(.46,.52))*vec2(1.,.8))/ .73;
      float delay=radial*.67+bayer(cell)*.20+hash(cell)*.08;
      float progress=uReveal*1.25-.08;
      float developed=smoothstep(delay-.04,delay+.13,progress);
      float silver=dot(color,vec3(.299,.587,.114));
      vec3 plate=vec3(silver)*vec3(.29,.41,.52);
      vec2 local=fract(vUv*cells);
      float grid=(1.-smoothstep(.015,.055,min(min(local.x,1.-local.x),min(local.y,1.-local.y))));
      plate+=vec3(.16,.44,.64)*grid*.22;
      color=mix(plate,color,developed);
      float frontier=exp(-pow((delay-progress)/.032,2.))*(1.-smoothstep(.86,1.,uReveal));
      color+=vec3(.20,.56,.77)*frontier*.38;
    }
    float edge=smoothstep(0.,.012,min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y)));
    float alpha=uOpacity*edge;
    if(uReflection>.5){alpha*=pow(vUv.y,2.)*.13;color*=.5;}
    gl_FragColor=vec4(color,alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;function j({onOpen:e,paused:t=!1,developmentKey:n=0}){let i=(0,O.useRef)(null),[S,w]=(0,O.useState)(0),[E,j]=(0,O.useState)(!1),[M,N]=(0,O.useState)(!1),[P,F]=(0,O.useState)(!1),I=r(),L=(0,O.useRef)({onOpen:e,paused:t||!!I,inspection:P});L.current={onOpen:e,paused:t||!!I,inspection:P};let R=(0,O.useRef)(null);return(0,O.useEffect)(()=>{let e=i.current;if(!e)return;let t;try{t=oe(e)}catch{N(!0);return}let n=new h,r=new m(40,1,.1,40);r.position.set(0,.1,4.9),r.lookAt(0,0,0);let a=new p(4.35,2.9,48,12),o=new _,s=[],l=!0,u=!0,S=0;c.forEach((r,i)=>{let u={uImage:{value:null},uImageSize:{value:new f(1.5,1)},uPointer:{value:new f(.5,.5)},uTime:{value:0},uHover:{value:0},uOpacity:{value:1},uReflection:{value:0},uBend:{value:0},uReveal:{value:1},uInspect:{value:0}},d=new g({uniforms:u,vertexShader:A,fragmentShader:se,transparent:!0,side:2}),p=new v(a,d);p.userData.index=i;let m=new re;m.add(p),n.add(m);let h=d.clone();h.uniforms.uReflection.value=1;let _=new v(a,h);_.position.y=-3.01,_.rotation.x=Math.PI,m.add(_);let b=new te({color:13812381,transparent:!0,opacity:.25}),x=new y(new ie(new ne(4.38,2.93,.025)),b);m.add(x),s.push({group:m,image:p,mat:d,reflection:h,line:b}),o.load(`./media/${r.image}`,n=>{l?(n.colorSpace=ee,n.anisotropy=Math.min(4,t.capabilities.getMaxAnisotropy()),d.uniforms.uImage.value?.dispose(),h.uniforms.uImage.value?.dispose(),d.uniforms.uImage.value=n,h.uniforms.uImage.value=n,d.uniforms.uImageSize.value.set(n.image.width,n.image.height),h.uniforms.uImageSize.value.copy(d.uniforms.uImageSize.value),S++,S===c.length&&(V=performance.now()+120,j(!0),e.dataset.loaded=String(S)),L.current.paused&&q(0)):n.dispose()},void 0,()=>{l&&N(!0)})});let C=new d,T=new f,E=0,D=0,O=!1,k=0,M=0,P=0,F=-1,I=0,z=0,B=0,V=-1/0,ce=e=>b.euclideanModulo(e,3),le=e=>{let t=Math.round(E/3)*3;E=[t+e-3,t+e,t+e+3].reduce((e,t)=>Math.abs(t-E)<Math.abs(e-E)?t:e),L.current.paused&&(D=E,q(0))},H=t=>{let n=e.getBoundingClientRect();return T.set((t.clientX-n.left)/n.width*2-1,-(t.clientY-n.top)/n.height*2+1),C.setFromCamera(T,r),C.intersectObjects(s.map(e=>e.image),!1)[0]},U=t=>{t.button===0&&(O=!0,k=t.clientX,M=t.clientY,P=E,e.setPointerCapture(t.pointerId),e.dataset.dragging=`true`)},W=t=>{O&&(E=P-(t.clientX-k)/Math.max(180,e.clientWidth*.38));let n=H(t);F=n?n.object.userData.index:-1,n?.uv&&s[F].mat.uniforms.uPointer.value.copy(n.uv),L.current.paused&&(D=E,q(0))},G=t=>{if(!O)return;let n=Math.hypot(t.clientX-k,t.clientY-M);if(O=!1,e.dataset.dragging=`false`,e.hasPointerCapture(t.pointerId)&&e.releasePointerCapture(t.pointerId),E=Math.round(E),w(ce(E)),n<7){let e=H(t);e&&L.current.onOpen(e.object.userData.index)}L.current.paused&&q(0)},K=()=>{O=!1,F=-1,E=Math.round(E),e.dataset.dragging=`false`};function q(i){if(!l)return;let a=L.current.paused,o=a?1:Math.min(i,.04),c=a?1:Math.max(0,Math.min(1,(performance.now()-V)/1900));a||(I+=o);let u=+!!L.current.inspection,d=a?u:x(s[0].mat.uniforms.uInspect.value,u,5,o),f=(e.clientWidth<500?5.6:4.4)-d*.15;r.position.z=a?f:x(r.position.z,f,5,o);let p=D;D=a?E:x(D,E,7,o);let m=Math.min(.7,Math.abs(D-p)*12);s.forEach((e,t)=>{let n=b.euclideanModulo(t-D+1.5,3)-1.5;e.group.position.set(n*3.5,Math.abs(n)*-.12,-Math.abs(n)*1.8),e.group.rotation.y=-n*.31,e.group.rotation.z=-n*.035;let r=1-b.smoothstep(Math.abs(n),.65,1.5)*.75;e.mat.uniforms.uOpacity.value=r,e.reflection.uniforms.uOpacity.value=r,e.line.opacity=r*.22,e.mat.uniforms.uTime.value=I,e.mat.uniforms.uInspect.value=d,e.reflection.uniforms.uInspect.value=d,e.mat.uniforms.uReveal.value=c,e.reflection.uniforms.uReveal.value=c,e.mat.uniforms.uBend.value=x(e.mat.uniforms.uBend.value,m*(O?1.2:.5),8,o),e.mat.uniforms.uHover.value=x(e.mat.uniforms.uHover.value,+(F===t),6,o)}),t.render(n,r),(c<1||e.dataset.reveal!==`1.000`)&&(e.dataset.reveal=c.toFixed(3)),e.dataset.inspection=d.toFixed(3),(B++%15==0||a)&&(e.dataset.angle=D.toFixed(3),e.dataset.frame=String(B),e.dataset.geometries=String(t.info.memory.geometries),e.dataset.reveal=c.toFixed(3))}let ue=e=>{let t=z?(e-z)/1e3:1/60;z=e,q(t)},J=()=>{z=0,L.current.paused||document.hidden||!u?(t.setAnimationLoop(null),q(0)):t.setAnimationLoop(ue)},Y=()=>{t.setSize(e.clientWidth,e.clientHeight),r.aspect=e.clientWidth/e.clientHeight,r.position.z=e.clientWidth<500?5.6:4.4,r.updateProjectionMatrix(),q(0)};R.current={select:le,refresh:J,develop:()=>{V=performance.now(),q(0)}};let X=new ResizeObserver(Y);X.observe(e),Y(),J();let Z=new IntersectionObserver(([e])=>{u=e.isIntersecting,J()});Z.observe(e);let Q=()=>{O||(F=-1)};e.addEventListener(`pointerdown`,U),e.addEventListener(`pointermove`,W),e.addEventListener(`pointerup`,G),e.addEventListener(`pointercancel`,K),e.addEventListener(`pointerleave`,Q);let $=e=>{e.preventDefault(),t.setAnimationLoop(null),l&&N(!0)};return t.domElement.addEventListener(`webglcontextlost`,$),document.addEventListener(`visibilitychange`,J),()=>{l=!1,R.current=null,t.setAnimationLoop(null),X.disconnect(),Z.disconnect(),e.removeEventListener(`pointerdown`,U),e.removeEventListener(`pointermove`,W),e.removeEventListener(`pointerup`,G),e.removeEventListener(`pointercancel`,K),e.removeEventListener(`pointerleave`,Q),t.domElement.removeEventListener(`webglcontextlost`,$),document.removeEventListener(`visibilitychange`,J),ae(n),t.dispose(),t.forceContextLoss(),t.domElement.remove()}},[]),(0,O.useEffect)(()=>{R.current?.select(S)},[S]),(0,O.useEffect)(()=>{R.current?.refresh()},[t,I,P]),(0,O.useEffect)(()=>{n>0&&R.current?.develop()},[n]),(0,k.jsxs)(`div`,{className:`evidence-gallery ${P?`is-inspecting`:``}`,children:[(0,k.jsxs)(`div`,{className:`gallery-space-label`,children:[(0,k.jsx)(`span`,{className:`micro-label`,children:`SELECTED WORKS / SPATIAL ARCHIVE`}),(0,k.jsxs)(l,{className:`inspection-switch`,value:P?`inspect`:`original`,onValueChange:e=>F(e===`inspect`),"aria-label":`作品观察模式`,children:[(0,k.jsxs)(u,{value:`original`,children:[(0,k.jsx)(C,{size:11}),`原作`]}),(0,k.jsxs)(u,{value:`inspect`,children:[(0,k.jsx)(D,{size:12}),`取证镜`]})]}),(0,k.jsxs)(`span`,{children:[(0,k.jsx)(T,{size:12}),` 拖动探索`]})]}),(0,k.jsxs)(`div`,{ref:i,className:`evidence-viewport ${E?`is-ready`:``} ${M?`is-fallback`:``}`,tabIndex:0,role:`group`,"aria-label":`三维作品画廊，可使用左右方向键切换`,onKeyDown:t=>{t.key===`ArrowRight`&&(t.preventDefault(),w((S+1)%3)),t.key===`ArrowLeft`&&(t.preventDefault(),w((S+2)%3)),(t.key===`Enter`||t.key===`Return`||t.code===`Enter`||t.code===`NumpadEnter`)&&(t.preventDefault(),e(S))},children:[(!E||M)&&(0,k.jsx)(`div`,{className:`evidence-fallback`,children:c.map((t,n)=>(0,k.jsx)(`button`,{onClick:()=>e(n),"aria-label":`查看${t.title}`,children:(0,k.jsx)(`img`,{src:`./media/${t.image}`,alt:t.title})},t.id))}),(0,k.jsx)(`span`,{className:`gallery-floor-line`,"aria-hidden":`true`}),(0,k.jsxs)(`div`,{className:`darkroom-viewfinder`,"aria-hidden":`true`,children:[(0,k.jsx)(`i`,{}),(0,k.jsx)(`i`,{}),(0,k.jsx)(`i`,{}),(0,k.jsx)(`i`,{}),(0,k.jsx)(`span`,{children:P?`FORENSIC OPTICS / 4869`:`EXHIBIT / `+c[S].id})]})]}),(0,k.jsxs)(`div`,{className:`evidence-caption`,children:[(0,k.jsxs)(`div`,{className:`evidence-number`,children:[(0,k.jsx)(`span`,{children:c[S].id}),(0,k.jsx)(`i`,{}),`03`]}),(0,k.jsxs)(`div`,{className:`evidence-caption-copy`,children:[(0,k.jsx)(`span`,{className:`micro-label`,children:c[S].english}),(0,k.jsx)(`h2`,{children:c[S].title})]}),(0,k.jsxs)(`div`,{className:`evidence-controls`,children:[(0,k.jsx)(`button`,{"aria-label":`上一幅空间作品`,onClick:()=>w((S+2)%3),children:(0,k.jsx)(s,{size:18})}),(0,k.jsx)(`button`,{"aria-label":`下一幅空间作品`,onClick:()=>w((S+1)%3),children:(0,k.jsx)(o,{size:18})})]}),(0,k.jsx)(`button`,{className:`evidence-open`,onClick:()=>e(S),"aria-label":`查看作品：${c[S].title}`,children:(0,k.jsx)(a,{size:21})})]}),(0,k.jsx)(`div`,{className:`evidence-progress evidence-filmstrip`,"aria-label":`作品底片目录`,children:c.map((e,t)=>(0,k.jsxs)(`button`,{className:t===S?`active`:``,"aria-label":`切换至${e.title}`,"aria-pressed":t===S,onClick:()=>w(t),children:[(0,k.jsx)(`img`,{src:`./media/${e.image}`,alt:``,loading:`lazy`}),(0,k.jsxs)(`span`,{children:[(0,k.jsx)(`i`,{children:e.id}),e.english]})]},e.id))})]})}export{j as default};