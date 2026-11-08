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
g.BCcore={TOK,tokenize,hash,rng,sig,analyzeText,isCompleteFor,targetLines};
})(globalThis);
