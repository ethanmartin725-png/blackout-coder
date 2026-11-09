// Pure functions with no DOM access. Loaded by the browser and by tools/verify.mjs.
(function (g) {
const TOK=/(\s+)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)|([A-Za-z_][A-Za-z0-9_]*)|(\d+(?:\.\d+)?)|([\s\S])/g;
function tokenize(line){const out=[];let m;TOK.lastIndex=0;while((m=TOK.exec(line))){if(m[1])out.push({t:m[1],k:'ws'});else if(m[2])out.push({t:m[2],k:'str'});else if(m[3])out.push({t:m[3],k:'word'});else if(m[4])out.push({t:m[4],k:'num'});else out.push({t:m[5],k:'sym'});}return out;}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){return function(){seed=(seed+0x6D2B79F5)|0;let t=Math.imul(seed^(seed>>>15),1|seed);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function sig(s,py){const lead=py?(s.match(/^[ \t]*/)[0].length+'|'):'';return lead+tokenize(s.trim()).filter(x=>x.k!=='ws').map(x=>x.t).join('\u0001');}
function analyzeText(text,T,py){
  py=!!py;const ul=text.split('\n'),res=[];let k=0;const doneK=new Set();
  for(const u of ul){
    if(!u.trim()){res.push({k:-1,st:Array(u.length).fill('ws')});continue;}
    const t=T[k],st=[],uL=u.match(/^[ \t]*/)[0].length;
    if(!t){for(let i=0;i<u.length;i++)st.push(i<uL?'ws':'bad');res.push({k,st,state:'extra'});k++;continue;}
    const tL=t.text.match(/^[ \t]*/)[0].length,tc=t.text.slice(tL).replace(/\s+$/,''),uc=u.slice(uL);
    const indentBad=py&&uL!==tL;
    for(let i=0;i<uL;i++)st.push(indentBad?'bad':'ws');
    for(let j=0;j<uc.length;j++){
      if(j>=tc.length&&/\s/.test(uc[j]))st.push('ws');
      else st.push(uc[j]===tc[j]?'ok':'bad');
    }
    if(indentBad&&uL===0&&st.length)st[0]='bad';
    const done=(uc.replace(/\s+$/,'')===tc&&!indentBad)||sig(u,py)===sig(t.text,py);
    if(done)doneK.add(k);
    res.push({k,st,state:done?'done':'partial'});
    k++;
  }
  return {res,doneK,usedK:k};
}
function isCompleteFor(a,T){return a.doneK.size===T.length&&a.usedK===T.length;}
function targetLines(code){const T=[];code.split('\n').forEach((t,i)=>{if(t.trim())T.push({text:t,idx:i});});return T;}
/* ---------- progress files ----------
   Progress lives in one browser's localStorage. These turn it into a file and back, so a learner
   can move it to another device or keep a copy. No DOM here, so tools/progress-tests.mjs can test it.
   per: {groupId: {lesson, earned, rank, prog, best: {title: {acc, wpm}}}}, as app.js keeps it. */
const PROGRESS_APP='blackout-coder',PROGRESS_FORMAT=1;
function progressFile(per,now){return JSON.stringify({app:PROGRESS_APP,format:PROGRESS_FORMAT,exported:now,progress:per},null,1);}
// Check a file against the lanes and tracks this version has. Returns {ok:false,error} or
// {ok:true,per,skipped}: groups this version does not have are skipped, as are lesson titles it
// does not have (a renamed lesson's best score cannot follow it). Any malformed entry refuses the file.
function readProgressFile(text,groups,need,maxRank){
  let o;
  try{o=JSON.parse(text);}catch(e){return {ok:false,error:'That file is not valid JSON.'};}
  if(!o||o.app!==PROGRESS_APP||typeof o.progress!=='object'||o.progress===null||Array.isArray(o.progress))return {ok:false,error:'That file is not a Blackout Coder progress file.'};
  if(o.format!==PROGRESS_FORMAT)return {ok:false,error:`That progress file is format ${o.format}; this version reads format ${PROGRESS_FORMAT}.`};
  const int=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
  const per={},skipped=[];
  for(const [id,p] of Object.entries(o.progress)){
    const g=groups.find(x=>x.id===id);
    if(!g){skipped.push(id);continue;}
    const bad=`The entry for ${g.name} is damaged, so nothing was loaded.`;
    if(!p||typeof p!=='object')return {ok:false,error:bad};
    if(!int(p.earned,0,maxRank)||!int(p.rank,0,p.earned)||!int(p.prog,0,need-1)||!int(p.lesson,0,1e6))return {ok:false,error:bad};
    if(typeof p.best!=='object'||p.best===null||Array.isArray(p.best))return {ok:false,error:bad};
    const titles=new Set(g.lessons.map(l=>l.t)),best={};
    for(const [t,b] of Object.entries(p.best)){
      if(!b||!int(b.acc,0,100)||typeof b.wpm!=='number'||!(b.wpm>=0))return {ok:false,error:bad};
      if(titles.has(t))best[t]={acc:b.acc,wpm:b.wpm};
    }
    per[id]={lesson:Math.min(p.lesson,g.lessons.length-1),earned:p.earned,rank:p.rank,prog:p.prog,best};
  }
  return {ok:true,per,skipped};
}
// Merge loaded progress into the current one without losing anything: the higher rank wins
// (with its progress toward the next), and each lesson keeps its better score (accuracy, then speed).
// The current lesson position stays, unless this browser has nothing for that lane or track yet.
function mergeProgress(cur,inc){
  const out=JSON.parse(JSON.stringify(cur||{}));
  for(const [id,b] of Object.entries(inc)){
    const a=out[id];
    if(!a){out[id]=JSON.parse(JSON.stringify(b));continue;}
    a.best=a.best||{};
    if(b.earned>a.earned){a.earned=b.earned;a.rank=b.rank;a.prog=b.prog;}
    else if(b.earned===a.earned)a.prog=Math.max(a.prog,b.prog);
    for(const [t,s] of Object.entries(b.best)){
      const x=a.best[t];
      if(!x||s.acc>x.acc||(s.acc===x.acc&&s.wpm>x.wpm))a.best[t]={acc:s.acc,wpm:s.wpm};
    }
  }
  return out;
}
g.BCcore={TOK,tokenize,hash,rng,sig,analyzeText,isCompleteFor,targetLines,progressFile,readProgressFile,mergeProgress};
})(globalThis);
