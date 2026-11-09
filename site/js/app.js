/* Blackout Coder engine. Data comes from site/data via js/registry.js; pure helpers from js/core.js. */
(function () {
"use strict";
const {tokenize,hash,rng,sig,analyzeText,isCompleteFor}=BCcore;

/* ---------- ranks ---------- */
const RANKS=[
  {name:'Beginner',    w:0,   s:0,   live:true,  blurb:'Copy every character.'},
  {name:'Dabbler',     w:.2,  s:0,   live:true,  blurb:'About 1 in 5 words blacked out.'},
  {name:'Hobbyist',    w:.4,  s:0,   live:true,  blurb:'About 2 in 5 words blacked out.'},
  {name:'Student',     w:.6,  s:.1,  live:true,  blurb:'Most names hidden. Symbols start to go.'},
  {name:'Apprentice',  w:.8,  s:.35, live:true,  blurb:'Mostly shape. You supply the words.'},
  {name:'Professional',w:.95, s:.75, live:false, blurb:'Nearly blind. No live coloring; press Check to grade.'},
  {name:'Master',      w:1,   s:1,   live:false, blurb:'Only the goal and the shape. Write it yourself.'}
];
const NEED=3, PASS=90;

/* ---------- data ---------- */
const LD=BC.languages;
Object.values(LD).forEach(d=>{d.kwSet=new Set((d.kw||'').split(' ').filter(Boolean));});
const LANES=BC.lanes;
const TRACKS=BC.tracks;

/* ---------- helpers ---------- */
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function nbIdx(toks,j,dir){for(let i=j+dir;i>=0&&i<toks.length;i+=dir){if(toks[i].k!=='ws')return i;}return -1;}
const fmtTime=ms=>{const s=Math.floor(ms/1000);return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};

/* ---------- state ---------- */
const KEY='blackout-coder-v1';
let S={mode:'found',lane:'python',track:'t-plc',per:{}};
try{const raw=localStorage.getItem(KEY);if(raw){const o=JSON.parse(raw);if(o&&o.per){if(o.lang&&!o.lane)o.lane=o.lang;delete o.lang;S=Object.assign(S,o);}}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
function laneObj(){
  if(S.mode==='proj')return TRACKS.find(t=>t.id===S.track&&!t.soon)||TRACKS[0];
  return LANES.find(l=>l.id===S.lane)||LANES[0];
}
function P(){if(!S.per[lane.id])S.per[lane.id]={lesson:0,earned:0,rank:0,prog:0,best:{}};return S.per[lane.id];}

let lane,ld,lesson,idx=0,pre='',cur,typed=0,errors=0,peeks=0,startT=0,endT=0,complete=false,checked=false,programmatic=false,lastA=null,timer=null,peekTimer=null;
const ta=$('ta'),hl=$('hl'),tgt=$('tgt');
const inTrack=()=>S.mode==='proj';

/* ---------- syntax classes ---------- */
function hlClass(toks,j){
  const tk=toks[j];
  if(tk.k==='str')return 'c-str';
  if(tk.k==='num')return 'c-num';
  if(tk.k==='sym')return 'c-sym';
  const pi=nbIdx(toks,j,-1),ni=nbIdx(toks,j,1);
  const prev=pi>=0?toks[pi]:null,next=ni>=0?toks[ni]:null;
  if(ld.markup==='html'){
    const p2=pi>=0?nbIdx(toks,pi,-1):-1;
    if(prev&&(prev.t==='<'||(prev.t==='/'&&p2>=0&&toks[p2].t==='<')))return 'c-tag';
    if(next&&next.t==='=')return 'c-attr';
    return '';
  }
  if(ld.markup==='css'){
    if(prev&&prev.t==='.')return 'c-tag';
    if(next&&next.t===':')return 'c-attr';
    return '';
  }
  if(ld.kwSet.has(tk.t))return 'c-kw';
  if(next&&next.t==='(')return 'c-fn';
  return '';
}
function hlPlain(text){
  return text.split('\n').map(line=>{const toks=tokenize(line);return toks.map((tk,j)=>tk.k==='ws'?esc(tk.t):`<span class="${hlClass(toks,j)}">${esc(tk.t)}</span>`).join('');}).join('\n');
}

/* ---------- target rendering ---------- */
function renderTarget(){
  const R=RANKS[P().rank],rand=rng(hash(lane.id+'|'+lesson.t)),seen=new Set();
  let k=0,html='';
  cur.lines.forEach(line=>{
    const toks=tokenize(line),blank=!line.trim();let s='';
    toks.forEach((tk,j)=>{
      if(tk.k==='ws'){s+=esc(tk.t);return;}
      let r=rand(),masked;
      if(tk.k==='sym')masked=r<R.s;
      else{
        if(tk.k==='str')r=0.45+r*0.55;
        else if(seen.has(tk.t))r*=0.6;
        masked=r<R.w;seen.add(tk.t);
      }
      s+=`<span class="${hlClass(toks,j)}${masked?' m':''}" data-t="${esc(tk.t)}">${esc(tk.t)}</span>`;
    });
    html+=`<span class="ln" data-k="${blank?-1:k}">${s||' '}</span>`;
    if(!blank)k++;
  });
  tgt.innerHTML=html;
  const pct=Math.round(R.w*100);
  $('maskHint').textContent=R.w===0?'Nothing hidden':(R.w===1?'Everything hidden':`${pct}% of words hidden${R.s?' · some symbols':''}`);
  $('modeHint').textContent=R.live?'Live coloring · Tab indents · Enter auto-indents':'No live coloring · Ctrl+Enter to check';
  $('peekBtn').disabled=R.w===0;
  $('peekBtn').style.opacity=R.w===0?.45:1;
}
function renderCtx(){
  ['ctxU','ctxT'].forEach(id=>{
    const el=$(id);
    if(!pre){el.hidden=true;return;}
    el.hidden=false;
    el.querySelector('pre').innerHTML=hlPlain(pre);
    el.querySelector('.ctx-n').textContent=`${pre.split('\n').length} lines · ${lesson.file}`;
  });
  requestAnimationFrame(()=>{document.querySelectorAll('.ctx pre').forEach(p=>{p.scrollTop=p.scrollHeight;});});
}

/* ---------- comparison ---------- */
function analyze(text){return analyzeText(text,cur.T,!!ld.py);}
const isComplete=a=>isCompleteFor(a,cur.T);
function statusAt(a,pos){
  if(pos<0)return 'ws';let i=0;
  const lines=ta.value.split('\n');
  for(let li=0;li<lines.length;li++){const L=lines[li].length;if(pos<i+L)return a.res[li].st[pos-i]||'ws';if(pos===i+L)return 'ws';i+=L+1;}
  return 'ws';
}

/* ---------- render user side ---------- */
function renderHL(a){
  const live=RANKS[P().rank].live,lines=ta.value.split('\n');let html='';
  lines.forEach((u,i)=>{
    const r=a.res[i];let cls='ln';
    if(checked&&r.k>=0)cls+=r.state==='done'?' l-ok':' l-bad';
    let s='',runSt=null,run='';
    for(let j=0;j<u.length;j++){
      const st=live?(r.st[j]==='ws'?'n':r.st[j]):'n';
      if(st!==runSt){if(run)s+=`<span class="${runSt}">${esc(run)}</span>`;run='';runSt=st;}
      run+=u[j];
    }
    if(run)s+=`<span class="${runSt}">${esc(run)}</span>`;
    html+=`<span class="${cls}">${s||' '}</span>`;
  });
  hl.innerHTML=html+'<span class="ln"> </span><span class="ln"> </span>';
  hl.scrollTop=ta.scrollTop;hl.scrollLeft=ta.scrollLeft;
}
function markTarget(a){
  const caretLine=ta.value.slice(0,ta.selectionStart).split('\n').length-1;
  let kk=0;for(let i=0;i<caretLine;i++){if(a.res[i]&&a.res[i].k>=0)kk++;}
  tgt.querySelectorAll('.ln').forEach(el=>{const k=+el.dataset.k;el.classList.toggle('cur',k===kk&&!complete&&k>=0);el.classList.toggle('td',a.doneK.has(k));});
}
function renderStats(){
  const now=endT||performance.now(),ms=startT?now-startT:0,min=ms/60000;
  $('sWpm').textContent=startT&&min>0.03?Math.round((typed/5)/min):0;
  $('sAcc').textContent=typed?Math.max(0,Math.round(100*(typed-errors)/typed))+'%':'--';
  $('sTime').textContent=fmtTime(ms);
  $('sLines').textContent=(lastA?lastA.doneK.size:0)+'/'+cur.T.length;
  $('sPeek').textContent=peeks;
}
function renderAll(a){lastA=a;renderHL(a);markTarget(a);renderStats();renderLiveViz();}

/* ---------- ladder drawing ---------- */
const LBOX=new Set(['TON','TOF','RTO','CTU','CTD','RES','MOV','ADD','SUB','MUL','DIV','CPT','GRT','GEQ','LES','LEQ','EQU','NEQ','LIM']);
const LCMP=new Set(['GRT','GEQ','LES','LEQ','EQU','NEQ']),LMATH=new Set(['ADD','SUB','MUL','DIV']);
// Text shown inside an instruction box, one entry per line
function boxLines(it){
  const a=i=>it.args[i]===undefined?'':it.args[i],op=it.op;
  if(op==='MOV')return ['Src '+a(0),'Dest '+a(1)];
  if(LCMP.has(op))return ['A '+a(0),'B '+a(1)];
  if(op==='LIM')return ['Low '+a(0),'Test '+a(1),'High '+a(2)];
  if(LMATH.has(op))return ['A '+a(0),'B '+a(1),'Dest '+a(2)];
  if(op==='CPT')return ['Dest '+a(0),'Expr '+a(1)];
  const l=[a(0)];if(it.args[1]!==undefined)l.push('Pre '+it.args[1]);return l;
}
const LCW=6.4; // approximate width of one 10.5px code character, so long labels widen their box
let lowY=0; // lowest box edge drawn so far, so the drawing is tall enough for 3-line boxes
const U=124,RH=72;
// The diagram reads rungs with the interpreter's parser (js/plc.js), so the drawing and the
// simulation can never disagree. The parse is best effort, so a half-typed rung still draws.
const parseRung=s=>BCplc.parseRung(s).items;
const iw=it=>it.br?Math.max(0.5,...it.rows.map(sw)):(LBOX.has(it.op)?Math.max(1.5,(Math.max(it.op.length,...boxLines(it).map(t=>t.length))*LCW+36)/U):1);
const sw=seq=>seq.reduce((a,it)=>a+iw(it),0);
const ih=it=>it.br?it.rows.reduce((a,r)=>a+sh(r),0):1;
const sh=seq=>Math.max(1,...seq.map(ih));
const L=(x1,y1,x2,y2,c='w')=>`<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const TX=(x,y,s,c,anchor)=>`<text class="${c}" x="${x}" y="${y}"${anchor?` text-anchor="${anchor}"`:''}>${esc(s)}</text>`;
// pw: optional power map from the simulator (BCplc controller .power), item -> [rung in, rung out].
// Energized wires and true instructions get class "on". Without pw the drawing is unchanged.
const wc=on=>on?'w on':'w';
function drawIns(it,x,y,w,out,pw){
  const x2=x+w,cx=(x+x2)/2,op=it.op,tag=it.args[0]||'',st=pw&&pw.get(it),ri=!!(st&&st[0]),ro=!!(st&&st[1]);
  if(op==='XIC'||op==='XIO'){
    out.push(L(x,y,cx-11,y,wc(ri)),L(cx+11,y,x2,y,wc(ro)),L(cx-11,y-14,cx-11,y+14,wc(ro)),L(cx+11,y-14,cx+11,y+14,wc(ro)));
    if(op==='XIO')out.push(L(cx-11,y+14,cx+11,y-14,wc(ro)));
    out.push(TX(cx,y-22,tag,'tag'));
  }else if(op==='ONS'){
    out.push(L(x,y,cx-20,y,wc(ri)),L(cx+20,y,x2,y,wc(ro)),`<rect class="box${ro?' on':''}" x="${cx-20}" y="${y-12}" width="40" height="24" rx="2"/>`,TX(cx,y+4,'ONS','op','middle'),TX(cx,y-22,tag,'tag'));
  }else if(op==='OTE'||op==='OTL'||op==='OTU'){
    out.push(L(x,y,cx-14,y,wc(ri)),L(cx+14,y,x2,y,wc(ro)));
    out.push(`<path class="${wc(ri)}" d="M${cx-8} ${y-14} A16 16 0 0 0 ${cx-8} ${y+14}"/>`,`<path class="${wc(ri)}" d="M${cx+8} ${y-14} A16 16 0 0 1 ${cx+8} ${y+14}"/>`);
    if(op!=='OTE')out.push(TX(cx,y+4,op==='OTL'?'L':'U','op','middle'));
    out.push(TX(cx,y-22,tag,'tag'));
  }else{
    const bx=x+10,bw=w-20,lines=boxLines(it),bh=lines.length>2?66:52;
    lowY=Math.max(lowY,y-26+bh);
    out.push(L(x,y,bx,y,wc(ri)),L(bx+bw,y,x2,y,wc(ro)),`<rect class="box${ro?' on':''}" x="${bx}" y="${y-26}" width="${bw}" height="${bh}" rx="3"/>`,TX(bx+8,y-11,op,'op'));
    lines.forEach((t,i)=>out.push(TX(bx+8,y+4+i*14,t,'arg')));
  }
}
function drawSeq(seq,x,y,out,pw){for(const it of seq){const w=iw(it)*U;if(it.br)drawBr(it,x,y,w,out,pw);else drawIns(it,x,y,w,out,pw);x+=w;}return x;}
const legOut=(r,rin,pw)=>r.length?!!((pw.get(r[r.length-1])||[])[1]):rin;
function drawBr(b,x,y,w,out,pw){
  const st=pw&&pw.get(b),ri=!!(st&&st[0]),ro=!!(st&&st[1]);
  let yy=y,last=y;
  b.rows.forEach(r=>{const ex=drawSeq(r,x,yy,out,pw);if(ex<x+w)out.push(L(ex,yy,x+w,yy,wc(pw&&legOut(r,ri,pw))));last=yy;yy+=sh(r)*RH;});
  out.push(L(x,y,x,last,wc(ri)),L(x+w,y,x+w,last,wc(ro)));
}
// rungs: parsed rung item lists. pw: optional power map (see drawIns).
function svgLadderFrom(rungs,pw){
  rungs=rungs.filter(r=>r.length);
  if(!rungs.length)return '<p class="viz-empty">Type a rung and it draws here.</p>';
  const maxW=Math.max(4,...rungs.map(sw)),X0=34,RR=X0+12+maxW*U+16,W=RR+12;
  const out=[];let y=42;lowY=0;
  rungs.forEach((r,i)=>{out.push(TX(16,y+4,String(i),'num'),L(X0,y,X0+12,y,wc(!!pw)));const ex=drawSeq(r,X0+12,y,out,pw);out.push(L(ex,y,RR,y,wc(pw&&legOut(r,true,pw))));y+=sh(r)*RH;});
  const H=Math.max(y-RH+40,lowY+14);
  out.unshift(L(X0,10,X0,H-8,'rail'),L(RR,10,RR,H-8,'rail'));
  return `<div class="scroll"><svg class="lad" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ladder rung diagram">${out.join('')}</svg></div>`;
}
const svgLadder=code=>svgLadderFrom(code.split('\n').map(s=>s.trim()).filter(Boolean).map(parseRung),null);
const joinPre=t=>pre?(pre+'\n'+t):t;

/* ---------- html / css preview ---------- */
function docs(u,runUser){
  if(!inTrack())return {t:{h:lesson.code,j:''},u:{h:u,j:''}};
  let tH='',tC='',tJ='',uH='',uC='',uJ='';
  lane.lessons.slice(0,idx+1).forEach((l,i)=>{
    if(!LD[l.lang].preview)return;
    const cur=i===idx,tc=l.code,uc=cur?u:l.code;
    if(l.lang==='css'){tC+=tc+'\n';uC+=uc+'\n';}
    else if(l.lang==='js'){tJ+=tc+'\n';if(!cur||runUser)uJ+=uc+'\n';}
    else{tH+=tc+'\n';uH+=uc+'\n';}
  });
  return {t:{h:`<style>${tC}</style>${tH}`,j:tJ},u:{h:`<style>${uC}</style>${uH}`,j:uJ}};
}
function runJS(host,code){
  (host._timers||[]).forEach(id=>clearInterval(id));host._timers=[];
  if(!code||!code.trim())return;
  const sr=host.shadowRoot;
  const doc={getElementById:id=>sr.getElementById(id),querySelector:s=>sr.querySelector(s),querySelectorAll:s=>sr.querySelectorAll(s),createElement:t=>document.createElement(t),createTextNode:t=>document.createTextNode(t)};
  const si=(f,ms)=>{const id=setInterval(()=>{try{f();}catch(e){}},Math.max(+ms||0,1000));host._timers.push(id);return id;};
  const st=(f,ms)=>{const id=setTimeout(()=>{try{f();}catch(e){}},ms);host._timers.push(id);return id;};
  const net=()=>Promise.reject(new Error('The preview has no network.'));
  try{new Function('document','setInterval','setTimeout','fetch',code)(doc,si,st,net);}
  catch(e){const d=document.createElement('div');d.setAttribute('style','margin:10px;padding:8px 10px;background:#4a1d22;color:#ffd6d6;font:13px monospace;border-radius:4px');d.textContent='Script error: '+e.message;sr.appendChild(d);}
}
function preview(host,doc){
  const html=typeof doc==='string'?doc:doc.h,js=typeof doc==='string'?'':doc.j;
  if(!host.shadowRoot){
    const sr=host.attachShadow({mode:'open'});
    sr.addEventListener('submit',e=>e.preventDefault(),true);
    sr.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('a')){e.preventDefault();flash('Links are switched off in the preview.');}},true);
  }
  const clean=html.replace(/<script[\s\S]*?(<\/script>|$)/gi,'').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'');
  const css=clean.replace(/<style>([\s\S]*?)<\/style>/gi,(m,c)=>'<style>'+c.replace(/:root/g,':host').replace(/(^|[\s,}])body(\s*[{,])/g,'$1:host$2')+'</style>');
  host.shadowRoot.innerHTML='<style>:host{display:block;background:#fbfaf6;color:#1b1b1b;padding:14px;border-radius:4px;font-family:Georgia,serif;min-height:90px}table{border-collapse:collapse;color:inherit;font:inherit}td,th{border:1px solid #b9b3a3;padding:4px 10px}img{max-width:100%}</style>'+css;
  runJS(host,js);
}

