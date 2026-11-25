// The Drexciyan: one figure swimming far off under the water.
// Her upper body comes from the Blender model (swimmer.bin). Tail, fluke, fin, skirt and locs are built here.
// Motion is simulated, never looped:
//   - a travelling wave runs down the body (dolphin-style, dorso-ventral), growing toward the fluke
//   - forward speed comes out of that wave through Lighthill's elongated-body thrust, against drag
//   - the body recoils so its centre of mass stays on the path, banks into turns, kicks then glides
//   - each loc is a chain of points pulled through the water with drag, plus a little will of its own
(function(){
const NJ=28, AMAX=1.06, LTOT=3.2, ZTOP=1.218226759716174;
const META={nv:17521,nt:34852,min:[-0.376628422143062,-0.262902156278626,-0.37230785837054725],max:[0.37662842264377794,0.20951054678077163,1.218226759716174]};
const QS=new URLSearchParams(location.search);
const K=(+QS.get('swimsize')||1.5)/LTOT;          // Blender units -> water units
const LW=LTOT*K;                                    // body length in the water
const RBASE=+QS.get('swimr')||5.2;                  // how far out she keeps
const OFF=QS.get('swim')==='0';
const TAU=Math.PI*2, rnd=Math.random;
const v3=(x,y,z)=>[x,y,z], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]], sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  mul=(a,s)=>[a[0]*s,a[1]*s,a[2]*s], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len=a=>Math.hypot(a[0],a[1],a[2]), norm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function sn(t,s){return Math.sin(t*1.0+s)*.5+Math.sin(t*2.17+s*1.7)*.3+Math.sin(t*4.31+s*2.9)*.2;}   // smooth wander

