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

/* Background music for the office display.
   Music is played inside this page rather than in a popup so Android-TV signage
   browsers such as Screen Keep can keep the display in the foreground. */
(function(){
  const stations=[
    {name:'Smooth',subtitle:'Hugo Boss • Deep House / Lounge',video:'73CqqYqVURU'},
    {name:'Chill',subtitle:'Giorgio Armani • Smooth Deep House',video:'pmwVChpFax8'},
    {name:'Upbeat',subtitle:'Tom Ford • Summer Luxury Mix',video:'A2GbGSqbv2E'}
  ];
  let playing=false;

  const style=document.createElement('style');
  style.textContent=`
    #musicDock{position:fixed;right:1.2vw;bottom:1.2vh;z-index:9999;font-family:Arial,Helvetica,sans-serif;color:#f6fbff}
    #musicButton{border:1px solid rgba(117,215,236,.45);background:rgba(7,19,28,.9);color:#f6fbff;border-radius:999px;padding:.68vh .9vw;font-size:.8vw;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}
    #musicButton:hover,#musicButton:focus,.musicStation:focus,#musicStop:focus{outline:3px solid #75d7ec;outline-offset:3px;background:rgba(15,47,62,.98)}
    #musicMenu{display:none;position:absolute;right:0;bottom:calc(100% + .9vh);width:19vw;min-width:300px;background:rgba(7,19,28,.98);border:1px solid rgba(255,255,255,.18);border-radius:.85vw;padding:1.15vh .9vw;box-shadow:0 14px 38px rgba(0,0,0,.46)}
    #musicMenu.open{display:block}
    .musicHead{font-size:.75vw;letter-spacing:.12em;text-transform:uppercase;color:#78d9ee;font-weight:800;margin:.2vh .25vw .9vh}
    .musicStation{width:100%;text-align:left;border:0;border-radius:.55vw;background:rgba(255,255,255,.07);color:#f6fbff;padding:.9vh .75vw;margin:.4vh 0;cursor:pointer}
    .musicStation:hover{background:rgba(117,215,236,.14)}
    .musicStation b{display:block;font-size:.88vw}.musicStation span{display:block;font-size:.68vw;color:#b8cbd3;margin-top:.22vh}
    #musicStop{width:100%;border:1px solid rgba(255,255,255,.14);border-radius:.55vw;background:transparent;color:#c5d4da;padding:.72vh .7vw;margin-top:.6vh;font-size:.7vw;cursor:pointer}
    #musicNote{font-size:.6vw;color:#78919c;line-height:1.35;margin:.7vh .25vw 0}
    #musicPlayerWrap{position:fixed;left:-4px;top:-4px;width:2px;height:2px;overflow:hidden;opacity:.01;pointer-events:none;z-index:-1}
    #musicPlayer{width:1px;height:1px;border:0}
    @media(max-width:1200px){#musicButton{font-size:14px;padding:9px 14px}#musicMenu{width:320px}.musicHead{font-size:12px}.musicStation b{font-size:14px}.musicStation span,#musicStop{font-size:11px}#musicNote{font-size:10px}}
  `;
  document.head.appendChild(style);

  const playerWrap=document.createElement('div');
  playerWrap.id='musicPlayerWrap';
  playerWrap.innerHTML='<iframe id="musicPlayer" title="Background music" allow="autoplay; encrypted-media" referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  document.body.appendChild(playerWrap);
  const player=playerWrap.querySelector('#musicPlayer');

  const dock=document.createElement('div');
  dock.id='musicDock';
  dock.innerHTML=`<div id="musicMenu">
      <div class="musicHead">Background Music</div>
      ${stations.map((s,i)=>`<button class="musicStation" data-station="${i}"><b>▶ ${s.name}</b><span>${s.subtitle}</span></button>`).join('')}
      <button id="musicStop">■ Stop Music</button>
      <div id="musicNote">On Screen Keep: use the TV remote and press OK. Music plays inside the display.</div>
    </div>
    <button id="musicButton" aria-haspopup="true" aria-expanded="false">🎵 Music</button>`;
  document.body.appendChild(dock);

  const menu=dock.querySelector('#musicMenu');
  const btn=dock.querySelector('#musicButton');
  const stationButtons=Array.from(dock.querySelectorAll('.musicStation'));
  const stopButton=dock.querySelector('#musicStop');

  function openMenu(){
    menu.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    setTimeout(()=>stationButtons[0]?.focus(),60);
  }
  function closeMenu(){
    menu.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
  }
  btn.addEventListener('click',()=>menu.classList.contains('open')?closeMenu():openMenu());

  function playStation(index){
    const s=stations[index]||stations[0];
    localStorage.setItem('cgwrfMusicStation',String(index));
    const origin=encodeURIComponent(location.origin);
    player.src=`https://www.youtube.com/embed/${s.video}?autoplay=1&loop=1&playlist=${s.video}&controls=0&rel=0&playsinline=1&origin=${origin}`;
    playing=true;
    btn.textContent=`🎵 ${s.name}`;
    closeMenu();
    setTimeout(()=>btn.focus(),100);
  }

  function stopMusic(){
    player.src='about:blank';
    playing=false;
    btn.textContent='🎵 Music';
    closeMenu();
    setTimeout(()=>btn.focus(),100);
  }

  stationButtons.forEach(el=>el.addEventListener('click',()=>playStation(Number(el.dataset.station))));
  stopButton.addEventListener('click',stopMusic);

  menu.addEventListener('keydown',e=>{
    const controls=[...stationButtons,stopButton];
    const i=controls.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){
      e.preventDefault();
      controls[(i+1+controls.length)%controls.length].focus();
    }else if(e.key==='ArrowUp'){
      e.preventDefault();
      controls[(i-1+controls.length)%controls.length].focus();
    }else if(e.key==='Escape'){
      e.preventDefault();closeMenu();btn.focus();
    }
  });

  document.addEventListener('click',e=>{if(!dock.contains(e.target))closeMenu();});

  /* Android TV / Screen Keep remote support: focus the Music control automatically.
     One OK press opens the station list; arrows choose a station; OK starts it. */
  if(/Android/i.test(navigator.userAgent)){
    setTimeout(()=>btn.focus(),1200);
  }
})();
