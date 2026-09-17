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

/* Background music launcher. Uses Music For Shops' verified YouTube channel,
   which explicitly permits its original royalty-free catalog for commercial spaces.
   Playback opens in a separate YouTube player window so the information display can
   keep rotating normally. */
(function(){
  const stations=[
    {name:'Smooth',subtitle:'Hugo Boss • Deep House / Lounge',video:'73CqqYqVURU'},
    {name:'Chill',subtitle:'Giorgio Armani • Smooth Deep House',video:'pmwVChpFax8'},
    {name:'Upbeat',subtitle:'Tom Ford • Summer Luxury Mix',video:'A2GbGSqbv2E'}
  ];
  let musicWindow=null;

  const style=document.createElement('style');
  style.textContent=`
    #musicDock{position:fixed;right:1.2vw;bottom:1.2vh;z-index:9999;font-family:Arial,Helvetica,sans-serif;color:#f6fbff}
    #musicButton{border:1px solid rgba(117,215,236,.45);background:rgba(7,19,28,.86);color:#f6fbff;border-radius:999px;padding:.65vh .8vw;font-size:.78vw;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28);backdrop-filter:blur(5px)}
    #musicButton:hover{background:rgba(15,47,62,.94)}
    #musicMenu{display:none;position:absolute;right:0;bottom:calc(100% + .8vh);width:17vw;min-width:260px;background:rgba(7,19,28,.96);border:1px solid rgba(255,255,255,.16);border-radius:.85vw;padding:1.1vh .8vw;box-shadow:0 14px 38px rgba(0,0,0,.42);backdrop-filter:blur(8px)}
    #musicMenu.open{display:block}
    .musicHead{font-size:.72vw;letter-spacing:.12em;text-transform:uppercase;color:#78d9ee;font-weight:800;margin:.2vh .25vw .8vh}
    .musicStation{width:100%;text-align:left;border:0;border-radius:.55vw;background:rgba(255,255,255,.06);color:#f6fbff;padding:.75vh .65vw;margin:.35vh 0;cursor:pointer}
    .musicStation:hover{background:rgba(117,215,236,.14)}
    .musicStation b{display:block;font-size:.82vw}.musicStation span{display:block;font-size:.66vw;color:#b8cbd3;margin-top:.2vh}
    #musicStop{width:100%;border:1px solid rgba(255,255,255,.12);border-radius:.55vw;background:transparent;color:#b8cbd3;padding:.58vh .65vw;margin-top:.55vh;font-size:.67vw;cursor:pointer}
    #musicNote{font-size:.58vw;color:#78919c;line-height:1.3;margin:.65vh .25vw 0}
  `;
  document.head.appendChild(style);

  const dock=document.createElement('div');
  dock.id='musicDock';
  dock.innerHTML=`<div id="musicMenu">
      <div class="musicHead">Background Music</div>
      ${stations.map((s,i)=>`<button class="musicStation" data-station="${i}"><b>▶ ${s.name}</b><span>${s.subtitle}</span></button>`).join('')}
      <button id="musicStop">■ Stop / Close Music</button>
      <div id="musicNote">Music For Shops • royalty-free commercial-use catalog</div>
    </div>
    <button id="musicButton">🎵 Music</button>`;
  document.body.appendChild(dock);

  const menu=dock.querySelector('#musicMenu');
  const btn=dock.querySelector('#musicButton');
  btn.addEventListener('click',()=>menu.classList.toggle('open'));

  function playStation(index){
    const s=stations[index]||stations[0];
    localStorage.setItem('cgwrfMusicStation',String(index));
    const url=`https://www.youtube.com/embed/${s.video}?autoplay=1&loop=1&playlist=${s.video}&controls=1&rel=0`;
    if(musicWindow && !musicWindow.closed){
      try{musicWindow.location.href=url;}catch(e){}
      musicWindow.focus();
    }else{
      musicWindow=window.open(url,'cgwrfBackgroundMusic','width=820,height=520,resizable=yes');
    }
    menu.classList.remove('open');
    setTimeout(()=>{try{window.focus();}catch(e){}},350);
  }

  dock.querySelectorAll('.musicStation').forEach(el=>el.addEventListener('click',()=>playStation(Number(el.dataset.station))));
  dock.querySelector('#musicStop').addEventListener('click',()=>{
    if(musicWindow && !musicWindow.closed)musicWindow.close();
    musicWindow=null;
    menu.classList.remove('open');
  });

  document.addEventListener('click',e=>{
    if(!dock.contains(e.target))menu.classList.remove('open');
  });
})();