// ---------- geometry (spine space: a = 0 head .. 1 fluke, x = right, y = dorsal, in Blender units) ----------
const tailR=a=>{const t=clamp((a-.37)/.615,0,1);return [.185*Math.pow(1-t,.9)+.03,.135*Math.pow(1-t,.9)+.022];};
function buildStatic(bin){
  const nv=META.nv,nt=META.nt;
  const q=new Uint16Array(bin,0,nv*3), c8=new Uint8Array(bin,nv*6,nv*4), idx=new Uint16Array(bin.slice(nv*10),0,nt*3);
  const P=[],Nn=[],C=[],UV=[],I=[];
  const mn=META.min,mx=META.max;
  // body
  const bp=new Float32Array(nv*3);
  for(let i=0;i<nv*3;i++)bp[i]=mn[i%3]+(mx[i%3]-mn[i%3])*q[i]/65535;
  const bn=new Float32Array(nv*3);
  for(let t=0;t<nt;t++){const a=idx[t*3],b=idx[t*3+1],c=idx[t*3+2];
    const e1=[bp[b*3]-bp[a*3],bp[b*3+1]-bp[a*3+1],bp[b*3+2]-bp[a*3+2]],e2=[bp[c*3]-bp[a*3],bp[c*3+1]-bp[a*3+1],bp[c*3+2]-bp[a*3+2]];
    const n=cross(e1,e2);for(const v of [a,b,c]){bn[v*3]+=n[0];bn[v*3+1]+=n[1];bn[v*3+2]+=n[2];}}
  for(let i=0;i<nv;i++){const n=norm([bn[i*3],bn[i*3+1],bn[i*3+2]]);
    P.push((ZTOP-bp[i*3+2])/LTOT,bp[i*3],bp[i*3+1],0);Nn.push(n[0],n[1],n[2]);
    C.push(c8[i*4],c8[i*4+1],c8[i*4+2],c8[i*4+3]);UV.push(0,0);}
  for(let i=0;i<nt*3;i++)I.push(idx[i]);
  let base=nv;
  const vert=(a,x,y,kind,n,col,u,v)=>{P.push(a,x,y,kind);Nn.push(n[0],n[1],n[2]);C.push(col[0],col[1],col[2],col[3]);UV.push(u,v);return base++;};
  const grid=(nu,nvv,wrap,f)=>{const b0=base;for(let i=0;i<nu;i++)for(let j=0;j<nvv;j++)f(i,j);
    for(let i=0;i<nu-(wrap?0:1);i++)for(let j=0;j<nvv-1;j++){const a=b0+i*nvv+j,b=b0+((i+1)%nu)*nvv+j;I.push(a,b,b+1,a,b+1,a+1);}};
  // tail: scaled tube, hip to fluke
  const RN=46,SD=18;
  grid(SD,RN,true,(i,j)=>{const a=.365+(.985-.365)*j/(RN-1),th=TAU*i/SD,[rx,ry]=tailR(a);
    const cx=Math.cos(th),sy=Math.sin(th);vert(a,rx*cx,ry*sy-.012,1,norm([cx/rx,sy/ry,.15]),[0,0,0,0],i/SD,a);});
  // fluke: a wide crescent lying flat, so it beats up and down
  {const FU=17,FV=5;
    grid(FU,FV,false,(i,j)=>{const u=i/(FU-1)*2-1,v=j/(FV-1),au=Math.abs(u);
      const lead=.945+.085*Math.pow(au,1.25),trail=.985+.075*(1-.55*au)+.02*Math.cos(u*Math.PI),a=lead+(trail-lead)*v;
      vert(a,u*.36*(.25+.75*Math.sin(Math.min(1,v*1.6+.25)*Math.PI/2)),-.01+.012*Math.sin(v*3.1)*(1-au),5,[0,1,0],[0,0,0,0],u*.5+.5,v);});}
  // dorsal fin: a rayed ridge down the back of the tail
  {const DN=70;
    grid(DN,2,false,(i,j)=>{const tt=i/(DN-1),a=.43+.50*tt,[rx,ry]=tailR(a);
      const hg=.115*Math.pow(Math.sin(Math.PI*tt),.6)*(1-.28*Math.abs(Math.sin(tt*Math.PI*11)));
      vert(a+(j?.035*hg/.115:0),0,ry-.02+(j?hg:0),3,[1,0,0],[0,0,0,0],tt*11,j);});}
  // skirt: three ruffled tiers, long on one side
  for(let tier=0;tier<3;tier++){const SC=64,SR=9;
    grid(SC,SR,true,(i,j)=>{const th=TAU*i/SC,v=j/(SR-1),bump=Math.pow((1+Math.cos(th-2.2))/2,2.2);
      const L=[.045,.075,.105][tier]*(1+[.5,1.3,2.4][tier]*bump)*(1+.16*Math.abs(Math.sin(th*(7+tier)+tier*1.3))*v);
      const a=.372+tier*.004+L*v,[rx,ry]=tailR(.372+L*v*.6);
      const fl=1.06+(.02*(2-tier))+[.34,.46,.60][tier]*Math.pow(v,1.25),rf=1+.10*v*Math.sin(th*(13+2*tier)+tier*2.1);
      const cx=Math.cos(th),sy=Math.sin(th);
      vert(a,rx*fl*rf*cx,ry*fl*rf*sy-.012,2,norm([cx,sy,-.5]),[tier*120,0,0,0],i/SC,v);});}
  return {P:new Float32Array(P),N:new Float32Array(Nn),C:new Uint8Array(C),UV:new Float32Array(UV),I:new Uint32Array(I)};
}

