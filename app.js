(function(){
  var root=document.documentElement, LOG=window.TPHM_LOG||[];
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function noMotion(){return reduce||root.classList.contains('a11y-motion')||root.hasAttribute('data-a11y-motion')||document.body.classList.contains('a11y-motion');}
  // theme
  var tb=document.getElementById('themeBtn');
  function setIcon(){var d=root.dataset.theme==='dark';tb.innerHTML=d?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>';tb.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');var m=document.querySelector('meta[name=theme-color]');if(m)m.content=d?'#151412':'#F3EEE3';}
  tb.addEventListener('click',function(){root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('tphm-theme',root.dataset.theme)}catch(e){}setIcon();});
  setIcon();
  // menu
  var mb=document.getElementById('menuBtn'),nav=document.getElementById('nav');
  mb.addEventListener('click',function(){var o=nav.classList.toggle('open');mb.setAttribute('aria-expanded',o);mb.setAttribute('aria-label',o?'Close the chapters menu':'Open the chapters menu');});
  nav.addEventListener('click',function(e){if(e.target.tagName==='A'){nav.classList.remove('open');mb.setAttribute('aria-expanded','false');}});
  // log
  var CAT={mac:['junk','ai-credit-checker','timescreen','mars'],web:['ase','hollr','clippy','mercury','timescreen','tetris'],dev:['ase','mang','megamesh','xnftables'],ai:['mang','clippy','mercury','ai-credit-checker']};
  var ext='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9"/></svg>';
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]});}
  var list=document.getElementById('logList');
  list.innerHTML=LOG.map(function(e){
    var no=e.encore?'Encore · Day 12':'Day '+String(e.n).padStart(2,'0')+' / 11';
    var links='<a href="'+e.site+'" target="_blank" rel="noopener">Website '+ext+'</a>'+
      '<a href="https://github.com/paulfxyz/'+e.gh+'" target="_blank" rel="noopener">GitHub '+ext+'</a>'+
      (e.ph?'<a href="https://www.producthunt.com/products/'+e.ph+'" target="_blank" rel="noopener">Product Hunt '+ext+'</a>':'');
    return '<li class="entry rv'+(e.encore?' encore':'')+'" data-key="'+e.key+'">'+
      '<div class="entry-media"><span class="entry-no">'+no+'</span>'+
      '<img src="assets/covers/'+e.key+'.webp" alt="" width="720" height="720" loading="lazy" decoding="async">'+
      '<video muted loop playsinline preload="none" aria-hidden="true" data-src="assets/loops/'+e.key+'.mp4"></video></div>'+
      '<div class="entry-body"><div class="entry-meta"><span class="mono" style="font-size:.72rem">'+esc(e.day)+'</span><span class="kind">'+esc(e.kind)+'</span></div>'+
      '<div class="entry-title"><img src="assets/icons/'+e.key+'.webp" alt="" width="30" height="30" loading="lazy"><h3>'+esc(e.name)+'</h3></div>'+
      '<p class="line">'+esc(e.line)+'</p><p class="note">'+esc(e.note)+'</p>'+
      '<span class="stack mono">'+esc(e.stack)+(e.budget?' · ≈ US$'+e.budget:'')+'</span>'+
      '<div class="entry-links">'+links+'</div></div></li>';
  }).join('');
  var chips=document.querySelectorAll('.chip');
  chips.forEach(function(c){c.addEventListener('click',function(){
    var f=c.dataset.f;chips.forEach(function(x){x.setAttribute('aria-pressed',x===c)});
    list.querySelectorAll('.entry').forEach(function(li){li.hidden=!(f==='all'||CAT[f].indexOf(li.dataset.key)>-1);});
  });});
  // costs
  var rows=document.getElementById('costRows'),max=Math.max.apply(null,LOG.map(function(e){return e.budget||0}));
  rows.innerHTML=LOG.filter(function(e){return e.budget}).map(function(e){
    return '<tr><th scope="row">'+esc(e.name)+'<span class="bar" style="--w:'+(e.budget/max*100).toFixed(1)+'%" aria-hidden="true"></span></th><td>'+e.budget.toLocaleString('en-US')+'</td></tr>';
  }).join('');
  // observers
  if('IntersectionObserver' in window){
    var rio=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');rio.unobserve(x.target);}})},{rootMargin:'0px 0px -8% 0px'});
    document.querySelectorAll('.rv').forEach(function(el){rio.observe(el)});
    var vio=new IntersectionObserver(function(es){es.forEach(function(x){var v=x.target;
      if(x.isIntersecting&&!noMotion()){if(!v.src)v.src=v.dataset.src;var p=v.play();if(p&&p.then)p.then(function(){v.classList.add('on')}).catch(function(){});}
      else{v.pause();v.classList.remove('on');}
    })},{threshold:.5});
    list.querySelectorAll('video').forEach(function(v){vio.observe(v)});
  } else document.querySelectorAll('.rv').forEach(function(el){el.classList.add('in')});
})();
