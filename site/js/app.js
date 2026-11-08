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
const LOPS=new Set(['XIC','XIO','OTE','OTL','OTU','ONS','TON','TOF','CTU','CTD','RES','MOV','ADD','GRT','LES','EQU','NEQ','BST','NXB','BND']);
const LBOX=new Set(['TON','TOF','CTU','CTD','RES','MOV','ADD','GRT','LES','EQU','NEQ']);
const U=124,RH=72;
function parseRung(s){
  const root={rows:[[]]},stack=[root];let row=root.rows[0];
  const re=/([A-Z]{3})(?:\(([^)]*)\)?)?/g;let m;
  while((m=re.exec(s))){
    const op=m[1];if(!LOPS.has(op))continue;
    const args=(m[2]||'').split(',').map(x=>x.trim()).filter(Boolean);
    if(op==='BST'){const b={br:1,rows:[[]]};row.push(b);stack.push(b);row=b.rows[0];}
    else if(op==='NXB'){const b=stack[stack.length-1];if(b!==root){row=[];b.rows.push(row);}}
    else if(op==='BND'){if(stack.length>1){stack.pop();const t=stack[stack.length-1];row=t.rows[t.rows.length-1];}}
    else row.push({op,args});
  }
  return root.rows[0];
}
const iw=it=>it.br?Math.max(0.5,...it.rows.map(sw)):(LBOX.has(it.op)?1.5:1);
const sw=seq=>seq.reduce((a,it)=>a+iw(it),0);
const ih=it=>it.br?it.rows.reduce((a,r)=>a+sh(r),0):1;
const sh=seq=>Math.max(1,...seq.map(ih));
const L=(x1,y1,x2,y2,c='w')=>`<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const TX=(x,y,s,c,anchor)=>`<text class="${c}" x="${x}" y="${y}"${anchor?` text-anchor="${anchor}"`:''}>${esc(s)}</text>`;
function drawIns(it,x,y,w,out){
  const x2=x+w,cx=(x+x2)/2,op=it.op,tag=it.args[0]||'';
  if(op==='XIC'||op==='XIO'){
    out.push(L(x,y,cx-11,y),L(cx+11,y,x2,y),L(cx-11,y-14,cx-11,y+14),L(cx+11,y-14,cx+11,y+14));
    if(op==='XIO')out.push(L(cx-11,y+14,cx+11,y-14));
    out.push(TX(cx,y-22,tag,'tag'));
  }else if(op==='ONS'){
    out.push(L(x,y,cx-20,y),L(cx+20,y,x2,y),`<rect class="box" x="${cx-20}" y="${y-12}" width="40" height="24" rx="2"/>`,TX(cx,y+4,'ONS','op','middle'),TX(cx,y-22,tag,'tag'));
  }else if(op==='OTE'||op==='OTL'||op==='OTU'){
    out.push(L(x,y,cx-14,y),L(cx+14,y,x2,y));
    out.push(`<path class="w" d="M${cx-8} ${y-14} A16 16 0 0 0 ${cx-8} ${y+14}"/>`,`<path class="w" d="M${cx+8} ${y-14} A16 16 0 0 1 ${cx+8} ${y+14}"/>`);
    if(op!=='OTE')out.push(TX(cx,y+4,op==='OTL'?'L':'U','op','middle'));
    out.push(TX(cx,y-22,tag,'tag'));
  }else{
    const bx=x+10,bw=w-20;
    out.push(L(x,y,bx,y),L(bx+bw,y,x2,y),`<rect class="box" x="${bx}" y="${y-26}" width="${bw}" height="52" rx="3"/>`,TX(bx+8,y-11,op,'op'));
    let lines;
    if(op==='MOV')lines=['Src '+(it.args[0]||''),'Dest '+(it.args[1]||'')];
    else{lines=[tag];if(it.args[1]!==undefined)lines.push('Pre '+it.args[1]);}
    lines.forEach((t,i)=>out.push(TX(bx+8,y+4+i*14,t,'arg')));
  }
}
function drawSeq(seq,x,y,out){for(const it of seq){const w=iw(it)*U;if(it.br)drawBr(it,x,y,w,out);else drawIns(it,x,y,w,out);x+=w;}return x;}
function drawBr(b,x,y,w,out){let yy=y,last=y;b.rows.forEach(r=>{const ex=drawSeq(r,x,yy,out);if(ex<x+w)out.push(L(ex,yy,x+w,yy));last=yy;yy+=sh(r)*RH;});out.push(L(x,y,x,last),L(x+w,y,x+w,last));}
function svgLadder(code){
  const rungs=code.split('\n').map(s=>s.trim()).filter(Boolean).map(parseRung).filter(r=>r.length);
  if(!rungs.length)return '<p class="viz-empty">Type a rung and it draws here.</p>';
  const maxW=Math.max(4,...rungs.map(sw)),X0=34,RR=X0+12+maxW*U+16,W=RR+12;
  const out=[];let y=42;
  rungs.forEach((r,i)=>{out.push(TX(16,y+4,String(i),'num'),L(X0,y,X0+12,y));const ex=drawSeq(r,X0+12,y,out);out.push(L(ex,y,RR,y));y+=sh(r)*RH;});
  const H=y-RH+40;
  out.unshift(L(X0,10,X0,H-8,'rail'),L(RR,10,RR,H-8,'rail'));
  return `<div class="scroll"><svg class="lad" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Ladder rung diagram">${out.join('')}</svg></div>`;
}
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
}
function renderLiveViz(){
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