// ---------- the swimmer's state and physics ----------
const A0=QS.has('swima')?+QS.get('swima'):rnd()*TAU;
const S={p:[RBASE*Math.sin(A0),-1.8,RBASE*Math.cos(A0)],yaw:A0-Math.PI/2,pitch:0,roll:0,U:.5,ph:0,amp:.9,ampT:.9,f:.9,fT:.9,mode:'kick',tm:4,dir:1,yr:0,t:rnd()*100,St:0};
const Pj=new Float32Array(NJ*3),Tj=new Float32Array(NJ*3),Uj=new Float32Array(NJ*3);
const LAMBDA=1.05, MA=1.0, CDS=.26, MASS=1.25, ATIP=.105;  // wavelength (body lengths), fluke added mass, drag area, mass, tip amplitude (body lengths)
const env=s=>.018+.982*Math.pow(clamp(s,0,AMAX),2.2);
const massAt=s=>s<.38?1:Math.pow(clamp(1-(s-.38)/.7,0,1),1.6)+.04;
function stepSwim(dt,wy){
  S.t+=dt;
  // kick, then glide
  S.tm-=dt;
  if(S.tm<0){if(S.mode==='kick'){S.mode='glide';S.tm=1.4+rnd()*2.6;S.ampT=.07;}
    else{S.mode='kick';S.tm=3+rnd()*4.5;S.ampT=.78+rnd()*.3;S.fT=.72+rnd()*.42;if(rnd()<.18)S.dir*=-1;}}
  S.amp+=(S.ampT-S.amp)*(1-Math.exp(-dt*1.5));S.f+=(S.fT-S.f)*(1-Math.exp(-dt*1.1));
  // where she wants to go: a loose orbit that breathes in and out and up and down
  const r=Math.hypot(S.p[0],S.p[2])||1,er=[S.p[0]/r,S.p[2]/r],et=[-er[1]*S.dir,er[0]*S.dir];
  const rT=RBASE+RBASE*.28*sn(S.t*.045,1.3),yT=wy-1.75+.85*sn(S.t*.06,4.1);
  const kr=clamp((rT-r)*.55,-1,1),wn=.45*sn(S.t*.21,7.7);
  const dx=et[0]+er[0]*kr+(-et[1])*wn*0,dz=et[1]+er[1]*kr;
  const yawT=Math.atan2(dx,dz)+wn,pitchT=Math.atan(clamp((yT-S.p[1])*.5,-.55,.55));
  let dy=yawT-S.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));
  const rate=clamp(dy*1.1,-.6,.6)*(.3+.7*Math.min(1,S.U/.6));
  S.yr+=(rate-S.yr)*(1-Math.exp(-dt*2.5));S.yaw+=S.yr*dt;
  S.pitch+=(pitchT-S.pitch)*(1-Math.exp(-dt*.8));
  S.roll+=(clamp(-S.yr*S.U*1.6,-.7,.7)-S.roll)*(1-Math.exp(-dt*2));
  // thrust from the tail wave (Lighthill): T = m_a * (h_t * w - w*w/2) at the fluke, w = h_t + U*h_x
  S.ph+=TAU*S.f*dt;
  const A=S.amp*ATIP*LW*env(1),k=TAU/(LAMBDA*LW),om=TAU*S.f,arg=k*LW-S.ph;
  const ht=-A*om*Math.cos(arg),hx=A*k*Math.cos(arg),w=ht+S.U*hx;
  const thrust=MA*(ht*w-.5*w*w),drag=.5*CDS*S.U*S.U*(1+1.6*Math.abs(S.yr));
  S.U=clamp(S.U+(thrust-drag)/MASS*dt,.06,3);
  S.St=S.f*2*A/Math.max(S.U,.05);
  const cp=Math.cos(S.pitch),F=[Math.sin(S.yaw)*cp,Math.sin(S.pitch),Math.cos(S.yaw)*cp];
  S.p=add(S.p,mul(F,S.U*dt));S.p[1]=Math.min(S.p[1],wy-.55);
  // the midline
  let U0=norm(sub([0,1,0],mul(F,F[1])));const R0=norm(cross(mul(F,-1),U0));
  {const c=Math.cos(S.roll),s=Math.sin(S.roll);U0=norm(add(mul(U0,c),mul(R0,s)));}
  const Rr=norm(cross(mul(F,-1),U0));
  const kap=clamp(S.yr/Math.max(S.U,.25)*.75,-.9,.9), SCM=.36;
  const hs=new Float32Array(NJ);let m0=0,m1=0,m2=0,mh=0,mxh=0;
  for(let i=0;i<NJ;i++){const s=i/(NJ-1)*AMAX,x=(s-SCM)*LW;hs[i]=S.amp*ATIP*LW*env(s)*Math.sin(k*s*LW-S.ph);
    const m=massAt(s);m0+=m;m1+=m*x;m2+=m*x*x;mh+=m*hs[i];mxh+=m*x*hs[i];}
  // recoil: remove the net sideways shift and net rotation of the wave, so momentum balances and the head answers the tail
  const den=m0*m2-m1*m1,b=(m0*mxh-m1*mh)/den,a0=(mh-b*m1)/m0;
  for(let i=0;i<NJ;i++){const s=i/(NJ-1)*AMAX,x=(s-SCM)*LW,h=hs[i]-a0-b*x,l=.5*kap*x*x;
    const p=add(add(sub(S.p,mul(F,x)),mul(U0,h)),mul(Rr,l));Pj[i*3]=p[0];Pj[i*3+1]=p[1];Pj[i*3+2]=p[2];}
  for(let i=0;i<NJ;i++){const a=Math.max(i-1,0),c=Math.min(i+1,NJ-1);
    const T=norm([Pj[c*3]-Pj[a*3],Pj[c*3+1]-Pj[a*3+1],Pj[c*3+2]-Pj[a*3+2]]),Uu=norm(sub(U0,mul(T,dot(T,U0))));
    Tj.set(T,i*3);Uj.set(Uu,i*3);}
}
function skin(a,x,y){const fi=a/AMAX*(NJ-1),i=clamp(Math.floor(fi),0,NJ-2),f=fi-i;
  const g=(A,j)=>[A[j*3],A[j*3+1],A[j*3+2]];
  const p0=g(Pj,i),p1=g(Pj,i+1),T=norm(add(mul(g(Tj,i),1-f),mul(g(Tj,i+1),f)));
  let Uu=norm(add(mul(g(Uj,i),1-f),mul(g(Uj,i+1),f)));Uu=norm(sub(Uu,mul(T,dot(T,Uu))));const R=cross(T,Uu);
  return {p:add(add(p0,mul(sub(p1,p0),f)),add(mul(R,x*K),mul(Uu,y*K))),T,U:Uu,R};}

