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
   Direct audio streams keep playback inside the Screen Keep page with no popup/video.
   KCRW Eclectic24 is the lead test option, with modern indie, Radio Paradise,
   folk, Americana, and mellow alternatives kept available. */
(function(){
  const stations=[
    {
      name:'Eclectic24',
      subtitle:'KCRW • modern + classic • soul • indie • mellow hip-hop/R&B',
      icon:'🎧',
      streams:[
        'https://streams.kcrw.com/e24_mp3',
        'https://streams.kcrw.com/e24_aac'
      ]
    },
    {
      name:'Indie Pop Rocks!',
      subtitle:'Modern indie pop / rock • upbeat but office-friendly',
      icon:'⚡',
      streams:[
        'https://ice5.somafm.com/indiepop-128-mp3',
        'https://ice2.somafm.com/indiepop-128-mp3'
      ]
    },
    {
      name:'Main Mix',
      subtitle:'Radio Paradise • modern + classic rock • indie • acoustic',
      icon:'🎶',
      streams:[
        'https://stream.radioparadise.com/mp3-192',
        'https://stream.radioparadise.com/aac-128'
      ]
    },
    {
      name:'Folk Forward',
      subtitle:'Indie folk • acoustic • modern coffeehouse',
      icon:'☕',
      streams:[
        'https://ice5.somafm.com/folkfwd-128-mp3',
        'https://ice2.somafm.com/folkfwd-128-mp3'
      ]
    },
    {
      name:'Country / Americana',
      subtitle:'Boot Liquor • roots • alt-country • Americana',
      icon:'🤠',
      streams:[
        'https://ice5.somafm.com/bootliquor-128-mp3',
        'https://ice2.somafm.com/bootliquor-128-mp3'
      ]
    },
    {
      name:'Mellow Mix',
      subtitle:'Radio Paradise • softer eclectic mix',
      icon:'🌿',
      streams:[
        'https://stream.radioparadise.com/mellow-192',
        'https://stream.radioparadise.com/mellow-128'
      ]
    }
  ];

  let selected=Math.max(0,Math.min(stations.length-1,Number(localStorage.getItem('cgwrfRadioStation')||0)));
  let streamIndex=0;
  let playing=false;

  const audio=document.createElement('audio');
  audio.preload='none';
  audio.volume=.16;
  audio.crossOrigin='anonymous';
  document.body.appendChild(audio);

  const style=document.createElement('style');
  style.textContent=`
    #coffeeDock{position:fixed;right:1.2vw;bottom:1.2vh;z-index:9999;font-family:Arial,Helvetica,sans-serif;color:#f6fbff}
    #coffeeButton{border:1px solid rgba(117,215,236,.45);background:rgba(7,19,28,.92);color:#f6fbff;border-radius:999px;padding:.68vh .95vw;font-size:.8vw;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}
    #coffeeButton:hover,#coffeeButton:focus,.radioStation:focus,#radioPause:focus{outline:3px solid #75d7ec;outline-offset:3px;background:rgba(15,47,62,.98)}
    #radioMenu{display:none;position:absolute;right:0;bottom:calc(100% + .8vh);width:20vw;min-width:320px;background:rgba(7,19,28,.98);border:1px solid rgba(255,255,255,.16);border-radius:.85vw;padding:1.05vh .85vw;box-shadow:0 14px 38px rgba(0,0,0,.45)}
    #radioMenu.open{display:block}
    .radioHead{font-size:.72vw;letter-spacing:.12em;text-transform:uppercase;color:#78d9ee;font-weight:800;margin:.15vh .25vw .75vh}
    .radioStation{width:100%;text-align:left;border:0;border-radius:.55vw;background:rgba(255,255,255,.065);color:#f6fbff;padding:.82vh .68vw;margin:.32vh 0;cursor:pointer}
    .radioStation:hover{background:rgba(117,215,236,.14)}
    .radioStation b{display:block;font-size:.84vw}
    .radioStation span{display:block;font-size:.66vw;color:#b8cbd3;margin-top:.2vh}
    #radioPause{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:.55vw;background:transparent;color:#c5d4da;padding:.62vh .68vw;margin-top:.5vh;font-size:.68vw;cursor:pointer}
    #coffeeStatus{position:absolute;right:0;bottom:calc(100% + .7vh);white-space:nowrap;background:rgba(7,19,28,.94);border:1px solid rgba(255,255,255,.12);border-radius:.55vw;padding:.48vh .65vw;font-size:.62vw;color:#b8cbd3;opacity:0;pointer-events:none;transition:opacity .25s}
    #coffeeStatus.show{opacity:1}
    @media(max-width:1200px){
      #coffeeButton{font-size:14px;padding:9px 14px}
      #radioMenu{width:340px}
      .radioHead{font-size:12px}
      .radioStation b{font-size:14px}
      .radioStation span,#radioPause{font-size:11px}
      #coffeeStatus{font-size:10px}
    }
  `;
  document.head.appendChild(style);

  const dock=document.createElement('div');
  dock.id='coffeeDock';
  dock.innerHTML=`
    <div id="coffeeStatus"></div>
    <div id="radioMenu">
      <div class="radioHead">Background Radio</div>
      ${stations.map((s,i)=>`<button class="radioStation" data-station="${i}"><b>${s.icon} ${s.name}</b><span>${s.subtitle}</span></button>`).join('')}
      <button id="radioPause">⏸ Pause Music</button>
    </div>
    <button id="coffeeButton" aria-haspopup="true" aria-expanded="false">🎵 Music</button>`;
  document.body.appendChild(dock);

  const btn=dock.querySelector('#coffeeButton');
  const menu=dock.querySelector('#radioMenu');
  const stationButtons=Array.from(dock.querySelectorAll('.radioStation'));
  const pauseButton=dock.querySelector('#radioPause');
  const status=dock.querySelector('#coffeeStatus');
  let statusTimer=null;

  function showStatus(text){
    status.textContent=text;
    status.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer=setTimeout(()=>status.classList.remove('show'),3200);
  }

  function openMenu(){
    menu.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    setTimeout(()=>stationButtons[selected]?.focus(),60);
  }

  function closeMenu(){
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }

  function setButton(){
    if(playing){
      const s=stations[selected];
      btn.textContent=`🎵 ${s.name}`;
    }else{
      btn.textContent='🎵 Music';
    }
  }

  async function playSelected(){
    const s=stations[selected];
    streamIndex=0;
    audio.src=s.streams[streamIndex];
    try{
      await audio.play();
      playing=true;
      setButton();
      showStatus(`Playing • ${s.name}`);
    }catch(e){
      playing=false;
      setButton();
      showStatus('Unable to start audio');
      console.warn('Radio stream could not start',e);
    }
  }

  async function chooseStation(index){
    selected=index;
    localStorage.setItem('cgwrfRadioStation',String(index));
    closeMenu();
    await playSelected();
    setTimeout(()=>btn.focus(),100);
  }

  function pause(){
    audio.pause();
    playing=false;
    setButton();
    closeMenu();
    showStatus('Music paused');
    setTimeout(()=>btn.focus(),100);
  }

  btn.addEventListener('click',()=>menu.classList.contains('open')?closeMenu():openMenu());
  stationButtons.forEach(el=>el.addEventListener('click',()=>chooseStation(Number(el.dataset.station))));
  pauseButton.addEventListener('click',pause);

  menu.addEventListener('keydown',e=>{
    const controls=[...stationButtons,pauseButton];
    const i=controls.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){
      e.preventDefault();
      controls[(i+1+controls.length)%controls.length].focus();
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      controls[(i-1+controls.length)%controls.length].focus();
    }else if(e.key==='Escape'){
      e.preventDefault();
      closeMenu();
      btn.focus();
    }
  });

  document.addEventListener('click',e=>{if(!dock.contains(e.target))closeMenu();});

  audio.addEventListener('playing',()=>{
    playing=true;
    setButton();
  });
  audio.addEventListener('pause',()=>{
    if(!audio.ended){
      playing=false;
      setButton();
    }
  });
  audio.addEventListener('error',()=>{
    const s=stations[selected];
    if(streamIndex<s.streams.length-1){
      streamIndex++;
      const wasPlaying=playing;
      audio.src=s.streams[streamIndex];
      if(wasPlaying)audio.play().catch(()=>{});
    }else{
      playing=false;
      setButton();
      showStatus(`${s.name} stream unavailable`);
    }
  });

  if(/Android/i.test(navigator.userAgent)){
    setTimeout(()=>btn.focus(),1200);
  }
})();
