import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const W = 1080, H = 1920, BPM = 96, BEAT = 60 / BPM;
const DUR = 30;
const $ = id => document.getElementById(id);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const eOut = k => 1 - Math.pow(1 - k, 3);
const eIn = k => k * k * k;
const eInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const eBack = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const eElastic = k => k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -10 * k) * Math.sin((k * 10 - .75) * (2 * Math.PI) / 3) + 1;
const eBounce = k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + .75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + .9375; return n * (k -= 2.625 / d) * k + .984375; };
const win = (t, a, b, fi = .2, fo = .2) => Math.min(seg(t, a, a + fi), 1 - seg(t, b - fo, b));
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ---------- textures ----------
const loader = new THREE.TextureLoader();
const tex = {};
await Promise.all(['sala_mesas', 'sala_clientes', 'sala_mesas_blur', 'panetone', 'panetone_blur', 'doces', 'arvores', 'buffet1', 'buffet2', 'buffet2_blur'].map(n => new Promise(r => loader.load(`real_assets/${n}.jpg`, t => {
  t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.colorSpace = THREE.NoColorSpace;
  tex[n] = { t, asp: t.image.width / t.image.height }; r();
}))));
const dummy = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); dummy.needsUpdate = true;

// ---------- background shader (photos + GLSL transitions) ----------
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uA,uB; uniform float uAspA,uAspB; uniform vec4 uKA,uKB;
uniform float uDA,uDB,uPA,uPB,uP,uType,uTime,uFlash,uSteam,uLeak,uCap,uCapY; uniform vec2 uShake; uniform vec3 uFlare;
const float SA=1080./1920.;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
vec3 proc(vec2 uv){
  float d=length(vec2(uv.x-.5,(uv.y-.58)*1.5));
  vec3 c=mix(vec3(.50,.08,.14),vec3(.10,.01,.03),smoothstep(0.,.85,d));
  c+=vec3(.12,.04,.02)*fbm(uv*3.+vec2(uTime*.05,-uTime*.08));
  return c;
}
vec3 img(sampler2D t,float asp,vec4 k,float dim,float pr,vec2 uv){
  if(pr>.5) return proc(uv);
  vec2 c=uv-.5; if(asp>SA) c.x*=SA/asp; else c.y*=asp/SA;
  c/=k.x; c+=k.yz; vec2 u=c+.5;
  vec3 col;
  if(k.w>.3){ float o=.006*k.w;
    col=(textureLod(t,u+vec2(o,o),k.w).rgb+textureLod(t,u+vec2(-o,o),k.w).rgb+textureLod(t,u+vec2(o,-o),k.w).rgb+textureLod(t,u-vec2(o,o),k.w).rgb)*.25;
  } else col=texture2D(t,u).rgb;
  col=pow(col,vec3(1.06))*vec3(1.05,.97,.9);
  return col*dim;
}
#define IA(u) img(uA,uAspA,uKA,uDA,uPA,u)
#define IB(u) img(uB,uAspB,uKB,uDB,uPB,u)
void main(){
  vec2 uv=vUv+uShake;
  vec3 A=IA(uv); vec3 col=A; float p=uP;
  if(p>0.001){
    float w=sin(p*3.14159);
    if(uType<.5){ // golden burn dissolve
      vec3 B=IB(uv);
      float n=fbm(uv*vec2(4.,7.)+3.1); float e=p*1.3-.15;
      col=mix(B,A,smoothstep(e-.012,e+.012,n));
      float edge=1.-smoothstep(0.,.045,abs(n-e));
      col+=vec3(1.,.6,.18)*edge*2.6*w + vec3(1.,.9,.6)*pow(edge,6.)*w;
    } else if(uType<1.5){ // liquid ripple
      vec2 d=uv-.5; float r=length(d*vec2(1.,1./SA));
      vec2 o=normalize(d+1e-4)*sin(r*40.-p*18.)*.03*w + vec2(sin(uv.y*16.+p*9.),cos(uv.x*12.+p*7.))*.015*w;
      col=mix(IA(uv+o),IB(uv-o),smoothstep(.3,.7,p))+vec3(1.,.8,.5)*w*.07;
    } else if(uType<2.5){ // radial zoom blur
      vec2 d=uv-.5; vec3 a=vec3(0),b=vec3(0);
      for(int i=0;i<10;i++){float f=float(i)/9.; a+=IA(.5+d*(1.-p*.45*f)); b+=IB(.5+d*(1.+(1.-p)*.45*f));}
      col=mix(a/10.,b/10.,smoothstep(.35,.65,p))*(1.+w*.6);
    } else { // star / snowflake wipe
      vec3 B=IB(uv);
      vec2 d=(uv-.5)*vec2(1.,1./SA); float r=length(d); float a=atan(d.y,d.x)+p*2.;
      float f= uType<3.5 ? r*(1.+.45*cos(5.*a)) : r*(1.+.22*cos(6.*a)+.10*cos(18.*a));
      float R=p*2.3; col=mix(B,A,smoothstep(R-.015,R+.015,f));
      float edge=1.-smoothstep(0.,.05,abs(f-R)); col+=vec3(1.,.75,.3)*edge*2.*w;
    }
  }
  col*=1.-uCap*.66*exp(-pow((uv.y-uCapY)/.17,2.));
  if(uSteam>0.){
    float s=fbm(vec2(uv.x*5.,uv.y*2.5-uTime*.6))*fbm(vec2(uv.x*3.+1.7,uv.y*4.-uTime*1.0));
    col+=vec3(1.,.96,.9)*smoothstep(.20,.42,s)*uSteam*.45*smoothstep(1.,.45,uv.y)*smoothstep(.1,.4,uv.y);
  }
  if(uFlare.z>0.){
    vec2 d=(uv-uFlare.xy)*vec2(1.,1./SA); float l=length(d);
    col+=vec3(1.,.78,.4)*(exp(-l*7.)*.9+exp(-abs(d.y)*110.)*exp(-abs(d.x)*2.2)*.8+smoothstep(.015,.0,abs(l-.28))*.10)*uFlare.z;
  }
  col+=vec3(1.,.5,.18)*uLeak*smoothstep(.9,0.,length((uv-vec2(.15+.7*fract(uTime*.13),.3))*vec2(1.,.7)));
  vec2 v=uv-.5; col*=1.-dot(v*vec2(1.2,.85),v*vec2(1.2,.85))*1.15;
  col=mix(col,vec3(1.,.96,.88),uFlash);
  col+=(hash(uv*vec2(1080.,1920.)+fract(uTime*7.)*100.)-.5)*.045;
  gl_FragColor=vec4(col,1.);
}`;
const U = {
  uA: { value: dummy }, uB: { value: dummy }, uAspA: { value: 1 }, uAspB: { value: 1 },
  uKA: { value: new THREE.Vector4(1, 0, 0, 0) }, uKB: { value: new THREE.Vector4(1, 0, 0, 0) },
  uDA: { value: 1 }, uDB: { value: 1 }, uPA: { value: 0 }, uPB: { value: 0 }, uP: { value: 0 }, uType: { value: 0 },
  uTime: { value: 0 }, uShake: { value: new THREE.Vector2() }, uFlash: { value: 0 }, uFlare: { value: new THREE.Vector3(.5, .67, 0) },
  uSteam: { value: 0 }, uLeak: { value: 0 }, uCap: { value: 0 }, uCapY: { value: .7 }
};
const bgScene = new THREE.Scene();
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: U, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`, fragmentShader: FRAG
})));