// ---------- locs: chains pulled through the water ----------
const LOCS=[],LN=9,LSIDES=5;
function buildLocs(){
  const hc=[0,.075,1.105],hr=.102,ax=norm([0,.62,.78]);let tries=0;
  while(LOCS.length<46&&tries++<4000){
    const d=norm([rnd()*2-1,rnd()*2-1,rnd()*2-1]);
    if(dot(d,ax)<.05||dot(d,norm([0,-1,.15]))>.5)continue;
    if(LOCS.some(l=>len(sub(l.d,d))<.2))continue;
    const pos=add(hc,mul(d,hr));
    LOCS.push({d,a:(ZTOP-pos[2])/LTOT,x:pos[0],y:pos[1],L:(.55+rnd()*.50)*K,rad:(.020+rnd()*.008)*K,seed:rnd()*100,
      X:new Float32Array(LN*3),Xp:new Float32Array(LN*3),init:false});}
}
function stepLocs(dt,t){
  const head=skin(.035,0,.075),hR=.108*K;
  for(const l of LOCS){
    const sk=skin(l.a,l.x,l.y),root=sk.p,dw=norm(add(add(mul(sk.R,l.d[0]),mul(sk.U,l.d[1])),mul(sk.T,-l.d[2]))),seg=l.L/(LN-1);
    if(!l.init){for(let i=0;i<LN;i++){const p=add(root,mul(dw,seg*i));l.X.set(p,i*3);l.Xp.set(p,i*3);}l.init=true;}
    for(let i=1;i<LN;i++){const j=i*3,u=i/(LN-1);
      let vx=l.X[j]-l.Xp[j],vy=l.X[j+1]-l.Xp[j+1],vz=l.X[j+2]-l.Xp[j+2];
      // water drag: the water is nearly still, so each point gives up most of its motion; this is what makes them trail
      const dr=Math.exp(-dt*(10.+12.*u));vx*=dr;vy*=dr;vz*=dr;
      // a slow current, a touch of lift, and each loc's own curl, stronger toward the tip
      const w=.9+.5*Math.sin(l.seed),ph=t*w+l.seed;
      const ax=(Math.sin(ph*.9+u*3.1+l.seed*3)*.55+.05*Math.sin(t*.23+l.X[j+2]))*u,
            ay=(.10+Math.cos(ph*.7+u*2.3)*.5)*u,az=(Math.sin(ph*1.1+u*3.7+l.seed)*.55)*u;
      l.Xp[j]=l.X[j];l.Xp[j+1]=l.X[j+1];l.Xp[j+2]=l.X[j+2];
      l.X[j]+=vx+ax*dt*dt*K*34;l.X[j+1]+=vy+ay*dt*dt*K*34;l.X[j+2]+=vz+az*dt*dt*K*34;}
    l.X.set(root,0);
    for(let it=0;it<5;it++){
      // the first link holds the direction it grows from the scalp
      if(it===0){const tg=add(root,mul(dw,seg));for(let c=0;c<3;c++)l.X[3+c]+=(tg[c]-l.X[3+c])*.22;}
      for(let i=1;i<LN;i++){const a=(i-1)*3,b=i*3;let dx=l.X[b]-l.X[a],dy=l.X[b+1]-l.X[a+1],dz=l.X[b+2]-l.X[a+2];
        const d=Math.hypot(dx,dy,dz)||1e-6,k=(d-seg)/d;
        if(i===1){l.X[b]-=dx*k;l.X[b+1]-=dy*k;l.X[b+2]-=dz*k;}
        else{l.X[a]+=dx*k*.5;l.X[a+1]+=dy*k*.5;l.X[a+2]+=dz*k*.5;l.X[b]-=dx*k*.5;l.X[b+1]-=dy*k*.5;l.X[b+2]-=dz*k*.5;}}
      // thick locs resist sharp bends
      for(let i=2;i<LN;i++){const a=(i-2)*3,b=i*3;let dx=l.X[b]-l.X[a],dy=l.X[b+1]-l.X[a+1],dz=l.X[b+2]-l.X[a+2];
        const d=Math.hypot(dx,dy,dz)||1e-6,mn=seg*1.45;if(d<mn){const k=(d-mn)/d*.5;
          if(i>2){l.X[a]+=dx*k;l.X[a+1]+=dy*k;l.X[a+2]+=dz*k;}l.X[b]-=dx*k*(i>2?1:2);l.X[b+1]-=dy*k*(i>2?1:2);l.X[b+2]-=dz*k*(i>2?1:2);}}
      // stay out of her head
      for(let i=1;i<LN;i++){const b=i*3,dx=l.X[b]-head.p[0],dy=l.X[b+1]-head.p[1],dz=l.X[b+2]-head.p[2],d=Math.hypot(dx,dy,dz)||1e-6;
        if(d<hR){const k=hR/d;l.X[b]=head.p[0]+dx*k;l.X[b+1]=head.p[1]+dy*k;l.X[b+2]=head.p[2]+dz*k;}}
      l.X.set(root,0);}
  }
}
let locP,locN,locC,locUV,locI;
function locBuffers(){
  const nv=LOCS.length*LN*LSIDES;locP=new Float32Array(nv*4);locN=new Float32Array(nv*3);locC=new Uint8Array(nv*4);locUV=new Float32Array(nv*2);
  const I=[];LOCS.forEach((l,li)=>{const b=li*LN*LSIDES;
    for(let i=0;i<LN-1;i++)for(let s=0;s<LSIDES;s++){const a=b+i*LSIDES+s,c=b+i*LSIDES+(s+1)%LSIDES;I.push(a,c,c+LSIDES,a,c+LSIDES,a+LSIDES);}
    for(let i=0;i<LN;i++)for(let s=0;s<LSIDES;s++){const v=b+i*LSIDES+s;locUV[v*2]=l.seed;locUV[v*2+1]=i/(LN-1);locP[v*4+3]=4;}});
  locI=new Uint32Array(I);
}
function fillLocs(){
  LOCS.forEach((l,li)=>{let nrm=null;
    for(let i=0;i<LN;i++){const a=Math.max(i-1,0)*3,c=Math.min(i+1,LN-1)*3;
      const T=norm([l.X[c]-l.X[a],l.X[c+1]-l.X[a+1],l.X[c+2]-l.X[a+2]]);
      nrm=norm(nrm?sub(nrm,mul(T,dot(nrm,T))):cross(T,Math.abs(T[1])<.9?[0,1,0]:[1,0,0]));const bn=cross(T,nrm);
      const r=l.rad*(1-.35*Math.pow(i/(LN-1),2));
      for(let s=0;s<LSIDES;s++){const th=TAU*s/LSIDES,cx=Math.cos(th),sy=Math.sin(th),v=li*LN*LSIDES+i*LSIDES+s;
        const n=[nrm[0]*cx+bn[0]*sy,nrm[1]*cx+bn[1]*sy,nrm[2]*cx+bn[2]*sy];
        locP[v*4]=l.X[i*3]+n[0]*r;locP[v*4+1]=l.X[i*3+1]+n[1]*r;locP[v*4+2]=l.X[i*3+2]+n[2]*r;locN.set(n,v*3);}}});
}

