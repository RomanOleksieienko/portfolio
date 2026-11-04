// ── LIVE WALLPAPERS ─────────────────────────────────────────────
// ghent:  Ghent skyline; sky, sun, stars, lit windows and clouds/rain follow the real
//         sun position and current weather in Ghent.
// canvas: a designer's Figma canvas with gentle mouse parallax.
// classic: the original gradient.
(function(){
  if(window.matchMedia('(max-width:900px)').matches)return;
  const desktop=document.getElementById('desktop');if(!desktop)return;
  const REDUCED=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GHENT={lat:51.0543,lon:3.7174};
  const L={
    en:{title:'Wallpaper',ghent:'Live Ghent',canvas:'Designer',classic:'Classic',live:'Ghent, live'},
    ru:{title:'Обои',ghent:'Живой Гент',canvas:'Дизайнер',classic:'Классика',live:'Гент, сейчас'},
    nl:{title:'Achtergrond',ghent:'Live Gent',canvas:'Designer',classic:'Klassiek',live:'Gent, live'},
  };
  const lang=()=>{try{return L[LANG]?LANG:'en'}catch(e){return 'en'}};
  const t=k=>L[lang()][k];

  const host=document.createElement('div');host.id='wallpaper';host.setAttribute('aria-hidden','true');
  desktop.prepend(host);

  // ── tiny helpers ──
  function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let x=Math.imul(seed^seed>>>15,1|seed);x=x+Math.imul(x^x>>>7,61|x)^x;return((x^x>>>14)>>>0)/4294967296}}
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const toHex=a=>'#'+a.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,k)=>{const A=hex(a),B=hex(b);return toHex(A.map((v,i)=>v+(B[i]-v)*k))};
  const lum=h=>{const[r,g,b]=hex(h);return(.2126*r+.7152*g+.0722*b)/255};

  // ── sun position (suncalc formulas) ──
  function sun(date,lat,lon){
    const rad=Math.PI/180,d=date.valueOf()/86400000-.5+2440588-2451545,e=rad*23.4397;
    const M=rad*(357.5291+.98560028*d),C=rad*(1.9148*Math.sin(M)+.02*Math.sin(2*M)+.0003*Math.sin(3*M));
    const Lg=M+C+rad*102.9372+Math.PI,dec=Math.asin(Math.sin(e)*Math.sin(Lg)),ra=Math.atan2(Math.sin(Lg)*Math.cos(e),Math.cos(Lg));
    const H=rad*(280.16+360.9856235*d)-rad*-lon-ra,phi=rad*lat;
    const alt=Math.asin(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(H));
    const az=Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi));
    return{alt:alt/rad,az:az/rad};
  }

  // ── Ghent skyline (deterministic, colourful, layered) ──
  // Returns {base, lights}: base = the city in daylight colours; lights = windows/lamps that glow at night.
  const HOUSE=['#c8553d','#e09f3e','#f2e3c6','#9e3d32','#d97b4f','#e8c07d','#7f4b3a','#efd8b0','#b6463a','#f0b35a','#d9a066','#a8543f'];
  function skyline(){
    const r=rng(9031);let far='',mid='',near='',lights='';
    const GOLD='#e3a94b',GOLD2='#d09434',SLIT='#f3cd85';
    // far: soft golden roofs
    let x=0,roofs='';
    while(x<1600){const w=40+r()*70,h=346+r()*24;roofs+=`<polygon fill="${r()>.5?GOLD:GOLD2}" opacity=".55" points="${x},420 ${x},${h} ${x+w/2},${h-14-r()*14} ${x+w},${h} ${x+w},420"/>`;x+=w-4}
    // St Bavo's Cathedral
    far+=`<polygon fill="${GOLD2}" points="110,420 110,300 168,268 226,300 226,420"/>`;
    far+=`<rect fill="${GOLD}" x="226" y="132" width="72" height="288"/><rect fill="${GOLD2}" x="219" y="104" width="17" height="30"/><rect fill="${GOLD2}" x="288" y="104" width="17" height="30"/>`;
    far+=`<polygon fill="${GOLD2}" points="219,104 227.5,82 236,104"/><polygon fill="${GOLD2}" points="288,104 296.5,82 305,104"/><rect fill="${GOLD2}" x="239" y="118" width="46" height="16"/>`;
    for(let i=0;i<3;i++)far+=`<rect fill="${SLIT}" x="${240+i*16}" y="160" width="6" height="40" rx="3"/><rect fill="${SLIT}" x="${240+i*16}" y="226" width="6" height="34" rx="3"/>`;
    // Belfry
    far+=`<rect fill="${GOLD}" x="688" y="210" width="64" height="210"/><rect fill="${GOLD}" x="699" y="146" width="42" height="66"/>`;
    far+=`<polygon fill="${GOLD2}" points="694,146 699,124 704,146"/><polygon fill="${GOLD2}" points="736,146 741,124 746,146"/>`;
    far+=`<polygon fill="${GOLD2}" points="703,146 737,146 728,92 722,34 718,34 712,92"/><rect fill="#f6d27a" x="718.6" y="22" width="2.8" height="14"/><circle cx="720" cy="20" r="3.4" fill="#f6d27a"/>`;
    far+=`<circle cx="720" cy="182" r="11" fill="${SLIT}"/><g class="wp-clock" transform="translate(720 182)"><line class="hh" x1="0" y1="0" x2="0" y2="-6" stroke="#7a5420" stroke-width="2" stroke-linecap="round"/><line class="mm" x1="0" y1="0" x2="0" y2="-9" stroke="#7a5420" stroke-width="1.4" stroke-linecap="round"/></g>`;
    for(let i=0;i<2;i++)far+=`<rect fill="${SLIT}" x="${704+i*24}" y="230" width="8" height="44" rx="4"/>`;
    // St Nicholas' Church
    far+=`<polygon fill="${GOLD2}" points="944,420 944,298 1080,240 1216,298 1216,420"/>`;
    far+=`<rect fill="${GOLD}" x="1050" y="182" width="60" height="118"/>`;
    [1044,1102].forEach(tx=>{far+=`<rect fill="${GOLD2}" x="${tx}" y="156" width="14" height="28"/><polygon fill="${GOLD2}" points="${tx},156 ${tx+7},134 ${tx+14},156"/>`});
    far+=`<polygon fill="${GOLD2}" points="1056,182 1104,182 1080,116"/>`;
    for(let i=0;i<3;i++)far+=`<rect fill="${SLIT}" x="${1060+i*14}" y="204" width="6" height="34" rx="3"/>`;
    // mid: Gravensteen castle (stone, crenellated) — between St Bavo and the Belfry
    const st='#bfae95',st2='#a39178',cx0=372;
    mid+=`<rect fill="${st}" x="${cx0}" y="300" width="190" height="120"/><rect fill="${st2}" x="${cx0+62}" y="246" width="64" height="174"/>`;
    for(let i=0;i<10;i++)mid+=`<rect fill="${st}" x="${cx0+i*19.5}" y="291" width="11" height="10"/>`;
    for(let i=0;i<4;i++)mid+=`<rect fill="${st2}" x="${cx0+62+i*17}" y="237" width="10" height="10"/>`;
    [cx0-8,cx0+178].forEach(tx=>{mid+=`<rect fill="${st2}" x="${tx}" y="272" width="22" height="148"/><polygon fill="#8e3a2f" points="${tx-3},272 ${tx+11},242 ${tx+25},272"/>`});
    mid+=`<rect fill="#fff" x="${cx0+92}" y="226" width="1.5" height="12"/><path fill="#ffd400" d="M${cx0+93.5} 226h12v7h-12z"/><path fill="#111" d="M${cx0+97} 228.5h2v2h-2z"/>`;
    mid+=`<path fill="#5a4a3a" d="M${cx0+80} 420v-36a14 14 0 0 1 28 0v36z"/>`;
    // near: Graslei guild houses — coloured, stepped gables, white-trimmed windows
    x=-10;
    while(x<1620){
      if(x>350&&x<584){x+=24;continue} // keep the castle visible
      const w=48+Math.floor(r()*42),h=74+Math.floor(r()*56),top=420-h,gh=18+r()*18,yb=top+gh,stepped=r()>.25;
      const col=HOUSE[Math.floor(r()*HOUSE.length)],dark=['#9e3d32','#7f4b3a','#b6463a','#a8543f','#c8553d'].includes(col);
      let pts=`${x},420 ${x},${yb} `;
      if(stepped){const n=3+Math.floor(r()*2),sw=w/(2*n+2),st=gh/n;
        for(let i=0;i<n;i++){pts+=`${x+i*sw},${yb-i*st} ${x+i*sw},${yb-(i+1)*st} `}
        for(let i=n-1;i>=0;i--){pts+=`${x+w-i*sw},${yb-(i+1)*st} ${x+w-i*sw},${yb-i*st} `}
      }else pts+=`${x+w/2},${top} `;
      pts+=`${x+w},${yb} ${x+w},420`;
      near+=`<polygon fill="${col}" points="${pts}"/><rect fill="rgba(0,0,0,.08)" x="${x}" y="${yb}" width="3" height="${420-yb}"/>`;
      const cols=Math.max(2,Math.floor(w/17)),rows=Math.max(1,Math.floor((h-gh-26)/20)),gx=w/cols,trim=dark?'#f6e7cf':'#fffaf0';
      for(let c=0;c<cols;c++)for(let k=0;k<rows;k++){
        const wx=(x+c*gx+gx/2-3.5).toFixed(1),wy=(yb+8+k*20).toFixed(1);
        near+=`<rect fill="${trim}" opacity=".35" x="${(+wx-1).toFixed(1)}" y="${(+wy-1).toFixed(1)}" width="9" height="13" rx="1.6"/><rect fill="#2b3a52" opacity=".38" x="${wx}" y="${wy}" width="7" height="11" rx="1"/>`;
        if(r()<.45)lights+=`<rect class="win" style="--d:${(r()*12).toFixed(1)}s" x="${wx}" y="${wy}" width="7" height="11" rx="1"/>`;
      }
      near+=`<path fill="#4a3428" d="M${x+w/2-5} 420v-12a5 5 0 0 1 10 0v12z"/>`;
      x+=w+1;
    }
    // quay: trees and lamp posts
    let trees='',lamps='';
    for(let i=0;i<14;i++){const tx=40+i*118+r()*40;if(tx>350&&tx<584)continue;const s=10+r()*8;
      trees+=`<g><rect fill="#5b4433" x="${tx-1.5}" y="${420-s}" width="3" height="${s}"/><circle cx="${tx}" cy="${420-s-6}" r="${s*.8}" fill="#6fae4f"/><circle cx="${tx+s*.5}" cy="${420-s-2}" r="${s*.6}" fill="#5a9a3f"/><circle cx="${tx-s*.5}" cy="${420-s-1}" r="${s*.55}" fill="#7dbb5a"/></g>`}
    for(let i=0;i<9;i++){const lx=100+i*180;lamps+=`<rect fill="#2b2f3a" x="${lx}" y="392" width="2" height="28"/><rect fill="#2b2f3a" x="${lx-3}" y="389" width="8" height="4" rx="1"/>`;
      lights+=`<circle class="lamp" cx="${lx+1}" cy="394" r="9"/><circle class="lamp-core" cx="${lx+1}" cy="393.5" r="2.4"/>`}
    const landmarks=`<svg class="wp-base wp-landmarks" viewBox="0 0 1600 420" preserveAspectRatio="xMidYMax meet"><g class="far">${far}</g><g class="mid">${mid}</g></svg>`;
    const town=`<svg class="wp-base wp-town" viewBox="0 280 1600 140" preserveAspectRatio="xMidYMax slice"><g class="roofs">${roofs}</g><g class="near">${near}${trees}${lamps}</g></svg>`;
    const lit=`<svg class="wp-lights" viewBox="0 280 1600 140" preserveAspectRatio="xMidYMax slice">${lights}</svg>`;
    return landmarks+town+lit;
  }
  // moving sprites
  const BOAT=c=>`<svg viewBox="0 0 96 30"><path d="M2 16h92l-7 10H9z" fill="${c}"/><path d="M2 16h92v3H2z" fill="rgba(255,255,255,.35)"/><rect x="14" y="8" width="62" height="2.4" rx="1" fill="#f4efe6"/><rect x="16" y="10" width="2" height="6" fill="#f4efe6"/><rect x="72" y="10" width="2" height="6" fill="#f4efe6"/><g fill="#3a3a48"><circle cx="26" cy="13" r="2.6"/><circle cx="36" cy="13" r="2.6"/><circle cx="46" cy="13" r="2.6"/><circle cx="56" cy="13" r="2.6"/><circle cx="66" cy="13" r="2.6"/></g><circle class="lamp-core" cx="88" cy="12" r="2.2"/></svg>`;
  const BIKE=`<svg viewBox="0 0 40 30"><g fill="none" stroke="currentColor" stroke-width="1.6"><circle class="wh" cx="9" cy="22" r="6.5"/><circle class="wh" cx="31" cy="22" r="6.5"/><path d="M9 22l7-10h11l4 10M16 12l4 10h7M25 9h4"/></g><path d="M18 11l3-7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><circle cx="22" cy="3" r="2.6" fill="currentColor"/><path d="M20 6l6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  const BIRDS=`<svg viewBox="0 0 90 40"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path class="flap" d="M2 12q6-7 12 0q6-7 12 0"/><path class="flap f2" d="M34 4q5-6 10 0q5-6 10 0"/><path class="flap f3" d="M30 26q5-6 10 0q5-6 10 0"/><path class="flap" d="M62 16q4-5 8 0q4-5 8 0"/></g></svg>`;
  const PLANE=`<svg viewBox="0 0 120 30"><path d="M4 16c0-2 3-3 8-3h70l18-11h6l-9 11h14c4 0 6 1.5 6 3s-2 3-6 3H12c-5 0-8-1-8-3z" fill="#fff"/><path d="M50 16l-14 12h7l20-12z" fill="#e8eef6"/><path d="M48 13l-8-8h6l14 8z" fill="#e8eef6"/><g fill="#7da6d8"><rect x="22" y="14" width="40" height="1.6" rx=".8"/></g></svg>`;
  const CLOUD='<svg viewBox="0 0 400 120"><ellipse cx="110" cy="78" rx="90" ry="30"/><ellipse cx="190" cy="58" rx="80" ry="42"/><ellipse cx="270" cy="76" rx="96" ry="32"/><ellipse cx="150" cy="54" rx="50" ry="30"/></svg>';

  // ── colour keyframes by sun altitude ──
  const K=[
    {a:-18,top:'#060a1a',bot:'#141d38',far:'#111830',near:'#090d1b',glow:'#000000'},
    {a:-8, top:'#141b42',bot:'#4a4676',far:'#2a2c4f',near:'#151830',glow:'#3a2c5a'},
    {a:-2, top:'#33487e',bot:'#d98f6e',far:'#4f4769',near:'#272439',glow:'#ff9a5c'},
    {a:3,  top:'#4f7fbd',bot:'#f5bf8c',far:'#6d7493',near:'#383c52',glow:'#ffc27a'},
    {a:12, top:'#6aa2dc',bot:'#d9e6f1',far:'#91a3ba',near:'#56667e',glow:'#fff1c9'},
    {a:40, top:'#78b0e6',bot:'#e4eef6',far:'#a4b5c9',near:'#66778f',glow:'#ffffff'},
  ];
  function palette(alt){
    if(alt<=K[0].a)return{...K[0]};if(alt>=K[K.length-1].a)return{...K[K.length-1]};
    for(let i=0;i<K.length-1;i++){const A=K[i],B=K[i+1];if(alt>=A.a&&alt<=B.a){const k=(alt-A.a)/(B.a-A.a);const o={};['top','bot','far','near','glow'].forEach(c=>o[c]=mix(A[c],B[c],k));return o}}
  }
  const CLOUDINESS={clear:0,mostlyClear:.15,partlyCloudy:.35,mostlyCloudy:.62,overcast:.78,fog:.7,drizzle:.72,rain:.82,snow:.7,thunderstorm:.92,fallback:.4};
  const weatherKey=()=>{try{return desktopWeatherState.ghent||null}catch(e){return null}};

  let mode='ghent',stars=null,rain=null,rainRaf=0,lastKey='';

  function buildGhent(){
    const city=skyline();
    host.innerHTML=`<div class="wp-ghent">
      <div class="wp-sky"></div><canvas class="wp-stars"></canvas><div class="wp-glow"></div>
      <div class="wp-moon"></div><div class="wp-sun"></div><div class="wp-clouds"></div>
      <div class="wp-shoot"></div>
      <div class="wp-plane">${PLANE}<span class="wp-trail"></span></div>
      <div class="wp-birds">${BIRDS}</div>
      <div class="wp-city">${city}</div>
      <div class="wp-bike b1">${BIKE}</div><div class="wp-bike b2">${BIKE}</div>
      <div class="wp-water"><div class="wp-reflect">${city}</div>
        <div class="wp-boat bt1">${BOAT('#1f3b5c')}</div><div class="wp-boat bt2">${BOAT('#7a2d2a')}</div></div>
      <canvas class="wp-rain"></canvas>
      <div class="wp-tag"><i></i><span class="wp-tag-text"></span></div></div>`;
    host.style.setProperty('--water-h','12vh');
    stars=host.querySelector('.wp-stars');rain=host.querySelector('.wp-rain');
    drawStars();updateGhent(true);
  }
  function drawStars(){
    if(!stars)return;const dpr=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight;
    stars.width=w*dpr;stars.height=h*dpr;const c=stars.getContext('2d');c.scale(dpr,dpr);
    const r=rng(77);for(let i=0;i<220;i++){const x=r()*w,y=r()*h*.6,s=r()*1.3+.2;c.fillStyle=`rgba(255,255,255,${.35+r()*.6})`;c.beginPath();c.arc(x,y,s,0,7);c.fill()}
  }
  function setClouds(n,night){
    const box=host.querySelector('.wp-clouds');if(!box)return;
    if(box.childElementCount===n)return;
    const r=rng(5+n);box.innerHTML='';
    for(let i=0;i<n;i++){const d=document.createElement('div');d.innerHTML=CLOUD;const s=d.firstChild;
      s.style.top=`${2+r()*9}vh`;s.style.animationDuration=`${160+r()*140}s`;s.style.animationDelay=`-${r()*300}s`;s.style.transform='translateX(-40vw)';
      s.style.width=`${26+r()*18}vw`;box.appendChild(s)}
  }
  function startRain(intensity){
    cancelAnimationFrame(rainRaf);if(!rain)return;
    const c=rain.getContext('2d');
    if(!intensity||REDUCED){c.clearRect(0,0,rain.width,rain.height);return}
    const dpr=Math.min(2,devicePixelRatio||1);rain.width=innerWidth*dpr;rain.height=innerHeight*dpr;c.setTransform(dpr,0,0,dpr,0,0);
    const drops=Array.from({length:Math.round(140*intensity)},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,v:9+Math.random()*7,l:10+Math.random()*12}));
    const step=()=>{if(document.hidden){rainRaf=requestAnimationFrame(step);return}
      c.clearRect(0,0,innerWidth,innerHeight);c.strokeStyle='rgba(220,232,245,.55)';c.lineWidth=1;c.beginPath();
      for(const d of drops){c.moveTo(d.x,d.y);c.lineTo(d.x-2,d.y+d.l);d.y+=d.v;d.x-=1.2;if(d.y>innerHeight){d.y=-20;d.x=Math.random()*innerWidth}}
      c.stroke();rainRaf=requestAnimationFrame(step)};
    step();
  }
  function ghentTime(){return new Intl.DateTimeFormat(lang()==='en'?'en-GB':lang(),{timeZone:'Europe/Brussels',hour:'2-digit',minute:'2-digit'}).format(new Date())}

  function updateGhent(first){
    if(mode!=='ghent')return;
    const now=new Date(),{alt,az}=sun(now,GHENT.lat,GHENT.lon),key=weatherKey()||'partlyCloudy',cl=CLOUDINESS[key]??.4;
    const p=palette(alt),dark=lum(p.top)<.35;
    const grey=dark?'#1c222c':'#9aa5b2',k=cl*.72;
    const top=mix(p.top,grey,k),bot=mix(p.bot,grey,k);
    const s=host.style;
    // the city keeps its colours; light and weather act on it like a camera would
    const day=Math.max(0,Math.min(1,(alt+8)/20)),gold=alt>-6&&alt<10?1-Math.abs(alt-2)/8:0;
    s.setProperty('--city-b',(0.32+0.68*day)*(1-cl*.18));s.setProperty('--city-s',(0.55+0.45*day)*(1-cl*.35));
    s.setProperty('--city-sep',Math.max(0,gold)*.35);s.setProperty('--city-hue',`${(1-day)*-18}deg`);
    s.setProperty('--sprite',mix(p.near,'#000000',.25));
    const bt=new Date(new Date().toLocaleString('en-US',{timeZone:'Europe/Brussels'})),hh=bt.getHours()%12,mm=bt.getMinutes();
    host.querySelector('.wp-clock .hh')?.setAttribute('transform',`rotate(${hh*30+mm/2})`);host.querySelector('.wp-clock .mm')?.setAttribute('transform',`rotate(${mm*6})`);
    host.classList.toggle('is-night',alt<-4);host.classList.toggle('is-day',alt>2&&cl<.75);
    s.setProperty('--water-a',mix(mix(top,bot,.6),grey,k*.35));s.setProperty('--water-b',mix(mix(top,'#0b2a4a',.35),'#000000',dark?.35:.12));
    host.querySelector('.wp-sky').style.background=`linear-gradient(180deg,${top} 0%,${mix(top,bot,.55)} 48%,${bot} 78%)`;
    const sx=62+Math.max(-1,Math.min(1,az/120))*22,sy=alt>0?Math.max(4,10-alt*.25):Math.min(40,10-alt*2.2);
    s.setProperty('--sun-x',sx+'%');s.setProperty('--sun-y',sy+'%');
    s.setProperty('--sun-o',alt>-3?String(Math.max(0,1-cl*1.05)):'0');
    s.setProperty('--glow',alt>-10?p.glow+(cl>.6?'22':'66'):'transparent');
    s.setProperty('--stars',alt<-6?String(Math.min(1,(-6-alt)/8)*(1-cl*.9)):'0');
    s.setProperty('--moon-o',alt<-4?String(1-cl*.8):'0');s.setProperty('--moon-cut',top);
    s.setProperty('--lit',alt<2?String(Math.min(1,(2-alt)/8)):'0');
    s.setProperty('--cloud',dark?mix('#2a3240',top,.2):gold>.2?mix('#ffffff','#f7c1d4',gold*.7):'#ffffff');s.setProperty('--cloud-o',String(dark?.4:.42));
    setClouds(Math.round(1+cl*4),dark);
    const rainy=['drizzle','rain','thunderstorm'].includes(key)?(key==='drizzle'?.5:key==='rain'?1:1.3):0;
    if(first||key!==lastKey){startRain(rainy);lastKey=key}
    let cond='';try{cond=tr(`weather.condition.${key}`)}catch(e){}
    host.querySelector('.wp-tag-text').textContent=`${t('live')} · ${ghentTime()}${cond?' · '+cond:''}`;
    autoTheme(alt);
  }

  // Theme follows the sun in Ghent unless the visitor flips it by hand this session.
  function manual(){try{return sessionStorage.getItem('themeManual')==='1'}catch(e){return false}}
  function autoTheme(alt){
    if(mode!=='ghent')return;
    const want=alt<-4?'dark':'light';
    if(!manual()&&desktop.dataset.theme!==want&&typeof setDesktopTheme==='function')setDesktopTheme(want,false);
    const mismatch=(desktop.dataset.theme==='dark'&&alt>2)?'rgba(8,12,22,.42)':(desktop.dataset.theme==='light'&&alt<-4)?'rgba(205,218,234,.42)':'transparent';
    host.style.setProperty('--wp-shade',mismatch);
  }
  if(typeof toggleDesktopAppearance==='function'){
    const orig=toggleDesktopAppearance;
    window.toggleDesktopAppearance=function(b){try{sessionStorage.setItem('themeManual','1')}catch(e){}const r=orig(b);setTimeout(()=>updateGhent(),50);return r};
  }

  // ── Designer canvas ──
  function buildCanvas(){
    host.innerHTML=`<div class="wp-canvas">
      <div class="wpc-layer" data-depth="4"><div class="wpc wpc-frame"><span class="wpc-frame-label"></span></div></div>
      <div class="wpc-layer" data-depth="10">
        <div class="wpc wpc-swatches" style="left:60px;top:52vh">
          <div class="wpc-swatch"><b style="background:#0d99ff"></b>Blue 500</div>
          <div class="wpc-swatch"><b style="background:#1e1e1e"></b>Ink</div>
          <div class="wpc-swatch"><b style="background:#ffffff"></b>Paper</div>
          <div class="wpc-swatch"><b style="background:#f24822"></b>Coral</div>
          <div class="wpc-swatch"><b style="background:#9747ff"></b>Violet</div>
        </div>
        <div class="wpc wpc-type" style="left:8vw;bottom:118px">Aa<small>Inter · Bold · 96/86</small></div>
      </div>
      <div class="wpc-layer" data-depth="16">
        <svg class="wpc wpc-pen" style="left:calc(100vw - 342px - 250px);top:118px" width="220" height="190" viewBox="0 0 220 190">
          <path d="M14 160 C 40 40, 120 30, 150 90 S 200 170, 206 40"/>
          <path class="h" d="M14 160 L 40 40 M150 90 L 120 30 M150 90 L 180 150 M206 40 L 200 170"/>
          <circle cx="40" cy="40" r="3.5"/><circle cx="120" cy="30" r="3.5"/><circle cx="180" cy="150" r="3.5"/>
          <rect x="10" y="156" width="8" height="8"/><rect x="146" y="86" width="8" height="8"/><rect x="202" y="36" width="8" height="8"/>
        </svg>
        <div class="wpc" style="left:26vw;bottom:132px">
          <div class="wpc-comp" style="margin-bottom:8px"><svg viewBox="0 0 12 12"><path d="M6 1l2.2 2.2L6 5.4 3.8 3.2zM6 6.6l2.2 2.2L6 11 3.8 8.8zM3.2 3.8L5.4 6 3.2 8.2 1 6zM8.8 3.8L11 6 8.8 8.2 6.6 6z" fill="currentColor"/></svg>Button / Primary</div>
          <div style="position:relative;display:inline-block"><div class="wpc-btn">View work →</div><div class="wpc-sel"><i></i><i></i><i></i><i></i></div><div class="wpc-size">Hug × 44</div></div>
        </div>
        <div class="wpc wpc-spacing" style="left:46vw;bottom:150px"><div></div><span></span><div></div><span></span><div></div></div>
      </div>
      <div class="wpc-layer" data-depth="22">
        <div class="wpc wpc-note" style="right:calc(342px + 48px);bottom:112px">Make it obvious.<br>Then make it beautiful.<small>— sticky note on my monitor</small></div>
      </div></div>`;
    const lbl=host.querySelector('.wpc-frame-label');const setL=()=>{lbl.textContent=`Desktop — ${innerWidth}×${innerHeight}`};setL();
    window.addEventListener('resize',setL);
  }
  let px=0,py=0,praf=0;
  window.addEventListener('mousemove',e=>{
    if(mode!=='canvas'||REDUCED)return;px=e.clientX/innerWidth-.5;py=e.clientY/innerHeight-.5;
    if(praf)return;praf=requestAnimationFrame(()=>{praf=0;host.querySelectorAll('.wpc-layer').forEach(l=>{const d=+l.dataset.depth;l.style.transform=`translate(${-px*d}px,${-py*d}px)`})});
  },{passive:true});

  // ── switching ──
  function apply(next,persist){
    mode=next;cancelAnimationFrame(rainRaf);
    desktop.classList.toggle('has-wall',mode!=='classic');desktop.classList.toggle('wall-canvas',mode==='canvas');
    if(mode==='ghent')buildGhent();else if(mode==='canvas')buildCanvas();else host.innerHTML='';
    if(mode!=='ghent')host.style.removeProperty('--wp-shade');
    if(persist){try{localStorage.setItem('roman-wallpaper',mode)}catch(e){}}
    document.querySelectorAll('.wp-opt').forEach(o=>o.setAttribute('aria-checked',String(o.dataset.wall===mode)));
    if(typeof trackEvent==='function'&&persist)trackEvent('wallpaper',{key:mode});
  }
  let saved='ghent';try{saved=localStorage.getItem('roman-wallpaper')||'ghent'}catch(e){}
  apply(saved,false);
  setInterval(()=>{if(!document.hidden)updateGhent()},60000);
  document.addEventListener('visibilitychange',()=>host.classList.toggle('is-paused',document.hidden));
  // pick up the weather as soon as the widget has it
  let tries=0;const wait=setInterval(()=>{tries++;if(weatherKey()&&weatherKey()!==lastKey){updateGhent();clearInterval(wait)}else if(tries>40)clearInterval(wait)},1500);
  window.addEventListener('resize',()=>{if(mode==='ghent'){drawStars();startRain(lastKey&&['drizzle','rain','thunderstorm'].includes(lastKey)?1:0)}});

  // ── picker in Control Center ──
  const picker=document.createElement('div');picker.className='wp-picker';picker.hidden=true;picker.setAttribute('role','dialog');
  const renderPicker=()=>{picker.setAttribute('aria-label',t('title'));picker.innerHTML=`<h3>${t('title')}</h3><div class="wp-picker-grid" role="radiogroup">${['ghent','canvas','classic'].map(k=>`<button type="button" class="wp-opt" role="radio" data-wall="${k}" aria-checked="${k===mode}"><b class="wp-thumb-${k}"></b><span>${t(k)}</span></button>`).join('')}</div>`;
    picker.querySelectorAll('.wp-opt').forEach(o=>o.addEventListener('click',()=>{apply(o.dataset.wall,true);if(typeof UISound!=='undefined')UISound.toggle?.()}))};
  desktop.appendChild(picker);
  const cc=document.querySelector('.mb-o-cc')?.closest('.mb-icon');
  if(cc){cc.setAttribute('role','button');cc.tabIndex=0;
    const toggle=e=>{e.stopPropagation();renderPicker();picker.hidden=!picker.hidden;if(!picker.hidden)picker.querySelector('[aria-checked="true"]')?.focus()};
    cc.addEventListener('click',toggle);cc.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle(e)}});}
  document.addEventListener('click',e=>{if(!picker.hidden&&!picker.contains(e.target))picker.hidden=true});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')picker.hidden=true});
  window.setWallpaper=m=>apply(m,true);
  window.__updateGhentWallpaper=()=>updateGhent();
})();