// ---------- particle layers (pixel-space, y up) ----------
const fxScene = new THREE.Scene();
const pxCam = new THREE.OrthographicCamera(0, W, H, 0, -1, 1);
function pointsGeo(n, seed, extra) {
  const R = rng(seed); const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const a = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) a[i] = R();
  if (extra) extra(a, n);
  g.setAttribute('aS', new THREE.BufferAttribute(a, 4)); return g;
}
const VHEAD = `attribute vec4 aS; uniform float uTime,uInt; varying float vA; varying vec3 vC;
vec4 px(vec2 p){return vec4(p/vec2(1080.,1920.)*2.-1.,0.,1.);}`;
// snow + gold dust
const snowU = { uTime: { value: 0 }, uInt: { value: 1 } };
fxScene.add(new THREE.Points(pointsGeo(130, 7), new THREE.ShaderMaterial({
  uniforms: snowU, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: VHEAD + `void main(){float t=uTime;vec2 p;
    p.x=aS.x*1080.+sin(t*.9+aS.w*6.28)*28.; p.y=1920.-mod(aS.y*2050.+t*(45.+aS.z*90.),2050.)+60.;
    vA=(.35+.55*aS.w)*(.55+.45*sin(t*5.+aS.x*40.))*uInt; vC=aS.w>.55?vec3(1.,.82,.5):vec3(1.,.97,.92);
    gl_PointSize=6.+aS.z*14.; gl_Position=px(p);}`,
  fragmentShader: `varying float vA; varying vec3 vC; void main(){float d=length(gl_PointCoord-.5)*2.; float a=exp(-d*d*5.)+smoothstep(.25,0.,d)*.6; gl_FragColor=vec4(vC,a*vA);}`
})));
// bokeh
const bokU = { uTime: { value: 0 }, uInt: { value: 1 } };
fxScene.add(new THREE.Points(pointsGeo(16, 11), new THREE.ShaderMaterial({
  uniforms: bokU, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: VHEAD + `void main(){float t=uTime;vec2 p;
    p.x=aS.x*1080.+sin(t*.3+aS.w*6.)*40.; p.y=mod(aS.y*2200.+t*(14.+aS.z*24.),2200.)-140.;
    vA=(.10+.13*aS.w)*uInt; vC=mix(vec3(1.,.72,.35),vec3(1.,.35,.3),step(.72,aS.w));
    gl_PointSize=90.+aS.z*170.; gl_Position=px(p);}`,
  fragmentShader: `varying float vA; varying vec3 vC; void main(){float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,.86,d)*(.55+.45*smoothstep(.55,.97,d)); gl_FragColor=vec4(vC,a*vA);}`
})));
// bursts (gold sparks / sugar / confetti)
const burU = { uTime: { value: 0 }, uInt: { value: 1 }, uT0: { value: -9 }, uO: { value: new THREE.Vector2(540, 960) }, uK: { value: 0 } };
fxScene.add(new THREE.Points(pointsGeo(220, 23), new THREE.ShaderMaterial({
  uniforms: burU, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: VHEAD + `uniform float uT0,uK; uniform vec2 uO; void main(){float dt=uTime-uT0; vec2 p; float life=1.8;
    if(dt<0.||dt>life){gl_PointSize=0.;gl_Position=vec4(3.,3.,3.,1.);vA=0.;return;}
    if(uK<.5){ float an=aS.x*6.2832; float sp=350.+aS.y*1100.; p=uO+vec2(cos(an),sin(an))*sp*(1.-exp(-dt*3.))/3.+vec2(0.,-260.*dt*dt);
      vC=mix(vec3(1.,.75,.3),vec3(1.,.95,.8),aS.w); gl_PointSize=5.+aS.z*13.; }
    else { p.x=uO.x+(aS.x-.5)*1000.+sin(dt*3.+aS.w*6.)*20.; p.y=uO.y+aS.y*260.-dt*(220.+aS.z*320.);
      vC=vec3(1.,.98,.95); gl_PointSize=4.+aS.z*9.; }
    vA=(1.-dt/life)*(.6+.4*sin(dt*25.+aS.w*30.))*uInt; gl_Position=px(p);}`,
  fragmentShader: `varying float vA; varying vec3 vC; void main(){float d=length(gl_PointCoord-.5)*2.; float a=exp(-d*d*4.)+smoothstep(.3,0.,d); gl_FragColor=vec4(vC,a*vA);}`
})));
// christmas light strand: wire (dense dark points) + blinking bulbs
const strandU = { uTime: { value: 0 }, uInt: { value: 0 }, uReveal: { value: 0 }, uY: { value: 1600 }, uSag: { value: 110 } };
const STRAND = `uniform float uReveal,uY,uSag; vec2 curve(float s){float f=fract(s*2.5); return vec2(-30.+s*1140., uY-uSag*sin(f*3.14159));}`;
const wireGeo = pointsGeo(700, 3, (a, n) => { for (let i = 0; i < n; i++) a[i * 4] = i / (n - 1); });
fxScene.add(new THREE.Points(wireGeo, new THREE.ShaderMaterial({
  uniforms: strandU, transparent: true, depthTest: false,
  vertexShader: VHEAD + STRAND + `void main(){ vA=step(aS.x,uReveal)*uInt; gl_PointSize=5.; gl_Position=px(curve(aS.x));}`,
  fragmentShader: `varying float vA; void main(){ if(vA<.01) discard; gl_FragColor=vec4(.10,.16,.07,vA);}`
})));
const bulbGeo = pointsGeo(26, 5, (a, n) => { for (let i = 0; i < n; i++) { a[i * 4] = (i + .5) / n; a[i * 4 + 1] = i % 4; } });
fxScene.add(new THREE.Points(bulbGeo, new THREE.ShaderMaterial({
  uniforms: strandU, transparent: true, depthTest: false, blending: THREE.AdditiveBlending,
  vertexShader: VHEAD + STRAND + `void main(){ float on=step(aS.x,uReveal);
    float b=.35+.65*pow(.5+.5*sin(uTime*6.5-aS.x*38.),2.);
    vC= aS.y<.5?vec3(1.,.18,.15): aS.y<1.5?vec3(1.,.78,.3): aS.y<2.5?vec3(.35,1.,.45):vec3(1.,.92,.75);
    vA=on*b*uInt; gl_PointSize=64.; gl_Position=px(curve(aS.x)+vec2(0.,-16.));}`,
  fragmentShader: `varying float vA; varying vec3 vC; void main(){float d=length(gl_PointCoord-.5)*2.; float g=exp(-d*d*7.)*.9; float c=smoothstep(.22,.12,d);
    gl_FragColor=vec4(vC*g+vec3(1.)*c*.7,clamp(vA*(g+c),0.,1.));}`
})));