// ---------- drawing ----------
const VS=`#version 300 es
layout(location=0) in vec4 a_pos;layout(location=1) in vec3 a_nrm;layout(location=2) in vec4 a_col;layout(location=3) in vec2 a_uv;
uniform vec3 u_P[${NJ}],u_T[${NJ}],u_U[${NJ}];uniform float u_k,u_world,u_asp,u_t;uniform vec3 u_ro,u_fw,u_rt,u_up;
out vec3 v_wp,v_n;out vec4 v_col;out vec2 v_uv;out float v_kind,v_a;
void main(){vec3 wp,wn;v_kind=a_pos.w;v_a=a_pos.x;
  if(u_world>.5){wp=a_pos.xyz;wn=a_nrm;}
  else{float fi=a_pos.x/${AMAX.toFixed(3)}*${(NJ-1).toFixed(1)};float i0=clamp(floor(fi),0.,${(NJ-2).toFixed(1)});float f=fi-i0;int i=int(i0);
    vec3 p0=u_P[i],p1=u_P[i+1];vec3 T=normalize(mix(u_T[i],u_T[i+1],clamp(f,0.,1.)));
    vec3 Uv=normalize(mix(u_U[i],u_U[i+1],clamp(f,0.,1.)));Uv=normalize(Uv-T*dot(Uv,T));vec3 R=cross(T,Uv);
    vec2 off=a_pos.yz;
    if(a_pos.w>1.5&&a_pos.w<2.5){float th=a_uv.x*6.2832;off*=1.+.05*a_uv.y*sin(th*5.+u_t*2.1+a_col.r*9.)+.035*a_uv.y*sin(th*11.-u_t*3.3);}  // skirt hems drift
    if(a_pos.w>2.5&&a_pos.w<3.5)off.x+=.03*a_uv.y*sin(a_uv.x*1.7-u_t*4.);                                                                  // fin flutter
    wp=p0+(p1-p0)*f+(R*off.x+Uv*off.y)*u_k;wn=normalize(R*a_nrm.x+Uv*a_nrm.y-T*a_nrm.z);}
  v_wp=wp;v_n=wn;v_col=a_col;v_uv=a_uv;
  vec3 v=wp-u_ro;float z=dot(v,u_fw),x=dot(v,u_rt),y=dot(v,u_up);
  gl_Position=vec4(3.1*x/u_asp,3.1*y,(z*80.05-8.)/79.95,z);}`;
