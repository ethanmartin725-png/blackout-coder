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
    const score=b=>b&&typeof b==='object'&&int(b.acc,0,100)&&typeof b.wpm==='number'&&b.wpm>=0&&(b.rank===undefined||int(b.rank,0,maxRank));
    for(const [t,b] of Object.entries(p.best)){
      if(!score(b)||(b.first!==undefined&&!score(b.first)))return {ok:false,error:bad};
      if(titles.has(t))best[t]=copyScore(b);
    }
    per[id]={lesson:Math.min(p.lesson,g.lessons.length-1),earned:p.earned,rank:p.rank,prog:p.prog,best};
  }
  return {ok:true,per,skipped};
}
// A score as stored: acc and wpm, plus the rank it was typed at and the step's first run when
// known. Progress saved before those were recorded has neither, and none is invented.
function copyScore(b){
  const o={acc:b.acc,wpm:b.wpm};if(b.rank!==undefined)o.rank=b.rank;
  if(b.first){o.first={acc:b.first.acc,wpm:b.first.wpm};if(b.first.rank!==undefined)o.first.rank=b.first.rank;}
  return o;
}
// The one rule for "a better run", used by the app and by the merge: higher accuracy wins, then higher WPM.
function betterRun(a,b){return !b||a.acc>b.acc||(a.acc===b.acc&&a.wpm>b.wpm);}
// Record a finished run in best (title -> score). The first run ever recorded for a step stays
// beside its best. Returns true when the run is the step's new best.
function recordRun(best,title,run){
  const r={acc:run.acc,wpm:run.wpm,rank:run.rank},b=best[title];
  if(!b){best[title]={...r,first:{...r}};return true;}
  if(!betterRun(r,b))return false;
  best[title]=b.first?{...r,first:b.first}:r;
  return true;
}
// Merge loaded progress into the current one without losing anything: the higher rank wins
// (with its progress toward the next), and each lesson keeps its better score (accuracy, then speed).
// A step's first run is this browser's when it has one, otherwise the file's.
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
      const x=a.best[t],first=(x&&x.first)||s.first;
      if(betterRun(s,x)){a.best[t]=copyScore({...s,first});}
      else if(!x.first&&first)a.best[t]=copyScore({...x,first});
    }
  }
  return out;
}
/* ---------- track summary ----------
   Everything the summary page shows, from a track's lessons and its best scores. No DOM.
   Averages are plain means over the steps done: accuracy to 0.1 points, WPM to a whole number.
   WPM is only comparable within one language, so averages are also given per language. */
function trackSummary(lessons,best){
  const mean=(xs,d)=>{if(!xs.length)return null;const f=10**d;return Math.round(xs.reduce((a,b)=>a+b,0)/xs.length*f)/f;};
  const steps=lessons.map((l,i)=>{const b=best[l.t];return {i,t:l.t,lang:l.lang,done:!!b,acc:b?b.acc:null,wpm:b?b.wpm:null,rank:b&&b.rank!==undefined?b.rank:null,first:b&&b.first?b.first:null};});
  const done=steps.filter(s=>s.done),groups=[],byLang=[];
  steps.forEach(s=>{const g=groups[groups.length-1];if(g&&g.lang===s.lang)g.to=s.i;else groups.push({lang:s.lang,from:s.i,to:s.i});});
  for(const s of steps)if(!byLang.some(x=>x.lang===s.lang)){
    const d=done.filter(x=>x.lang===s.lang);
    byLang.push({lang:s.lang,steps:steps.filter(x=>x.lang===s.lang).length,done:d.length,acc:mean(d.map(x=>x.acc),1),wpm:mean(d.map(x=>x.wpm),0)});
  }
  const gains=done.filter(s=>s.first).map(s=>({i:s.i,t:s.t,first:s.first,acc:s.acc,wpm:s.wpm,dAcc:s.acc-s.first.acc,dWpm:s.wpm-s.first.wpm}));
  const revisit=done.filter(s=>s.acc<100).sort((a,b)=>a.acc-b.acc||a.wpm-b.wpm||a.i-b.i).slice(0,3);
  return {total:steps.length,done:done.length,steps,groups,byLang,
    overall:{acc:mean(done.map(x=>x.acc),1),wpm:mean(done.map(x=>x.wpm),0)},
    gains,noFirst:done.length-gains.length,revisit};
}
g.BCcore={TOK,tokenize,hash,rng,sig,analyzeText,isCompleteFor,targetLines,progressFile,readProgressFile,mergeProgress,betterRun,recordRun,trackSummary};
})(globalThis);
