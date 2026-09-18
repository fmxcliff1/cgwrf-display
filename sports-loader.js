(function(){
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function render(data){
    const rows=data?.teams||[];
    const list=document.getElementById('sportsList');
    if(!list||!rows.length)return;
    list.innerHTML=rows.map(x=>{
      const logo=x.logo?`<img class="team-logo" src="${esc(x.logo)}" alt="${esc(x.name)} logo">`:`<div class="team-logo-fallback">${esc(x.abbr||'AZ')}</div>`;
      const first=x.liveText?`<div class="sports-line live-line"><b>LIVE</b>${esc(x.liveText)}</div>`:`<div class="sports-line"><b>LAST</b>${esc(x.lastText||'No recent result found')}</div>`;
      return `<div class="panel sports-team">
        <div class="team-logo-wrap">${logo}</div>
        <div><div class="sports-team-name">${esc(x.name)}</div>${first}<div class="sports-line"><b>NEXT</b>${esc(x.nextText||'No upcoming game listed')}</div></div>
        <div class="sports-record">${x.liveText?'<div class="sports-live-badge">LIVE</div>':''}<div class="sports-record-value">${esc(x.record||'—')}</div><div class="sports-record-label">Record</div></div>
      </div>`;
    }).join('');
    const a=rows.find(x=>x.liveText)||rows.find(x=>x.nextText&& !x.nextText.startsWith('No upcoming'))||rows[0];
    const g=document.getElementById('glanceSports'),gs=document.getElementById('glanceSportsSub');
    if(g&&a){g.textContent=`${a.name}${a.record&&a.record!=='—'?` • ${a.record}`:''}`;}
    if(gs&&a){gs.textContent=a.liveText?`LIVE: ${a.liveText} • Next: ${a.nextText}`:`Last: ${a.lastText} • Next: ${a.nextText}`;}
  }
  async function load(){
    try{
      const r=await fetch(`sports-data.json?t=${Date.now()}`,{cache:'no-store'});
      if(!r.ok)throw new Error('sports-data');
      render(await r.json());
    }catch(e){console.warn('Local sports data unavailable',e);}
  }
  window.loadCachedSports=load;
  load();
  setInterval(load,5*60*1000);
})();

/* Office background radio.
   Single-station test using Radio Paradise Main Mix. Direct audio playback keeps
   music inside the Screen Keep page with no popup/video or commercial breaks. */
(function(){
  const streams=[
    'https://stream.radioparadise.com/mp3-192',
    'https://stream.radioparadise.com/aac-128'
  ];
  let streamIndex=0;
  let playing=false;

  const audio=document.createElement('audio');
  audio.preload='none';
  audio.volume=.16;
  document.body.appendChild(audio);

  const style=document.createElement('style');
  style.textContent=`
    #officeMusicDock{position:fixed;right:1.2vw;bottom:1.2vh;z-index:9999;font-family:Arial,Helvetica,sans-serif;color:#f6fbff}
    #officeMusicButton{border:1px solid rgba(117,215,236,.45);background:rgba(7,19,28,.92);color:#f6fbff;border-radius:999px;padding:.68vh .95vw;font-size:.8vw;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}
    #officeMusicButton:hover,#officeMusicButton:focus{outline:3px solid #75d7ec;outline-offset:3px;background:rgba(15,47,62,.98)}
    #officeMusicStatus{position:absolute;right:0;bottom:calc(100% + .7vh);white-space:nowrap;background:rgba(7,19,28,.94);border:1px solid rgba(255,255,255,.12);border-radius:.55vw;padding:.48vh .65vw;font-size:.62vw;color:#b8cbd3;opacity:0;pointer-events:none;transition:opacity .25s}
    #officeMusicStatus.show{opacity:1}
    @media(max-width:1200px){#officeMusicButton{font-size:14px;padding:9px 14px}#officeMusicStatus{font-size:10px}}
  `;
  document.head.appendChild(style);

  const dock=document.createElement('div');
  dock.id='officeMusicDock';
  dock.innerHTML='<div id="officeMusicStatus"></div><button id="officeMusicButton" title="Radio Paradise Main Mix">🎵 Office Mix</button>';
  document.body.appendChild(dock);

  const btn=dock.querySelector('#officeMusicButton');
  const status=dock.querySelector('#officeMusicStatus');
  let statusTimer=null;

  function showStatus(text){
    status.textContent=text;
    status.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>status.classList.remove('show'),3200);
  }

  async function start(){
    try{
      if(!audio.src)audio.src=streams[streamIndex];
      await audio.play();
      playing=true;
      btn.textContent='⏸ Office Mix';
      showStatus('Playing • Radio Paradise Main Mix');
    }catch(e){
      playing=false;
      btn.textContent='🎵 Office Mix';
      showStatus('Unable to start audio');
      console.warn('Office music stream could not start',e);
    }
  }

  function pause(){
    audio.pause();
    playing=false;
    btn.textContent='🎵 Office Mix';
    showStatus('Office Mix paused');
  }

  btn.addEventListener('click',()=>playing?pause():start());

  audio.addEventListener('playing',()=>{
    playing=true;
    btn.textContent='⏸ Office Mix';
  });

  audio.addEventListener('pause',()=>{
    if(!audio.ended){
      playing=false;
      btn.textContent='🎵 Office Mix';
    }
  });

  audio.addEventListener('error',()=>{
    if(streamIndex<streams.length-1){
      streamIndex++;
      const wasPlaying=playing;
      audio.src=streams[streamIndex];
      if(wasPlaying)audio.play().catch(()=>{});
    }else{
      playing=false;
      btn.textContent='🎵 Office Mix';
      showStatus('Office Mix stream unavailable');
    }
  });

  if(/Android/i.test(navigator.userAgent)){
    setTimeout(()=>btn.focus(),1200);
  }
})();