/* ---------- reference section ---------- */
function renderRef(){
  $('refEyebrow').textContent=`${lane.name} · ${inTrack()?'Step':'Lesson'} ${idx+1} · ${ld.name}`;
  $('refTitle').textContent=lesson.t;
  $('about').textContent=lesson.about;
  $('langNote').textContent=ld.note;
  $('terms').innerHTML=lesson.terms.map((t,i)=>`<button class="term" data-i="${i}" aria-pressed="false"><code>${esc(t[1])}</code><span>${esc(t[2])}</span></button>`).join('');
  const viz=$('viz');
  if(ld.diagram){
    viz.hidden=false;
    viz.innerHTML=`<figure><figcaption>Target routine</figcaption><div id="vizT">${svgLadder(joinPre(lesson.code))}</div></figure><figure><figcaption>Your routine</figcaption><div id="vizU"></div></figure>`;
  }else if(ld.preview){
    viz.hidden=false;
    viz.innerHTML=`<figure><figcaption>Target page</figcaption><div class="preview-host" id="prevT"></div></figure><figure><figcaption>Your page${ld.id==='js'?' · script runs when you finish or press Check':''}</figcaption><div class="preview-host" id="prevU"></div></figure>`;
    preview($('prevT'),docs('',false).t);
  }else if(lesson.outHtml){
    viz.hidden=false;
    viz.innerHTML=`<figure style="grid-column:1 / -1"><figcaption>Generated page</figcaption><div class="preview-host" id="prevO"></div></figure>`;
    preview($('prevO'),lesson.outHtml);
  }else{viz.hidden=true;viz.innerHTML='';}
  $('outWrap').hidden=!lesson.out;
  $('out').textContent=lesson.out||'';
  renderSimPanel();
}
function renderLiveViz(){
  renderSimLock();
  if(ld.diagram){const v=$('vizU');if(v)v.innerHTML=svgLadder(joinPre(ta.value));}
  else if(ld.preview){const v=$('prevU');if(v)preview(v,docs(ta.value,complete||checked).u);}
}
$('terms').addEventListener('click',e=>{
  const b=e.target.closest('.term');if(!b)return;
  const t=lesson.terms[+b.dataset.i],on=b.getAttribute('aria-pressed')!=='true';
  document.querySelectorAll('.term').forEach(x=>x.setAttribute('aria-pressed','false'));
  tgt.querySelectorAll('.hit').forEach(x=>x.classList.remove('hit'));
  if(!on)return;
  b.setAttribute('aria-pressed','true');
  if(t[0]===null){flash('This one is a concept, not a single word in the code.');return;}
  let n=0;tgt.querySelectorAll('[data-t]').forEach(sp=>{if(sp.dataset.t===t[0]){sp.classList.add('hit');n++;}});
  if(!n)flash('Not in this step\'s code. It may be in the earlier steps above.');
});