const FS=`#version 300 es
precision highp float;
in vec3 v_wp,v_n;in vec4 v_col;in vec2 v_uv;in float v_kind,v_a;
uniform vec3 u_ro;uniform float u_wy,u_t,u_wt;
layout(location=0) out vec4 o_c;layout(location=1) out vec4 o_d;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
// light through moving water
float caus(vec2 p,float t){p=mod(p*6.2832,6.2832)-250.;vec2 i=p;float c=1.;const float it=.005;
  for(int n=0;n<4;n++){float tt=t*(1.-3.5/float(n+1));i=p+vec2(cos(tt-i.x)+sin(tt+i.y),sin(tt-i.y)+cos(tt+i.x));
    c+=1./length(vec2(p.x/(sin(i.x+tt)/it),p.y/(cos(i.y+tt)/it)));}
  c/=4.;c=1.17-pow(c,1.4);return pow(abs(c),8.);}
vec3 pal(float h,int set){
  if(set==0){vec3 a[5]=vec3[5](vec3(.02,.22,.13),vec3(.03,.30,.18),vec3(.01,.14,.11),vec3(.05,.32,.24),vec3(.11,.26,.09));return a[int(h*4.999)];}
  if(set==1){vec3 a[5]=vec3[5](vec3(.55,.38,.12),vec3(.42,.28,.08),vec3(.66,.48,.18),vec3(.30,.20,.07),vec3(.50,.42,.22));return a[int(h*4.999)];}
  if(set==2){vec3 a[5]=vec3[5](vec3(.02,.22,.22),vec3(.03,.30,.26),vec3(.01,.14,.20),vec3(.05,.36,.30),vec3(.10,.30,.18));return a[int(h*4.999)];}
  vec3 a[5]=vec3[5](vec3(.03,.04,.22),vec3(.08,.04,.26),vec3(.02,.08,.30),vec3(.14,.05,.28),vec3(.01,.02,.12));return a[int(h*4.999)];}
// overlapping scales: which scale owns this point, how far along it, how near its rim
vec3 scales(vec2 g,int set,vec3 rim){
  float row=floor(g.y),best=2.;vec2 bid=vec2(0.);float bt=0.;
  for(int d=-1;d<=1;d++){float j=row+float(d),ox=.5*mod(j,2.);float c=floor(g.x-ox+.5);
    vec2 q=vec2(g.x-(c+ox),g.y-j);float dd=(q.x*q.x)/.36+(q.y*q.y)/1.3;
    if(dd<1.&&best>1.5){best=dd;bid=vec2(c,j);bt=clamp((q.y+1.14)/2.28,0.,1.);}}
  vec3 c=pal(h21(bid),set)*(.75+.5*h21(bid+7.3));
  c*=.35+.65*smoothstep(0.,.55,bt);
  c=mix(c,rim,smoothstep(.45,.85,best)*bt*.55);
  c*=1.-.7*smoothstep(.82,1.,best);
  return c*1.15;}
void main(){
  vec3 n=normalize(v_n);vec3 vd=normalize(u_ro-v_wp);if(dot(n,vd)<0.)n=-n;
  vec3 alb;float emi=0.,spec=.08;int k=int(v_kind+.5);
  if(k==0){alb=pow(v_col.rgb,vec3(2.2))*1.2;emi=v_col.a;}
  else if(k==1){alb=scales(vec2(v_uv.x*26.,v_a*150.),0,vec3(.78,.58,.20));spec=.35;alb=mix(alb,alb*1.5+vec3(.05,.08,.05),smoothstep(-.2,-.9,dot(v_n,vec3(0.,1.,0.)))*.0);}
  else if(k==2){int tier=int(v_col.r*2.+.5);alb=scales(vec2(v_uv.x*46.,v_uv.y*(5.+float(tier)*3.5)),1+tier,tier==0?vec3(.15,.62,.56):vec3(.78,.58,.20));spec=.3;}
  else if(k==3||k==5){float ray=pow(abs(sin(v_uv.x*3.1416*(k==3?1.:9.))),k==3?10.:14.);
    alb=mix(vec3(.07,.42,.36),vec3(.50,.40,.16),ray*.8);alb=mix(alb,vec3(.75,.55,.18),smoothstep(.6,1.,v_uv.y)*.5);alb*=1.25;spec=.2;}
  else{alb=vec3(.022,.024,.034)*1.6;float bead=step(.86,fract(v_uv.x*7.31))*smoothstep(.07,.0,abs(v_uv.y-(.35+.4*fract(v_uv.x*3.7))));
    alb=mix(alb,vec3(.85,.62,.2),bead);spec=mix(.25,.6,bead);}
  // the same sun the water uses, thinned and blued by the depth above her
  vec3 ld=normalize(vec3(.30,.85,.35));
  float depth=max(u_wy-v_wp.y,0.);
  vec3 sun=vec3(1.,.97,.9)*exp(-vec3(.75,.42,.36)*depth*.22)*1.7;
  float dif=max(dot(n,ld),0.)*.8+.2*max(dot(n,ld)*.5+.5,0.);
  float ca=caus(v_wp.xz*.55+ld.xz*depth*.3,u_wt*1.6)*smoothstep(-.1,.6,n.y)*exp(-depth*.28);
  vec3 amb=mix(vec3(.010,.045,.060),vec3(.10,.30,.32),n.y*.5+.5)*1.25;
  vec3 hv=normalize(ld+vd);
  vec3 col=alb*(amb+sun*dif*(.55+2.4*ca))+sun*spec*pow(max(dot(n,hv),0.),30.)*(.4+2.*ca);
  col+=vec3(.10,.95,.85)*emi*1.6;
  col+=vec3(.08,.22,.24)*pow(1.-max(dot(n,vd),0.),3.)*(.4+.6*max(n.y,0.));   // light wrapping her edges from above
  o_c=vec4(col,1.);o_d=vec4(clamp(length(v_wp-u_ro)/48.,0.,1.),0.,0.,1.);}`;