// ---------- 3D gold star ----------
const starScene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(30, W / H, .1, 100); persp.position.set(0, 0, 10);
const pmrem = new THREE.PMREMGenerator(renderer);
starScene.environment = pmrem.fromScene(new RoomEnvironment(renderer), .04).texture;
const shape = new THREE.Shape();
for (let i = 0; i < 10; i++) { const r = i % 2 ? .44 : 1, a = Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
shape.closePath();
const starGeo = new THREE.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: true, bevelThickness: .12, bevelSize: .08, bevelSegments: 4 });
starGeo.center();
const star = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: 0xf2c25e, metalness: 1, roughness: .22, emissive: 0x3a2000 }));
starScene.add(star);
const dl = new THREE.DirectionalLight(0xffe0b0, 3); dl.position.set(3, 4, 6); starScene.add(dl);
const pl = new THREE.PointLight(0xff9050, 30, 20); pl.position.set(-3, -2, 4); starScene.add(pl);

// ---------- background timeline (real photos) ----------
const SEG = [
  { a: 0, b: 5, img: 'sala_mesas', z: [1.0, 1.04], x: [-.27, .27], y: [0, 0], lod: 0, dim: .58, cap: [.36, .85] },
  { a: 5, b: 7.5, img: 'sala_clientes', z: [1.04, 1.09], x: [.08, .22], y: [0, 0], lod: 0, dim: .5, cap: [.6, .7] },
  { a: 7.5, b: 9.375, img: 'panetone', z: [1.0, 1.08], x: [.04, .07], y: [.02, 0], lod: 0, dim: .95, cap: [.72, .85] },
  { a: 9.375, b: 11.25, img: 'doces', z: [1.1, 1.0], x: [0, 0], y: [-.02, .02], lod: 0, dim: .92, cap: [.72, .85] },
  { a: 11.25, b: 13.75, img: 'arvores', z: [1.12, 1.0], x: [.02, 0], y: [0, .02], lod: 0, dim: .92, cap: [.72, .85] },
  { a: 13.75, b: 17.5, img: 'buffet1', z: [1.0, 1.12], x: [-.04, .04], y: [0, 0], lod: 0, dim: .9, cap: [.68, .75] },
  { a: 17.5, b: 21.25, img: 'buffet2_blur', z: [1.05, 1.15], x: [0, 0], y: [0, 0], lod: 0, dim: .45, cap: [.5, 0] },
  { a: 21.25, b: 25, img: 'panetone_blur', z: [1.05, 1.15], x: [0, 0], y: [0, 0], lod: 0, dim: .45, cap: [.5, 0] },
  { a: 25, b: 30.1, img: 'sala_mesas_blur', z: [1.05, 1.15], x: [-.1, .1], y: [0, 0], lod: 0, dim: .42, cap: [.5, 0] },
];
const TRANS = { 5: 2, 7.5: 0, 9.375: 1, 11.25: 3, 13.75: 0, 17.5: 1, 21.25: 3, 25: 4 };
const TPRE = .28, TPOST = .22;
function setSlot(s, t, pre) {
  const k = clamp((t - s.a) / (s.b - s.a), -.2, 1.2);
  U['uP' + pre].value = 0;
  const T = tex[s.img]; U['u' + pre].value = T.t; U['uAsp' + pre].value = T.asp;
  const kk = eInOut(clamp(k));
  U['uK' + pre].value.set(lerp(s.z[0], s.z[1], kk), lerp(s.x[0], s.x[1], kk), lerp(s.y[0], s.y[1], kk), s.lod);
  U['uD' + pre].value = s.dim;
}