/* ---------- PLC simulator ---------- */
// Runs the learner's own ladder or Structured Text in BCplc (js/plc.js), with inputs taken from
// the lesson's scenario, a live tag table, energized paths on the ladder, and for the Conveyor 3
// steps (sim.scene "conveyor3") a small machine. A teaching model, not a PLC: docs/PLC_INTERPRETER.md.
// Like the Plant Board's JavaScript, it only runs once the step is finished or Check is pressed.
let sim=null;
const isPlcLang=()=>ld&&(ld.id==='ladder'||ld.id==='st');
const simCode=()=>joinPre(ta.value);
const STATE_NAMES={1:'RUNNING',2:'FAULTED',3:'IDLE'};
// Inputs the scenario drives. A pushbutton (pulsed, or named *_PB) is held while pressed and
// springs back to its rest value: 1 for a normally closed Stop_PB, else 0. Anything else toggles.
function simInputs(s){
  const m=new Map();
  const get=k=>{if(!m.has(k))m.set(k,{tag:k,rest:0,press:1,pulsed:false});return m.get(k);};
  for(const [k,v] of Object.entries(s.start||{}))get(k).rest=v;
  for(const st of s.steps||[]){
    for(const k of Object.keys(st.set||{}))get(k);
    for(const [k,v] of Object.entries(st.pulse||{})){const e=get(k);e.pulsed=true;e.press=v;}
  }
  for(const e of m.values())if(!e.pulsed&&/_PB$/.test(e.tag))e.press=e.rest?0:1;
  return [...m.values()].map(e=>({...e,momentary:e.pulsed||/_PB$/.test(e.tag)}));
}
// Conveyor 3 jam cell: barrels ride the belt while Conv_Run is on, and the photo eye drives
// Eye_Blocked from where they are. "Jam a barrel" sticks the next barrel at the eye.
function conveyorScene(plc){
  const S={barrels:[],gap:999,jamNext:false,stuck:null,EYE:430,W:44,LEN:640,SPEED:120,blocked:false};
  const on=t=>plc.has(t)&&!!plc.read(t);
  S.step=dt=>{
    if(on('Conv_Run')){
      const d=S.SPEED*dt/1000;
      S.gap+=d;
      if(S.gap>=130){S.barrels.push({x:-S.W});S.gap=0;}
      S.barrels.sort((a,b)=>b.x-a.x);
      let limit=Infinity;
      for(const b of S.barrels){
        if(b!==S.stuck){
          let nx=b.x+d;
          if(S.jamNext&&!S.stuck&&b.x+S.W/2<S.EYE&&nx+S.W/2>=S.EYE){nx=S.EYE-S.W/2;S.stuck=b;S.jamNext=false;}
          if(nx+S.W>limit)nx=limit-S.W;
          b.x=Math.max(b.x,nx);
        }
        limit=b.x-4;
      }
      S.barrels=S.barrels.filter(b=>b.x<S.LEN);
    }
    S.blocked=S.barrels.some(b=>b.x<=S.EYE&&b.x+S.W>=S.EYE);
    if(plc.has('Eye_Blocked'))plc.write('Eye_Blocked',S.blocked?1:0);
  };
  S.clear=()=>{if(S.stuck)S.barrels=S.barrels.filter(b=>b!==S.stuck);S.stuck=null;S.jamNext=false;};
  S.svg=()=>{
    const run=on('Conv_Run'),jam=on('Jam_Fault'),o=[];
    o.push('<rect class="sc-belt" x="0" y="110" width="640" height="14" rx="3"/>');
    for(let x=20;x<640;x+=80)o.push(`<circle class="sc-roller" cx="${x}" cy="117" r="5"/>`);
    for(const b of S.barrels){
      o.push(`<g class="sc-barrel${b===S.stuck?' jam':''}"><rect x="${b.x.toFixed(1)}" y="66" width="${S.W}" height="44" rx="7"/><line x1="${b.x.toFixed(1)}" y1="78" x2="${(b.x+S.W).toFixed(1)}" y2="78"/><line x1="${b.x.toFixed(1)}" y1="98" x2="${(b.x+S.W).toFixed(1)}" y2="98"/></g>`);
    }
    o.push(`<rect class="sc-eye" x="${S.EYE-7}" y="22" width="14" height="18" rx="2"/><line class="sc-beam${S.blocked?' blocked':''}" x1="${S.EYE}" y1="40" x2="${S.EYE}" y2="110"/><text class="sc-label" x="${S.EYE+12}" y="34">Eye_Blocked ${S.blocked?1:0}</text>`);
    o.push(`<rect class="sc-motor${run?' on':''}" x="6" y="130" width="46" height="30" rx="4"/><text class="sc-label dark" x="29" y="149" text-anchor="middle">M</text><text class="sc-label" x="60" y="150">Conv_Run ${run?1:0}</text>`);
    const lamp=(c,y,lit)=>`<circle class="sc-lamp ${c}${lit?' on':''}" cx="612" cy="${y}" r="9"/>`;
    o.push('<rect class="sc-pole" x="609" y="12" width="6" height="98"/>',lamp('r',22,jam),lamp('a',44,!run&&!jam),lamp('g',66,run));
    if(plc.has('Barrel_Count'))o.push(`<text class="sc-lcd" x="8" y="24">BARRELS ${String(plc.read('Barrel_Count.ACC')).padStart(4,'0')}</text>`);
    if(plc.has('Conv_State')){const v=plc.read('Conv_State');o.push(`<text class="sc-lcd" x="8" y="48">STATE ${v} ${STATE_NAMES[v]||''}</text>`);}
    return `<svg viewBox="0 0 640 170" role="img" aria-label="Conveyor 3: barrels on the belt, photo eye, motor and stack light">${o.join('')}</svg>`;
  };
  return S;
}
function stopSim(){if(sim&&sim.raf)cancelAnimationFrame(sim.raf);sim=null;}
function simMsg(text,err){const m=$('simMsg');if(m){m.textContent=text;m.classList.toggle('err',!!err);}}
// Build the panel for this lesson (or hide it). Called from renderRef.
function renderSimPanel(){
  stopSim();
  const box=$('sim');
  if(!isPlcLang()||!lesson.sim){box.hidden=true;box.innerHTML='';return;}
  box.hidden=false;
  box.innerHTML=`<div class="sim-head"><div><b>Simulator</b><span class="sim-note">Runs your code with simulated ${lesson.sim.scanMs||10} ms scans. A teaching model, not a PLC.</span></div>
<div class="sim-ctl"><button class="btn gold" id="simRun">Run your code</button><button class="btn" id="simStep" title="Run one scan">Step</button><select id="simSpeed" aria-label="Speed"><option value="1">1×</option><option value="5">5×</option><option value="20">20×</option></select><button class="btn" id="simReset">Reset</button><span class="sim-clock" id="simClock">t 0.0 s</span></div></div>
<p class="sim-msg" id="simMsg"></p><div class="sim-scene" id="simScene" hidden></div>
<div class="sim-body"><div class="sim-inputs" id="simInputs"></div><table class="sim-watch" id="simWatch"></table></div><div class="sim-lad" id="simLad"></div>`;
  $('simRun').addEventListener('click',()=>{if(!sim&&!simBuild())return;sim.running?simPause():simPlay();});
  $('simStep').addEventListener('click',()=>{if(!sim&&!simBuild())return;simPause();try{simScan();}catch(e){simFail(e);}simDraw();});
  $('simReset').addEventListener('click',()=>{stopSim();simBuild();});
  $('simSpeed').addEventListener('change',e=>{if(sim)sim.speed=+e.target.value;});
  renderSimLock();
}
// Locked until the step is finished or checked, like the Plant Board's JavaScript.
function renderSimLock(){
  if(!$('simRun')||!isPlcLang()||!lesson.sim)return;
  const ok=complete||checked;
  ['simRun','simStep','simReset','simSpeed'].forEach(id=>$(id).disabled=!ok);
  if(!ok){if(sim)stopSim();simMsg('Finish the step or press Check, then run your code here.');}
  else if(!sim)simMsg('Press Run, then use the inputs to drive your logic.');
}
function simBuild(){
  const s=lesson.sim;
  try{
    const plc=BCplc.createPLC({scanMs:s.scanMs||10,types:s.types});
    plc.load(simCode(),ld.id);
    for(const [k,v] of Object.entries(s.start||{}))if(plc.has(k))plc.write(k,v);
    const scene=s.scene==='conveyor3'&&plc.has('Conv_Run')?conveyorScene(plc):null;
    sim={plc,scene,running:false,raf:0,acc:0,last:null,speed:+$('simSpeed').value,sig:'',prev:{}};
  }catch(e){sim=null;simMsg(`Your code does not run yet: ${e.message}`,true);return false;}
  const inputs=simInputs(s).filter(i=>sim.plc.has(i.tag)&&!(sim.scene&&i.tag==='Eye_Blocked'));
  $('simInputs').innerHTML=inputs.map(i=>{
    const t=sim.plc.typeOf(i.tag),num=i.tag.includes('.')||t==='DINT'||t==='REAL';
    if(num)return `<label class="sim-num">${esc(i.tag)}<input type="number" step="any" data-tag="${esc(i.tag)}" value="${sim.plc.read(i.tag)}"></label>`;
    return `<button class="sim-in" data-tag="${esc(i.tag)}" data-mode="${i.momentary?'hold':'toggle'}" data-rest="${i.rest}" data-press="${i.press}" aria-pressed="false">${esc(i.tag)}<small>${i.momentary?'hold to press':'switch'}</small></button>`;
  }).join('')+(sim.scene?'<button class="btn" id="simJam">Jam a barrel at the eye</button><button class="btn" id="simClear">Clear the jam</button>':'');
  wireSimInputs();
  $('simWatch').innerHTML=`<caption>Tags</caption>`+s.watch.map(w=>`<tr><th scope="row">${esc(w)}</th><td data-w="${esc(w)}"></td></tr>`).join('');
  $('simScene').hidden=!sim.scene;
  if(ld.id==='st')$('simLad').innerHTML='<p class="viz-empty">Structured Text has no rung drawing; watch the tags.</p>';
  simMsg(sim.scene?'Press Start_PB to run the conveyor, then jam a barrel and watch your logic respond.':'Use the inputs to drive your logic. Energized paths light up green.');
  simDraw(); // show the starting state at once, not on the first animation frame
  return true;
}
function wireSimInputs(){
  const box=$('simInputs');
  const hold=(b,down)=>{if(!sim)return;sim.plc.write(b.dataset.tag,+(down?b.dataset.press:b.dataset.rest));simDraw();};
  box.querySelectorAll('.sim-in[data-mode="hold"]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);hold(b,true);});
    ['pointerup','pointercancel','lostpointercapture'].forEach(ev=>b.addEventListener(ev,()=>hold(b,false)));
    b.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat){e.preventDefault();hold(b,true);}});
    b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();hold(b,false);}});
  });
  box.querySelectorAll('.sim-in[data-mode="toggle"]').forEach(b=>b.addEventListener('click',()=>{if(!sim)return;sim.plc.write(b.dataset.tag,sim.plc.read(b.dataset.tag)?0:1);simDraw();}));
  box.querySelectorAll('.sim-num input').forEach(inp=>inp.addEventListener('change',()=>{
    if(!sim)return;const v=Number(inp.value);
    try{sim.plc.write(inp.dataset.tag,v);}catch(e){simMsg(e.message,true);inp.value=sim.plc.read(inp.dataset.tag);}
    simDraw();
  }));
  if($('simJam'))$('simJam').addEventListener('click',()=>{if(sim&&sim.scene){sim.scene.jamNext=true;simMsg('The next barrel will stick at the eye.');}});
  if($('simClear'))$('simClear').addEventListener('click',()=>{if(sim&&sim.scene){sim.scene.clear();sim.stuckNoted=false;simDraw();simMsg('Jam cleared from the belt. The fault stays latched until Reset_PB.');}});
}
function simScan(){if(sim.scene)sim.scene.step(sim.plc.scanMs);sim.plc.scan();}
function simFail(e){simPause();simMsg(`Stopped: ${e.message}`,true);}
function simPlay(){if(!sim)return;sim.running=true;sim.last=null;$('simRun').textContent='Pause';sim.raf=requestAnimationFrame(simFrame);}
function simPause(){if(!sim)return;sim.running=false;if(sim.raf)cancelAnimationFrame(sim.raf);sim.raf=0;if($('simRun'))$('simRun').textContent='Run';}
function simFrame(ts){
  if(!sim||!sim.running)return;
  const dt=sim.last===null?0:Math.min(250,ts-sim.last);
  sim.last=ts;sim.acc+=dt*sim.speed;
  try{let n=0;while(sim.acc>=sim.plc.scanMs&&n<5000){simScan();sim.acc-=sim.plc.scanMs;n++;}}
  catch(e){simFail(e);simDraw();return;}
  simDraw();
  sim.raf=requestAnimationFrame(simFrame);
}
function simDraw(){
  if(!sim)return;
  const p=sim.plc;
  $('simClock').textContent=`t ${(p.time/1000).toFixed(1)} s`;
  document.querySelectorAll('#simWatch td[data-w]').forEach(td=>{
    const w=td.dataset.w,ty=w.includes('.')?(/(ACC|PRE)$/.test(w)?'DINT':'BOOL'):p.typeOf(w),v=BCplc.formatValue(p.read(w),ty);
    if(sim.prev[w]!==undefined&&sim.prev[w]!==v){td.classList.add('chg');clearTimeout(td._t);td._t=setTimeout(()=>td.classList.remove('chg'),600);}
    sim.prev[w]=v;td.textContent=v;
  });
  document.querySelectorAll('#simInputs .sim-in').forEach(b=>b.setAttribute('aria-pressed',String(+p.read(b.dataset.tag)!==(b.dataset.mode==='hold'?+b.dataset.rest:0))));
  if(sim.scene){
    $('simScene').innerHTML=sim.scene.svg();
    if(sim.scene.stuck&&!sim.stuckNoted){sim.stuckNoted=true;simMsg('A barrel is stuck at the eye. Watch whether your logic catches the jam.');}
  }
  if(ld.id==='ladder'){
    let sig='';for(const v of p.power.values())sig+=(v[0]?1:0)+''+(v[1]?1:0);
    if(sig!==sim.sig||!$('simLad').firstChild){sim.sig=sig;$('simLad').innerHTML=svgLadderFrom(p.rungs.map(r=>r.items),p.scans?p.power:null);}
  }
}

