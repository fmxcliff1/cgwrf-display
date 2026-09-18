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

/* CGWRF Office Mix.
   A weighted rotation of Radio Paradise channels gives the office a broader blend:
   modern/classic rock and adult alternative most of the time, with occasional
   eclectic/world and mellow blocks. It stays commercial-free and runs inside
   Screen Keep with no popup or separate app. */
(function(){
  const channels={
    main:{
      name:'Main',
      streams:[
        'https://stream.radioparadise.com/mp3-192',
        'https://stream.radioparadise.com/aac-128'
      ]
    },
    rock:{
      name:'Rock',
      streams:[
        'https://stream.radioparadise.com/rock-192',
        'https://stream.radioparadise.com/rock-128'
      ]
    },
    world:{
      name:'Eclectic',
      streams:[
        'https://stream.radioparadise.com/world-etc-192',
        'https://stream.radioparadise.com/eclectic-192'
      ]
    },
    mellow:{
      name:'Mellow',
      streams:[
        'https://stream.radioparadise.com/mellow-192',
        'https://stream.radioparadise.com/mellow-128'
      ]
    }
  };

  /* 50% Main, 25% Rock, 12.5% Eclectic, 12.5% Mellow. */
  const rotation=['main','rock','main','world','main','rock','main','mellow'];
  const BLOCK_MS=40*60*1000;
  const TARGET_VOLUME=.16;
  const FADE_MS=3500;

  let rotationIndex=0;
  let sourceIndex=0;
  let playing=false;
  let blockTimer=null;
  let fadeTimer=null;

  const audio=document.createElement('audio');
  audio.preload='none';
  audio.volume=TARGET_VOLUME;
  document.body.appendChild(audio);

  const style=document.createElement('style');
  style.textContent=`
    #officeMusicDock{position:fixed;right:1.2vw;bottom:1.2vh;z-index:9999;display:flex;gap:.45vw;align-items:center;font-family:Arial,Helvetica,sans-serif;color:#f6fbff}
    .officeMusicControl{border:1px solid rgba(117,215,236,.45);background:rgba(7,19,28,.92);color:#f6fbff;border-radius:999px;padding:.68vh .95vw;font-size:.8vw;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}
    #officeMusicNext{padding:.68vh .72vw}
    .officeMusicControl:hover,.officeMusicControl:focus{outline:3px solid #75d7ec;outline-offset:3px;background:rgba(15,47,62,.98)}
    #officeMusicStatus{position:absolute;right:0;bottom:calc(100% + .7vh);white-space:nowrap;background:rgba(7,19,28,.94);border:1px solid rgba(255,255,255,.12);border-radius:.55vw;padding:.48vh .65vw;font-size:.62vw;color:#b8cbd3;opacity:0;pointer-events:none;transition:opacity .25s}
    #officeMusicStatus.show{opacity:1}
    @media(max-width:1200px){.officeMusicControl{font-size:14px;padding:9px 14px}#officeMusicNext{padding:9px 12px}#officeMusicStatus{font-size:10px}}
  `;
  document.head.appendChild(style);

  const dock=document.createElement('div');
  dock.id='officeMusicDock';
  dock.innerHTML='<div id="officeMusicStatus"></div><button id="officeMusicButton" class="officeMusicControl">🎵 Office Mix</button><button id="officeMusicNext" class="officeMusicControl" title="Next mix">⏭</button>';
  document.body.appendChild(dock);

  const btn=dock.querySelector('#officeMusicButton');
  const nextBtn=dock.querySelector('#officeMusicNext');
  const status=dock.querySelector('#officeMusicStatus');
  let statusTimer=null;

  function currentKey(){return rotation[rotationIndex%rotation.length];}
  function currentChannel(){return channels[currentKey()];}

  function showStatus(text){
    status.textContent=text;
    status.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>status.classList.remove('show'),3400);
  }

  function clearFade(){
    if(fadeTimer){clearInterval(fadeTimer);fadeTimer=null;}
  }

  function fadeTo(target,duration,done){
    clearFade();
    const start=audio.volume;
    const began=Date.now();
    fadeTimer=setInterval(()=>{
      const p=Math.min(1,(Date.now()-began)/duration);
      audio.volume=start+(target-start)*p;
      if(p>=1){
        clearFade();
        audio.volume=target;
        if(done)done();
      }
    },100);
  }

  function armBlockTimer(){
    clearTimeout(blockTimer);
    if(playing)blockTimer=setTimeout(()=>advance(true),BLOCK_MS);
  }

  async function loadCurrent(announce=true){
    const c=currentChannel();
    sourceIndex=0;
    audio.src=c.streams[sourceIndex];
    audio.volume=0;
    try{
      await audio.play();
      playing=true;
      btn.textContent='⏸ Office Mix';
      fadeTo(TARGET_VOLUME,FADE_MS);
      armBlockTimer();
      if(announce)showStatus(`CGWRF Mix • ${c.name}`);
    }catch(e){
      console.warn('Office Mix stream could not start',e);
      tryFallback();
    }
  }

  async function tryFallback(){
    const c=currentChannel();
    if(sourceIndex<c.streams.length-1){
      sourceIndex++;
      audio.src=c.streams[sourceIndex];
      try{
        await audio.play();
        playing=true;
        btn.textContent='⏸ Office Mix';
        fadeTo(TARGET_VOLUME,FADE_MS);
        armBlockTimer();
        return;
      }catch(e){}
    }
    rotationIndex=(rotationIndex+1)%rotation.length;
    sourceIndex=0;
    loadCurrent(true);
  }

  function start(){
    if(audio.src){
      audio.play().then(()=>{
        playing=true;
        btn.textContent='⏸ Office Mix';
        fadeTo(TARGET_VOLUME,1200);
        armBlockTimer();
        showStatus(`CGWRF Mix • ${currentChannel().name}`);
      }).catch(()=>loadCurrent(true));
    }else{
      loadCurrent(true);
    }
  }

  function pause(){
    clearTimeout(blockTimer);
    clearFade();
    audio.pause();
    playing=false;
    btn.textContent='🎵 Office Mix';
    showStatus('Office Mix paused');
  }

  function advance(auto=false){
    const wasPlaying=playing;
    clearTimeout(blockTimer);
    const switchNow=()=>{
      audio.pause();
      rotationIndex=(rotationIndex+1)%rotation.length;
      sourceIndex=0;
      if(wasPlaying)loadCurrent(true);
      else showStatus(`Next up • ${currentChannel().name}`);
    };
    if(wasPlaying)fadeTo(0,auto?FADE_MS:1200,switchNow);
    else switchNow();
  }

  btn.addEventListener('click',()=>playing?pause():start());
  nextBtn.addEventListener('click',()=>advance(false));

  audio.addEventListener('playing',()=>{
    playing=true;
    btn.textContent='⏸ Office Mix';
  });

  audio.addEventListener('pause',()=>{
    if(!audio.ended && !fadeTimer){
      playing=false;
      btn.textContent='🎵 Office Mix';
    }
  });

  audio.addEventListener('error',()=>{
    if(playing || audio.src)tryFallback();
  });

  if(/Android/i.test(navigator.userAgent)){
    setTimeout(()=>btn.focus(),1200);
  }
})();