// ---------- DOM helpers ----------
function splitEl(el) {
  const txt = el.textContent; el.textContent = '';
  const gold = el.classList.contains('goldtxt'); if (gold) el.classList.remove('goldtxt');
  return [...txt].map(ch => { const s = document.createElement('span'); s.className = 'L' + (gold ? ' goldtxt' : ''); s.textContent = ch === ' ' ? ' ' : ch; el.appendChild(s); return s; });
}
const LT = { C: splitEl($('tC')), D: splitEl($('tD')) };
const LPB = splitEl($('pB')), LAA = splitEl($('aA'));
const LV = splitEl($('bV'));
const items = ['Bebidas', 'Cafés', 'Bolos', 'Sobremesas', 'Pães', 'Panquecas', 'Pão de queijo', 'Frutas', 'Iogurte', 'Ovos'];
const chips = items.map(n => { const d = document.createElement('div'); d.className = 'chip'; d.textContent = n; $('chips').appendChild(d); return d; });
const eqBars = [...document.querySelectorAll('#eq i')]; eqBars.forEach(b => b.style.cssText = 'display:block;width:9px;background:#f8e2a6;border-radius:4px');
const notes = [...Array(7)].map((_, i) => { const n = document.createElement('div'); n.className = 'note'; n.textContent = i % 2 ? '♪' : '♫'; $('notes').appendChild(n); return n; });
// caramel drops for "recheados"
const DROPS = [[330, 7.95], [455, 8.15], [575, 8.35], [690, 8.6], [800, 8.85]].map(([x, t0]) => { const d = document.createElement('div'); d.className = 'drop'; d.style.left = x + 'px'; $('drops').appendChild(d); return { el: d, x, t0 }; });
// sprinkles (granulado) for "chocolate" — seeded, times mirrored in music2.py
const GR = (() => { const R = rng(99); const cols = ['#5a2d14', '#3b1d0c', '#f5ede0', '#8a4a22', '#f5ede0']; return [...Array(70)].map(() => {
  const g = { x: 200 + R() * 680, land: 545 + R() * 45, t0: 9.6 + R() * .95, rot: R() * 180, col: cols[Math.floor(R() * cols.length)] };
  const el = document.createElement('div'); el.className = 'gr'; el.style.background = g.col; el.style.left = g.x + 'px'; $('gran').appendChild(el); g.el = el; return g; }); })();
