import fs from 'node:fs';

const TZ='America/Phoenix';
const teams=[
  {name:'Diamondbacks',abbr:'AZ',sport:'baseball',league:'mlb',match:/Arizona Diamondbacks/i,lookBack:8,lookAhead:14},
  {name:'Cardinals',abbr:'ARI',sport:'football',league:'nfl',match:/Arizona Cardinals/i,lookBack:14,lookAhead:21},
  {name:'Suns',abbr:'PHX',sport:'basketball',league:'nba',match:/Phoenix Suns/i,lookBack:30,lookAhead:45},
  {name:'ASU',abbr:'ASU',sport:'football',league:'college-football',match:/Arizona State/i,lookBack:14,lookAhead:21}
];

function phoenixParts(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(new Date());
  const o={}; for(const p of parts) if(p.type!=='literal') o[p.type]=Number(p.value);
  return o;
}
function ymd(d){return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;}
function addDays(d,n){const x=new Date(d);x.setUTCDate(x.getUTCDate()+n);return x;}
function eventState(e){return e?.status?.type?.state||e?.competitions?.[0]?.status?.type?.state||'';}
function eventDetail(e){return e?.status?.type?.shortDetail||e?.status?.type?.detail||e?.competitions?.[0]?.status?.type?.shortDetail||e?.competitions?.[0]?.status?.type?.detail||'';}
function competitors(e){return e?.competitions?.[0]?.competitors||[];}
function teamInEvent(e,id,match){return competitors(e).find(c=>String(c?.team?.id||'')===String(id)||match.test(c?.team?.displayName||''));}
function opponentInEvent(e,id,match){const me=teamInEvent(e,id,match);return{me,op:competitors(e).find(c=>c!==me)};}
function score(c){
  const s=c?.score;
  if(typeof s==='number'||typeof s==='string') return Number(s);
  if(s&&typeof s==='object') return Number(s.value??s.displayValue??s.score);
  return NaN;
}
function gameTime(date){
  const d=new Date(date);
  return `${d.toLocaleDateString('en-US',{timeZone:TZ,weekday:'short',month:'short',day:'numeric'})} • ${d.toLocaleTimeString('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit'})}`;
}
function phrase(me,op){return `${me?.homeAway==='away'?'at':'vs'} ${op?.team?.shortDisplayName||op?.team?.displayName||'Opponent'}`;}
function recordFromCompetitor(me){
  const records=me?.records||[];
  return records.find(r=>r.type==='total'||String(r.name||'').toLowerCase()==='overall')?.summary||records[0]?.summary||'';
}
async function getJson(url){
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 CGWRF-office-display','Accept':'application/json'}});
  if(!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function findTeamId(t){
  const base=`https://site.api.espn.com/apis/site/v2/sports/${t.sport}/${t.league}`;
  const d=await getJson(`${base}/teams?limit=1000`);
  const list=d?.sports?.[0]?.leagues?.[0]?.teams||[];
  const found=list.find(x=>t.match.test(x?.team?.displayName||''));
  if(!found?.team?.id) throw new Error(`Team not found: ${t.name}`);
  return {id:found.team.id,logo:found.team.logos?.[0]?.href||found.team.logo||''};
}
async function scheduleEvents(t,id){
  const p=phoenixParts();
  const base=`https://site.api.espn.com/apis/site/v2/sports/${t.sport}/${t.league}/teams/${id}/schedule`;
  const candidates=[];
  if(t.league==='nba') candidates.push(`?season=${p.month>=7?p.year+1:p.year}`,`?season=${p.year}`);
  else if(t.league==='nfl'||t.league==='college-football') candidates.push(`?season=${p.year}&seasontype=2`,`?season=${p.year}`);
  else candidates.push(`?season=${p.year}`);
  candidates.push('');
  for(const q of candidates){
    try{const d=await getJson(base+q); if((d.events||[]).length)return d.events||[];}catch{}
  }
  return [];
}
async function scoreboardFallback(t,id){
  const today=new Date();
  const dates=[];
  for(let n=-t.lookBack;n<=t.lookAhead;n++) dates.push(ymd(addDays(today,n)));
  const base=`https://site.api.espn.com/apis/site/v2/sports/${t.sport}/${t.league}/scoreboard`;
  const events=[];
  for(let i=0;i<dates.length;i+=8){
    const batch=dates.slice(i,i+8);
    const results=await Promise.all(batch.map(async d=>{
      try{return (await getJson(`${base}?dates=${d}`)).events||[];}catch{return[];}
    }));
    for(const arr of results) for(const e of arr) if(teamInEvent(e,id,t.match)&&!events.some(x=>x.id===e.id))events.push(e);
  }
  return events;
}
function buildCard(t,id,logo,events){
  const mine=events.filter(e=>teamInEvent(e,id,t.match));
  const live=mine.find(e=>eventState(e)==='in')||null;
  const completed=mine.filter(e=>eventState(e)==='post').sort((a,b)=>new Date(b.date)-new Date(a.date));
  const upcoming=mine.filter(e=>eventState(e)==='pre').sort((a,b)=>new Date(a.date)-new Date(b.date));
  const last=completed[0]||null,next=upcoming[0]||null,ref=live||next||last||mine[0]||null;
  const me=ref?teamInEvent(ref,id,t.match):null;
  let record=recordFromCompetitor(me);
  if(!record&&completed.length){
    let w=0,l=0,tie=0;
    for(const e of completed){
      const {me,op}=opponentInEvent(e,id,t.match); const a=score(me),b=score(op);
      if(!Number.isFinite(a)||!Number.isFinite(b))continue;
      if(a>b)w++;else if(a<b)l++;else tie++;
    }
    record=tie?`${w}-${l}-${tie}`:`${w}-${l}`;
  }
  if(!record&&upcoming.length)record='0-0';
  let lastText='No recent result found';
  if(last){const {me,op}=opponentInEvent(last,id,t.match);const a=score(me),b=score(op);const r=a>b?'W':a<b?'L':'T';lastText=`${r} ${Number.isFinite(a)?a:'—'}–${Number.isFinite(b)?b:'—'} ${phrase(me,op)}`;}
  let nextText='No upcoming game listed';
  if(next){const {me,op}=opponentInEvent(next,id,t.match);nextText=`${phrase(me,op)} • ${gameTime(next.date)}`;}
  let liveText='';
  if(live){const {me,op}=opponentInEvent(live,id,t.match);const a=score(me),b=score(op);liveText=`${Number.isFinite(a)?a:'0'}–${Number.isFinite(b)?b:'0'} ${phrase(me,op)} • ${eventDetail(live)||'LIVE'}`;}
  if(!mine.length&&t.league==='nba'){lastText='Offseason';nextText='Schedule will appear when games are listed';}
  return {name:t.name,abbr:t.abbr,logo:me?.team?.logo||logo||'',record:record||'—',lastText,nextText,liveText};
}

const output=[];
for(const t of teams){
  try{
    const info=await findTeamId(t);
    let events=await scheduleEvents(t,info.id);
    if(!events.length)events=await scoreboardFallback(t,info.id);
    output.push(buildCard(t,info.id,info.logo,events));
  }catch(e){
    console.error(t.name,e.message);
    output.push({name:t.name,abbr:t.abbr,logo:'',record:'—',lastText:'Sports data temporarily unavailable',nextText:'Will retry automatically',liveText:''});
  }
}

const old=fs.existsSync('sports-data.json')?JSON.parse(fs.readFileSync('sports-data.json','utf8')):null;
const same=old&&JSON.stringify(old.teams)===JSON.stringify(output);
if(!same)fs.writeFileSync('sports-data.json',JSON.stringify({generatedAt:new Date().toISOString(),teams:output},null,2)+'\n');

let html=fs.readFileSync('index.html','utf8');
const oldCalls=/loadSports\(\);\s*setInterval\(loadSports,15\*60\*1000\);/;
if(oldCalls.test(html)) html=html.replace(oldCalls,'/* Sports data is rendered from sports-data.json by sports-loader.js. */');
if(!html.includes('sports-loader.js')) html=html.replace('</body>','<script src="sports-loader.js"></script>\n</body>');
fs.writeFileSync('index.html',html);