/* ---------- top chrome ---------- */
function renderNav(){
  document.querySelectorAll('#modes button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.m===S.mode)));
  const list=inTrack()?TRACKS:LANES;
  $('langs').innerHTML=list.map(l=>`<button role="tab" class="${l.soon?'soon':''}" aria-selected="${l.id===lane.id}" data-id="${l.id}">${esc(l.name)}${l.soon?'<small>Soon</small>':''}</button>`).join('');
}
function renderMap(){
  const w=$('mapWrap');
  if(!inTrack()){w.hidden=true;return;}
  w.hidden=false;const p=P();
  $('mapTitle').textContent=lane.name;
  $('mapSub').textContent=lane.sub;
  $('mapCount').textContent=`${Object.keys(p.best).filter(t=>lane.lessons.some(l=>l.t===t)).length} of ${lane.lessons.length} steps done`;
  $('map').innerHTML=lane.lessons.map((l,i)=>{
    const change=i>0&&lane.lessons[i-1].lang!==l.lang;
    return `<button class="step${i===idx?' cur':''}${p.best[l.t]?' complete':''}${change?' lang-change':''}" data-i="${i}" title="${esc(l.t)}"><b>${i+1}</b><small>${LD[l.lang].short}</small></button>`;
  }).join('');
  const c=$('map').querySelector('.cur');if(c)c.scrollIntoView({block:'nearest',inline:'nearest'});
}
function renderRanks(){
  const p=P(),R=RANKS[p.rank];
  $('ranks').innerHTML=RANKS.map((r,i)=>`<button class="rk ${i===p.rank?'sel':''} ${i<=p.earned?'earned':'locked'}" data-i="${i}" aria-label="${r.name}${i>p.earned?' (locked)':''}"><i>${i>p.earned?'&#x1F512;&#xFE0E;':i+1}</i><span>${r.name}</span></button>`).join('');
  let cap=`<span><b>${R.name}.</b> ${R.blurb}</span>`;
  if(p.earned>=6&&p.rank===6)cap+='<span>Top rank reached.</span>';
  else if(p.rank<p.earned)cap+=`<span>Practicing below your rank. Runs here don't move you up.</span>`;
  else cap+=`<span>Next: ${RANKS[p.earned+1].name} <span class="dots">${'●'.repeat(p.prog)}<span class="off">${'●'.repeat(NEED-p.prog)}</span></span> ${p.prog} of ${NEED} clean runs</span>`;
  $('rankCap').innerHTML=cap;
}
function renderGoal(){
  const p=P(),n=lane.lessons.length;
  $('goalMeta').textContent=inTrack()?`${lane.name} · Step ${idx+1} of ${n} · ${ld.name} · ${lesson.file}`:`${lane.name} · Lesson ${idx+1} of ${n} · ${lesson.t}`;
  $('goalText').textContent=lesson.goal;
  $('lessonSel').innerHTML=lane.lessons.map((l,i)=>`<option value="${i}"${i===idx?' selected':''}>${p.best[l.t]?'✓ ':''}${i+1}. ${esc(l.t)}</option>`).join('');
  $('tgtHead').textContent=inTrack()?`Code to match · ${LD[lesson.lang].short}`:'Code to match';
}

/* ---------- lifecycle ---------- */
function resetAttempt(){
  ta.value='';ta.readOnly=false;typed=errors=peeks=0;startT=endT=0;complete=false;checked=false;
  $('done').hidden=true;clearInterval(timer);timer=null;tgt.classList.remove('peek');
  const R=RANKS[P().rank];
  ta.placeholder=R.w===1?'Write the code from the goal above.':(pre?'Continue from the earlier steps. Type only the new lines.':'Start typing line 1. Match the code to the right.');
  renderAll(analyze(''));
}
function loadLesson(){
  lane=laneObj();
  if(inTrack())S.track=lane.id;else S.lane=lane.id;
  const p=P();if(p.lesson>=lane.lessons.length)p.lesson=0;
  idx=p.lesson;lesson=lane.lessons[idx];
  ld=LD[lesson.lang||lane.lang];
  pre=inTrack()?lane.lessons.slice(0,idx).filter(l=>l.file===lesson.file).map(l=>l.code).join('\n'):'';
  const lines=lesson.code.split('\n'),T=[];
  lines.forEach((t,i)=>{if(t.trim())T.push({text:t,idx:i});});
  cur={lines,T};
  document.documentElement.style.setProperty('--rows',Math.max(lines.length,inTrack()&&pre?6:8)+1);
  ta.style.tabSize=ld.tab;
  $('resetBtn').textContent=`Reset progress for ${lane.name}`;
  renderNav();renderGoal();renderMap();renderRanks();renderCtx();renderTarget();renderRef();resetAttempt();
}
function finish(){
  complete=true;endT=performance.now();ta.readOnly=true;clearInterval(timer);ta.scrollLeft=0;hl.scrollLeft=0;
  const p=P(),acc=typed?Math.max(0,Math.round(100*(typed-errors)/typed)):100,ms=endT-(startT||endT),min=ms/60000,wpm=min>0.03?Math.round((typed/5)/min):0;
  let msg;
  if(p.rank===p.earned&&p.earned<6){
    if(acc>=PASS&&peeks===0){
      p.prog++;
      if(p.prog>=NEED){p.earned++;p.prog=0;p.rank=p.earned;msg=`Promoted to ${RANKS[p.earned].name}. More of the code goes dark from the next lesson on.`;}
      else msg=`Clean run. ${p.prog} of ${NEED} toward ${RANKS[p.earned+1].name}.`;
    }else msg=peeks?`You peeked ${peeks}×. Clean runs need zero peeks.`:`Accuracy under ${PASS}%. This run doesn't count toward ${RANKS[p.earned+1].name}.`;
  }else if(p.earned>=6)msg='Master rank. Every lesson is written from the goal.';
  else msg=`Practice run. Switch back to ${RANKS[p.earned].name} to earn progress.`;
  const b=p.best[lesson.t];if(!b||acc>b.acc)p.best[lesson.t]={acc,wpm};
  save();
  $('dWpm').textContent=wpm;$('dAcc').textContent=acc;$('dTime').textContent=fmtTime(ms);$('dPeek').textContent=peeks;$('dMsg').textContent=msg;
  $('doneNext').textContent=inTrack()?'Next step':'Next lesson';
  $('done').hidden=false;$('doneNext').focus();
  renderStats();markTarget(lastA);renderRanks();renderGoal();renderMap();renderLiveViz();
}
function goTo(i){const p=P();p.lesson=(i+lane.lessons.length)%lane.lessons.length;save();loadLesson();ta.focus();}
const nextLesson=(d=1)=>goTo(P().lesson+d);

/* ---------- editor input ---------- */
function insert(text){
  programmatic=true;
  let ok=false;try{ok=document.execCommand('insertText',false,text);}catch(e){}
  if(!ok){ta.setRangeText(text,ta.selectionStart,ta.selectionEnd,'end');ta.dispatchEvent(new Event('input'));}
}
ta.addEventListener('input',e=>{
  if(complete)return;
  if(!startT&&ta.value.length){startT=performance.now();timer=setInterval(renderStats,250);}
  const a=analyze(ta.value);
  if(!programmatic&&(e.inputType==='insertText'||e.inputType==='insertLineBreak')){
    typed++;if(statusAt(a,ta.selectionStart-1)==='bad')errors++;
  }
  programmatic=false;checked=false;
  renderAll(a);
  if(isComplete(a))finish();
});
ta.addEventListener('keydown',e=>{
  if(complete)return;
  if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();doCheck();return;}
  if(e.key==='Tab'&&!e.shiftKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();typed++;insert(' '.repeat(ld.tab));return;}
  if(e.key==='Enter'&&!e.shiftKey){
    e.preventDefault();
    const v=ta.value,p=ta.selectionStart,ls=v.lastIndexOf('\n',p-1)+1,line=v.slice(ls,p);
    let ind=line.match(/^[ \t]*/)[0];const tr=line.trimEnd();
    if(ld.py?/[:(\[]$/.test(tr):/[{(\[]$/.test(tr))ind+=' '.repeat(ld.tab);
    typed++;insert('\n'+ind);return;
  }
  if(e.key==='Backspace'&&ta.selectionStart===ta.selectionEnd){
    const v=ta.value,p=ta.selectionStart,ls=v.lastIndexOf('\n',p-1)+1,before=v.slice(ls,p);
    if(before.length>1&&/^ +$/.test(before)){
      e.preventDefault();const n=before.length%ld.tab||ld.tab;
      ta.setSelectionRange(p-n,p);insert('');
    }
  }
});
ta.addEventListener('paste',e=>{e.preventDefault();flash('Paste is off. Type it out; that is the workout.');});
ta.addEventListener('drop',e=>{e.preventDefault();});
ta.addEventListener('scroll',()=>{hl.scrollTop=ta.scrollTop;hl.scrollLeft=ta.scrollLeft;});
['keyup','click'].forEach(ev=>ta.addEventListener(ev,()=>{if(lastA)markTarget(lastA);}));

function doCheck(){
  if(!lastA)return;checked=true;renderHL(lastA);renderLiveViz();
  const n=lastA.doneK.size,t=cur.T.length;
  flash(n===t?'Every line matches.':`${n} of ${t} lines match. Red lines need another look.`);
}
function flash(msg){const t=$('toast');t.textContent=msg;t.hidden=false;clearTimeout(flash._t);flash._t=setTimeout(()=>{t.hidden=true;},2600);}

/* ---------- controls ---------- */
$('modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.m===S.mode)return;S.mode=b.dataset.m;save();loadLesson();});
$('langs').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('soon')){flash(`${b.firstChild.textContent} is coming soon.`);return;}
  if(inTrack())S.track=b.dataset.id;else S.lane=b.dataset.id;save();loadLesson();
});
$('map').addEventListener('click',e=>{const b=e.target.closest('.step');if(b)goTo(+b.dataset.i);});
$('lessonSel').addEventListener('change',e=>goTo(+e.target.value));
$('prevBtn').addEventListener('click',()=>nextLesson(-1));
$('nextBtn').addEventListener('click',()=>nextLesson(1));
$('doneNext').addEventListener('click',()=>nextLesson(1));
$('retryBtn').addEventListener('click',()=>{renderRanks();renderTarget();resetAttempt();ta.focus();});
$('restartBtn').addEventListener('click',()=>{resetAttempt();ta.focus();});
$('checkBtn').addEventListener('click',()=>{doCheck();ta.focus();});
$('peekBtn').addEventListener('click',()=>{
  if(complete||RANKS[P().rank].w===0)return;
  peeks++;renderStats();tgt.classList.add('peek');clearTimeout(peekTimer);
  peekTimer=setTimeout(()=>tgt.classList.remove('peek'),2000);ta.focus();
});
$('ranks').addEventListener('click',e=>{
  const b=e.target.closest('.rk');if(!b)return;const i=+b.dataset.i,p=P();
  if(i>p.earned){flash(`Locked. Finish ${NEED} clean runs at ${RANKS[p.earned].name} (90%+ accuracy, no peeks) to unlock the next rank.`);return;}
  if(i===p.rank)return;
  p.rank=i;save();renderRanks();renderTarget();resetAttempt();ta.focus();
});
$('resetBtn').addEventListener('click',e=>{
  const b=e.currentTarget;
  if(!b.classList.contains('armed')){b.classList.add('armed');b.textContent=`Click again to reset ${lane.name}`;setTimeout(()=>{b.classList.remove('armed');b.textContent=`Reset progress for ${lane.name}`;},3500);return;}
  delete S.per[lane.id];save();b.classList.remove('armed');loadLesson();flash(`${lane.name} progress reset to Beginner.`);
});

loadLesson();
})();