const st = (el, op, tr, extra) => { el.style.opacity = op; el.style.transform = tr || ''; if (extra) Object.assign(el.style, extra); };
const shine = (el, t, sp = .35, off = 0) => el.style.backgroundPosition = `${100 - ((t * sp + off) % 1) * 160 + 30}% 0`;
const beatEnv = (t, from) => t < from ? 0 : Math.exp(-(((t - from) % BEAT)) * 7);
const reveal = (el, k) => { el.style.opacity = k > 0 ? 1 : 0; el.style.clipPath = `inset(-20% ${100 - eInOut(k) * 100}% -20% -5%)`; };

const IMPACTS = [[1.25, .3], [5, 1], [5.625, .6], [7.5, .25], [13.75, .35], [21.25, .45], [22.5, .7], [24.375, .5], [27.5, .35]];
const FLASHES = [[1.25, .6], [5, .85], [5.625, .25], [22.5, .35], [24.375, .2], [13.75, .15]];
const BURSTS = [[1.25, 540, 549, 0], [5, 540, 960, 0], [22.5, 520, 1100, 0], [24.375, 170, 1360, 0], [27.5, 540, 1110, 0]];
const STAR_Y = (960 - 549) * .00279;

function render(t) {
  // ---- background segments + transitions
  let i = SEG.findIndex(s => t >= s.a && t < s.b); if (i < 0) i = SEG.length - 1;
  let A = SEG[i], B = null, p = 0, type = 0;
  const nx = SEG[i + 1], pv = SEG[i - 1];
  if (nx && t > nx.a - TPRE) { B = nx; p = seg(t, nx.a - TPRE, nx.a + TPOST); type = TRANS[nx.a]; }
  else if (pv && t < A.a + TPOST) { B = A; A = pv; p = seg(t, B.a - TPRE, B.a + TPOST); type = TRANS[B.a]; }
  setSlot(A, t, 'A'); if (B) setSlot(B, t, 'B');
  U.uP.value = B ? p : 0; U.uType.value = type; U.uTime.value = t;
  const cs = SEG[i]; const capK = B ? (p < .5 ? A : B) : cs;
  U.uCapY.value = capK.cap[0]; U.uCap.value = capK.cap[1] * (B ? Math.abs(p - .5) * 2 : 1);
  U.uSteam.value = 0;
  let sx = 0, sy = 0; IMPACTS.forEach(([ti, a], j) => { const d = t - ti; if (d >= 0 && d < .6) { const e = a * Math.exp(-d * 11); sx += e * Math.sin(d * 70 + j); sy += e * Math.cos(d * 55 + j * 2); } });
  U.uShake.value.set(sx * .006, sy * .006);
  $('ui').style.transform = `translate(${sx * 9}px,${sy * 9}px)`;
  let fl = 0; FLASHES.forEach(([ti, a]) => { const d = t - ti; if (d > -.03 && d < .25) fl = Math.max(fl, a * (1 - Math.abs(d) / .25)); }); U.uFlash.value = fl;
  let lk = 0; Object.keys(TRANS).forEach(k => { const d = t - k; if (d > -.4 && d < .6) lk = Math.max(lk, Math.sin(clamp((d + .4) / 1) * Math.PI) * .6); }); U.uLeak.value = lk;

  // ---- particles
  snowU.uTime.value = bokU.uTime.value = burU.uTime.value = strandU.uTime.value = t;
  snowU.uInt.value = t >= 7.5 && t < 17.5 ? .5 : 1; bokU.uInt.value = t < 5 ? .5 : t < 17.5 ? .45 : 1;
  let bi = -1; BURSTS.forEach((b, j) => { if (t >= b[0]) bi = j; });
  if (bi >= 0) { const b = BURSTS[bi]; burU.uT0.value = b[0]; burU.uO.value.set(b[1], 1920 - b[2]); burU.uK.value = b[3]; }
  if (t < 5.1) { strandU.uInt.value = 1 - seg(t, 4.75, 5); strandU.uReveal.value = eOut(seg(t, 0, 1.2)); strandU.uY.value = 1920 - 190; strandU.uSag.value = 95; }
  else if (t > 24.95) { strandU.uInt.value = seg(t, 25, 25.25); strandU.uReveal.value = eOut(seg(t, 25, 25.95)); strandU.uY.value = 1920 - 150; strandU.uSag.value = 80; }
  else strandU.uInt.value = 0;

  // ---- 3D star -> becomes the logo at 1.25 (beat 3)
  const starOn = t < 1.3;
  star.visible = starOn;
  if (starOn) {
    const ki = seg(t, 0, .5), ko = eIn(seg(t, .95, 1.25));
    star.scale.setScalar(Math.max(.62 * eBack(ki) * (1 - ko), .0001));
    star.position.set(0, STAR_Y, 0);
    star.rotation.set(Math.sin(t * 1.5) * .25, t * 2.4 + ko * 9, Math.sin(t * 1.1) * .1);
  }
  if (t < 4.9) U.uFlare.value.set(.5, .714, t < 1.25 ? (.5 + .25 * Math.sin(t * 5)) * seg(t, 0, .5) + eIn(seg(t, .95, 1.25)) * 2 : Math.max(.25, 2 * Math.exp(-(t - 1.25) * 3)) * (1 - seg(t, 4.5, 4.9)));
  else if (t > 22.35 && t < 23.4) U.uFlare.value.set(.5, .47, Math.max(0, 1 - (t - 22.5) / .8) * 1.4 * seg(t, 22.45, 22.53));
  else if (t > 27.35 && t < 28.4) U.uFlare.value.set(.5, .42, Math.max(0, 1 - (t - 27.5) / .8) * 1.1 * seg(t, 27.45, 27.53));
  else U.uFlare.value.z = 0;

  renderer.clear();
  renderer.render(bgScene, ortho);
  if (starOn) { renderer.clearDepth(); renderer.render(starScene, persp); }
  renderer.render(fxScene, pxCam);

  // ---- brand marks
  $('wm').style.opacity = win(t, 5.15, 25, .3, .25) * .6;
  $('ilus').style.opacity = win(t, 13.75, 21.3, .2, .15);

  // ---- HOOK
  $('hook').style.opacity = 1 - seg(t, 4.8, 5);
  const kl = seg(t, 1.25, 1.75);
  st($('logoWrap'), clamp(kl * 2), `scale(${lerp(.4, 1, eBack(kl))})`, { filter: `blur(${lerp(12, 0, kl)}px)` });
  $('hShine').style.backgroundPosition = `${lerp(110, -10, seg(t, 1.6, 2.5))}% 0`;
  const k1 = seg(t, 2.5, 2.95); st($('hS'), k1, `translateY(${lerp(30, 0, eOut(k1))}px)`, { filter: `blur(${lerp(14, 0, k1)}px)` });
  const k2 = seg(t, 3.125, 3.8);
  st($('hM'), clamp(k2 * 1.5), `translateY(${lerp(90, 0, eOut(k2))}px)`, { textShadow: `0 0 ${lerp(0, 50, k2)}px rgba(255,190,90,${.9 * k2}),0 6px 22px rgba(0,0,0,.8)`, color: `rgb(255,${Math.round(lerp(150, 226, k2))},${Math.round(lerp(90, 176, k2))})` });
  reveal($('hE'), seg(t, 3.75, 4.45)); shine($('hE'), t, .6);
  $('hook').style.transform = `scale(${1 + eIn(seg(t, 4.55, 5)) * .25})`;

  // ---- TITLE (shifted +2.5 from v1)
  const tt = t - 2.5;
  $('ttl').style.opacity = win(t, 4.95, 7.55, .05, .22);
  const slam = (arr, t0) => arr.forEach((s, j) => { const a = t0 + j * .025, k = seg(tt, a, a + .22); s.style.opacity = clamp(k * 3); s.style.transform = `scale(${lerp(3.2, 1, eOut(k))})`; s.style.filter = `blur(${lerp(16, 0, k)}px)`; shine(s, t, .45, j * .02); });
  slam(LT.C, 2.5); slam(LT.D, 3.125);
  const kA = seg(tt, 3.75, 4.3); st($('tA'), kA, '', { letterSpacing: `${lerp(.6, .18, eOut(kA))}em` });
  reveal($('tB'), seg(tt, 3.95, 4.7)); shine($('tB'), t, .5);
  $('ttl').style.transform = `scale(${lerp(1, 1.05, seg(tt, 3.2, 5))})`;

  // ---- PANETONES RECHEADOS: gooey letters + caramel drops
  $('pan').style.opacity = win(t, 7.45, 9.45, .05, .12);
  const kpA = seg(t, 7.55, 7.9); st($('pA'), clamp(kpA * 2), `translateY(${lerp(-60, 0, eOut(kpA))}px)`); shine($('pA'), t, .5);
  LPB.forEach((s, j) => { const a = 7.75 + j * .035, d = t - a, k = clamp(d / .4);
    const sag = d > 0 ? .08 * Math.sin(Math.min(d, 2) * 2.2 + j) * Math.exp(-d * .5) : 0;
    st(s, clamp(k * 3), `translateY(${lerp(-50, 0, eOut(k))}px) scaleY(${lerp(1.7, 1, eElastic(k)) + sag})`, { transformOrigin: '50% 0%' }); });
  DROPS.forEach(dp => { const d = t - dp.t0; let y = 735, sc = 0, sy = 1, op = 0;
    if (d > 0) { op = 1; if (d < .3) { sc = eOut(d / .3); sy = 1 + d / .3 * .5; } else { const f = d - .3; sc = 1; sy = 1.5 + Math.min(f * 2, .6); y += 1300 * f * f; op = 1 - seg(y, 1150, 1450); } }
    st(dp.el, op, `scale(${sc}) scaleY(${sy})`, { top: y + 'px', transformOrigin: '50% 0%' }); });

  // ---- COBERTOS DE CHOCOLATE: chocolate pours over the word, sprinkles fall on it
  $('doc').style.opacity = win(t, 9.33, 11.33, .05, .12);
  const kdA = seg(t, 9.42, 9.75); st($('dA'), kdA, `translateY(${lerp(-50, 0, eOut(kdA))}px)`);
  const kdB = seg(t, 9.6, 10.05); $('dB').style.opacity = kdB > 0 ? 1 : 0; $('dB').style.clipPath = `inset(-10% -5% ${100 - eInOut(kdB) * 100}% -5%)`;
  GR.forEach(g => { const d = t - g.t0; const fall = Math.sqrt(2 * (g.land - 160) / 3000);
    let y = 160, r = g.rot, op = 0;
    if (d > 0) { op = 1; if (d < fall) { y = 160 + 1500 * d * d; r += d * 720; } else { const b = d - fall; y = g.land - Math.abs(Math.sin(b * 18)) * 14 * Math.exp(-b * 9); r += fall * 720; } }
    st(g.el, op, `rotate(${r}deg)`, { top: y + 'px' }); });

  // ---- ÁRVORES DE NATAL DE CHOCOLATE + ribbon "para oferecer"
  $('arv').style.opacity = win(t, 11.2, 13.82, .05, .12);
  LAA.forEach((s, j) => { const a = 11.3 + j * .03, k = seg(t, a, a + .35); st(s, clamp(k * 3), `scaleY(${eBack(k)})`, { transformOrigin: '50% 100%' }); shine(s, t, .5, j * .02); });
  reveal($('aB'), seg(t, 11.75, 12.25));
  const kr = seg(t, 12.2, 12.55); st($('ribbon'), kr > 0 ? 1 : 0, `scaleX(${eOut(kr)})`);
  const kc = seg(t, 12.3, 12.6); $('aC').style.opacity = kc > 0 ? 1 : 0; $('aC').style.clipPath = `inset(-20% ${100 - eOut(kc) * 100}% -20% 0)`;
  const kb = seg(t, 12.6, 13.1); st($('bow'), clamp(kb * 4), `scale(${eElastic(kb)}) rotate(${Math.sin(t * 3) * 4 * (kb > 0 ? 1 : 0)}deg)`, { transformOrigin: '50% 50%' });

  // ---- BUFFET / INCLUI / PRICE / CTA (v1 choreography shifted +3.75)
  const tb = t - 3.75;
  $('buf').style.opacity = win(tb, 9.95, 13.85, .05, .25);
  const kB = seg(tb, 10.05, 10.4); st($('bB'), clamp(kB * 2), `translateY(${lerp(-80, 0, eOut(kB))}px)`); shine($('bB'), t, .4);
  LV.forEach((s, j) => { const c = j - (LV.length - 1) / 2; const k = seg(tb, 10.3, 11.0);
    st(s, clamp(k * 3), `translateX(${c * lerp(-30, 0, eOut(k)) + c * 22 * Math.sin(clamp(k) * Math.PI) * 1.2}px) scale(${lerp(.3, 1, eBack(k))})`); });
  const kM = seg(tb, 11.875, 12.3); const pulse = beatEnv(tb, 11.875);
  st($('bM'), clamp(kM * 2), `translateY(${lerp(120, 0, eBack(kM))}px)`);
  $('bMp').style.transform = `scale(${1 + pulse * .07 * (tb > 12.3 ? 1 : 0)})`;
  $('bMp').style.boxShadow = `0 0 ${20 + pulse * 50}px rgba(229,189,108,${.3 + pulse * .5}),0 10px 40px rgba(0,0,0,.5)`;
  eqBars.forEach((b, j) => b.style.height = (12 + (pulse * .7 + .3) * Math.abs(Math.sin(t * (6 + j * 1.7) + j)) * 38) + 'px');
  notes.forEach((n, j) => { const a = 12.1 + j * .22, d = tb - a; const k = clamp(d / 1.5);
    n.style.opacity = d > 0 ? Math.sin(k * Math.PI) : 0; n.style.left = (210 + j * 105 + Math.sin(t * 3 + j) * 20) + 'px'; n.style.top = (1200 - k * 260) + 'px'; n.style.transform = `rotate(${Math.sin(t * 4 + j) * 15}deg) scale(${.7 + pulse * .3})`; });

  $('inc').style.opacity = win(tb, 13.7, 17.55, .1, .2);
  const kT = seg(tb, 13.8, 14.2); st($('iT'), kT, `translateY(${lerp(-50, 0, eOut(kT))}px)`); shine($('iT'), t, .4);
  chips.forEach((c, j) => { const a = 13.75 + BEAT / 2 * (j + .5), k = seg(tb, a, a + .3);
    c.style.opacity = clamp(k * 3); c.style.transform = `scale(${eBack(k)}) translateY(${lerp(30, 0, eOut(k))}px)`;
    const h = Math.exp(-Math.max(0, tb - a) * 6) * (tb > a ? 1 : 0); c.style.boxShadow = `0 0 ${h * 40}px rgba(248,226,166,${h}),0 8px 24px rgba(0,0,0,.45)`; });
  reveal($('iD'), seg(tb, 16.875, 17.45)); shine($('iD'), t, .5);

  $('pr').style.opacity = win(tb, 17.4, 21.4, .08, .2);
  const kcd = seg(tb, 17.45, 17.9); st($('card'), 1, `rotateY(${lerp(95, 0, eBack(kcd))}deg) scale(${lerp(.7, 1, eOut(kcd))})`);
  const kp = eOut(seg(tb, 17.65, 18.75)); $('price').textContent = (19.9 * kp).toFixed(2).replace('.', ',');
  const hit = tb > 18.75 ? Math.exp(-(tb - 18.75) * 6) : 0; $('pnum').style.transform = `scale(${1 + hit * .18})`; $('pnum').style.textShadow = `0 0 ${hit * 60}px rgba(229,189,108,${hit})`;
  const kf = seg(tb, 19.375, 19.8); st($('fam'), clamp(kf * 2), `translateY(${lerp(40, 0, eOut(kf))}px)`);
  $('strike').style.width = (eOut(seg(tb, 20.0, 20.25)) * 112) + '%';
  const ks = seg(tb, 20.5, 20.7); st($('seal'), clamp(ks * 4), `scale(${lerp(3, 1, eIn(ks)) + (tb > 20.7 ? Math.exp(-(tb - 20.7) * 8) * Math.sin((tb - 20.7) * 40) * .06 : 0)}) rotate(${-14 + Math.sin(t * 2.5) * 3}deg)`);

  $('cta').style.opacity = win(tb, 21.1, 30, .2, .01);
  const kL = seg(t, 25.0, 25.45); st($('cL'), clamp(kL * 2), `scale(${lerp(.5, 1, eBack(kL))})`, { filter: `drop-shadow(0 0 ${20 + 25 * beatEnv(t, 27.5)}px rgba(255,200,110,.6)) drop-shadow(0 4px 12px rgba(0,0,0,.7))` });
  const kT2 = seg(tb, 21.55, 22.0); st($('cT'), kT2, `translateY(${lerp(-50, 0, eOut(kT2))}px)`); shine($('cT'), t, .35);
  const kd = seg(tb, 21.875, 22.25); st($('cD'), clamp(kd * 2), `translateX(${lerp(-800, 0, eBack(kd))}px)`);
  const kh = seg(tb, 22.5, 22.875); st($('cH'), clamp(kh * 2), `translateX(${lerp(800, 0, eBack(kh))}px)`);
  let rOn = 0; if (tb >= 23.125) { const q = Math.floor((tb - 23.125) / (BEAT / 4)); rOn = tb < 23.75 ? (q % 2 === 0 ? 1 : .15) : 1; }
  const rp = beatEnv(tb, 23.75);
  st($('cR'), rOn, `scale(${1 + (tb > 23.75 ? rp * .04 : 0)})`, { textShadow: `0 0 ${18 + rOn * 30 + rp * 20}px rgba(255,190,90,${.6 * rOn + .3 * rp}),0 0 6px rgba(255,220,160,${rOn * .8}),0 6px 20px rgba(0,0,0,.8)` });
  const kph = seg(tb, 23.75, 24.15); const pr = tb > 24.1 ? ((tb - 24.1) % (BEAT * 2)) / (BEAT * 2) : 0;
  st($('cP'), clamp(kph * 2), `scale(${eBack(kph) * (1 + beatEnv(tb, 24.375) * .03)})`);
  $('phone').style.boxShadow = `0 0 0 ${pr * 44}px rgba(229,189,108,${(1 - pr) * .55}),0 20px 60px rgba(0,0,0,.6)`;
  const ringT = [23.9, 25.8].map(r => tb - r).find(d => d >= 0 && d < .75);
  $('ring').style.transform = `rotate(${ringT !== undefined ? Math.sin(ringT * 75) * 16 * (1 - ringT / .75) : 0}deg)`;
  const ka = seg(tb, 24.375, 24.75); st($('cA'), clamp(ka * 2), `translateY(${lerp(70, 0, eOut(ka))}px)`);
}
window.render = render;
window.DUR = DUR;
render(0);
window.ready = true;