let gl,pr,UL={},vaoS,vaoL,nS=0,bufLP,bufLN,fbo,texC,texD,rbo,fw=0,fh=0,ready=false,failed=false;
function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(o));return o;}
function vao(P,Nn,C,UV,I,dyn){const v=gl.createVertexArray();gl.bindVertexArray(v);const out={};
  const b=(d,loc,n,type,nrm)=>{const bf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,bf);gl.bufferData(gl.ARRAY_BUFFER,d,dyn?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,type,!!nrm,0,0);return bf;};
  out.p=b(P,0,4,gl.FLOAT);out.n=b(Nn,1,3,gl.FLOAT);b(C,2,4,gl.UNSIGNED_BYTE,true);b(UV,3,2,gl.FLOAT);
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,I,gl.STATIC_DRAW);
  gl.bindVertexArray(null);out.v=v;return out;}
function target(W,H){const sc=Math.min(1.5,2200/Math.max(W,H)),w=Math.max(2,Math.round(W*sc)),h=Math.max(2,Math.round(H*sc));
  if(w===fw&&h===fh)return;fw=w;fh=h;
  const mk=(filt)=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filt);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filt);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
  if(texC){gl.deleteTexture(texC);gl.deleteTexture(texD);gl.deleteRenderbuffer(rbo);gl.deleteFramebuffer(fbo);}
  gl.activeTexture(gl.TEXTURE6);texC=mk(gl.LINEAR);texD=mk(gl.NEAREST);
  rbo=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,rbo);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);
  fbo=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texC,0);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT1,gl.TEXTURE_2D,texD,0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rbo);gl.bindFramebuffer(gl.FRAMEBUFFER,null);}
async function init(g){gl=g;if(OFF){failed=true;return;}
  try{
    const bin=await (await fetch('swimmer.bin')).arrayBuffer();
    pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
    ['u_P','u_T','u_U','u_k','u_world','u_asp','u_t','u_wt','u_ro','u_fw','u_rt','u_up','u_wy'].forEach(n=>UL[n]=gl.getUniformLocation(pr,n));
    const st=buildStatic(bin);nS=st.I.length;vaoS=vao(st.P,st.N,st.C,st.UV,st.I,false);
    buildLocs();locBuffers();stepSwim(1/60,-.15);stepLocs(1/60,0);fillLocs();
    vaoL=vao(locP,locN,locC,locUV,locI,true);
    ready=true;
  }catch(e){failed=true;console.warn('swimmer off:',e);}
}
// called once a frame, before the water is drawn. Leaves the swimmer in two textures for the water shader to fold in.
function frame(cam,W,H,wy,wt,dt,paused){
  if(!ready)return false;
  if(!paused){const n=Math.max(1,Math.min(4,Math.round(dt*60))),h=Math.min(dt,.1)/n;
    for(let i=0;i<n;i++){stepSwim(h,wy);stepLocs(h,S.t);}}
  fillLocs();
  target(W,H);
  gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);gl.drawBuffers([gl.COLOR_ATTACHMENT0,gl.COLOR_ATTACHMENT1]);
  gl.viewport(0,0,fw,fh);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.disable(gl.BLEND);
  gl.useProgram(pr);
  gl.uniform3fv(UL.u_P,Pj);gl.uniform3fv(UL.u_T,Tj);gl.uniform3fv(UL.u_U,Uj);
  gl.uniform1f(UL.u_k,K);gl.uniform1f(UL.u_asp,W/H);gl.uniform1f(UL.u_t,S.t);gl.uniform1f(UL.u_wt,wt);gl.uniform1f(UL.u_wy,wy);
  gl.uniform3fv(UL.u_ro,cam.ro);gl.uniform3fv(UL.u_fw,cam.fw);gl.uniform3fv(UL.u_rt,cam.rt);gl.uniform3fv(UL.u_up,cam.up);
  gl.uniform1f(UL.u_world,0);gl.bindVertexArray(vaoS.v);gl.drawElements(gl.TRIANGLES,nS,gl.UNSIGNED_INT,0);
  gl.bindVertexArray(vaoL.v);
  gl.bindBuffer(gl.ARRAY_BUFFER,vaoL.p);gl.bufferSubData(gl.ARRAY_BUFFER,0,locP);gl.bindBuffer(gl.ARRAY_BUFFER,vaoL.n);gl.bufferSubData(gl.ARRAY_BUFFER,0,locN);
  gl.uniform1f(UL.u_world,1);gl.drawElements(gl.TRIANGLES,locI.length,gl.UNSIGNED_INT,0);
  gl.bindVertexArray(null);gl.bindBuffer(gl.ARRAY_BUFFER,null);
  gl.disable(gl.DEPTH_TEST);gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  return true;
}
window.SWIM={init,frame,get texC(){return texC;},get texD(){return texD;},get ready(){return ready;},state:S};
})();
