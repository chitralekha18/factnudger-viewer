const publicSite = document.querySelector('meta[name=app-mode]')?.content === 'public';
let searchKey = '';
const searchCache = new Map();
const $ = id => document.getElementById(id);
const demos = [1,2].map(n=>({kind:'local',id:String(n),title:`Video ${n}`,author:'FactNudger demo collection',thumbnail:`./media/poster${n}.jpg`,src:`./media/video${n}.mp4`,driveId:['1d0OLtSKM-egUq5b3Zh8bu8-u5RuOJ-ga','1AkcGXUMOWT7UATB0rO40B4LXZYxTduJp'][n-1]}));
const historyKey='factnudger-viewer-history-v1';
let history=[];
try { history=JSON.parse(localStorage.getItem(historyKey)||'[]').filter(v=>v && typeof v.title==='string' && ((v.kind==='youtube' && /^[\w-]{11}$/.test(v.id)) || (v.kind==='tiktok' && /^\d{10,25}$/.test(v.id)))).slice(0,20); } catch {}
let current=demos[0], searchController, generation=0, youtubePlayer;
function saveHistory(){try{localStorage.setItem(historyKey,JSON.stringify(history));}catch{}}
function decode(text){const el=document.createElement('textarea');el.innerHTML=text;return el.value;}
function thumbnail(item){
  if(item.kind==='local')return item.thumbnail;
  if(item.kind==='youtube')return `https://i.ytimg.com/vi/${item.id}/mqdefault.jpg`;
  return null;
}
function card(item, result=false){
  const button=document.createElement('button');button.type='button';button.className=result?'result-card':'library-card';
  if(!result && current.kind===item.kind && current.id===item.id){button.classList.add('active');button.setAttribute('aria-current','true');}
  const src=thumbnail(item);
  if(src){const img=document.createElement('img');img.src=src;img.alt='';img.loading='lazy';img.addEventListener('error',()=>{const icon=document.createElement('span');icon.className='thumbnail-placeholder';icon.textContent='▶';img.replaceWith(icon);});button.append(img);}
  else{const icon=document.createElement('span');icon.className='thumbnail-placeholder';icon.textContent='▶';button.append(icon);}
  const body=document.createElement('span'), title=document.createElement('strong'), meta=document.createElement('small');
  title.textContent=item.title;meta.textContent=result?item.author:item.kind==='local'?'Demo collection':item.kind==='youtube'?'YouTube':'TikTok';
  body.append(title,meta);button.append(body);button.addEventListener('click',()=>select(item,true));return button;
}
function renderLibrary(){
  $('demos').replaceChildren(...demos.map(v=>card(v)));
  $('clear-history').hidden=!history.length;
  $('history').replaceChildren(...history.map(v=>card(v)));
  $('recent-section').hidden=!history.length;
}
function select(item,play=false){
  const token=++generation;
  if(youtubePlayer){try{youtubePlayer.destroy();}catch{}youtubePlayer=null;}
  const oldVideo=$('player').querySelector('video');if(oldVideo){oldVideo.pause();oldVideo.removeAttribute('src');oldVideo.load();}
  $('player').replaceChildren();current=item;$('playback-status').textContent='';
  $('video-title').textContent=item.title;
  $('external-link').hidden=item.kind==='local';
  if(item.kind==='local' && publicSite){
    onlineFallback(item);
  }else if(item.kind==='local'){
    const video=document.createElement('video');video.src=item.src;video.poster=item.thumbnail;video.controls=true;video.playsInline=true;video.preload='metadata';video.volume=1;
    video.addEventListener('error',()=>{if(token===generation)onlineFallback(item);});
    $('player').append(video);
    if(play)video.play().catch(()=>{if(token===generation && $('player').contains(video))$('playback-status').textContent='Press Play to begin.';});
  }else{
    const iframe=document.createElement('iframe');iframe.title=item.title;iframe.allow='autoplay; fullscreen; encrypted-media; picture-in-picture';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
    if(item.kind==='youtube'){
      iframe.id='youtube-frame';iframe.src=`https://www.youtube.com/embed/${item.id}?enablejsapi=1&origin=${encodeURIComponent(location.origin)}&autoplay=${play?1:0}&playsinline=1&rel=0`;
      $('external-link').href=`https://www.youtube.com/watch?v=${item.id}`;
    }else{
      iframe.src=`https://www.tiktok.com/player/v1/${item.id}?autoplay=${play?1:0}&loop=0`;
      $('external-link').href=`https://www.tiktok.com/@_/video/${item.id}`;
    }
    $('player').append(iframe);
    $('playback-status').textContent='';
    if(item.kind==='youtube' && !publicSite){loadYouTube();attachYouTube(token);}
    history=[{kind:item.kind,id:item.id,title:item.title,author:item.author||''},...history.filter(v=>!(v.kind===item.kind&&v.id===item.id))].slice(0,20);saveHistory();
  }
  $('results-panel').hidden=true;renderLibrary();
}
function onlineFallback(item){
  const iframe=document.createElement('iframe');iframe.title=item.title;
  iframe.src=`https://drive.google.com/file/d/${item.driveId}/preview`;
  iframe.allow='autoplay; fullscreen';iframe.allowFullscreen=true;
  $('player').replaceChildren(iframe);$('playback-status').textContent='';
  $('external-link').href=`https://drive.google.com/file/d/${item.driveId}/view`;
  $('external-link').hidden=false;
}
function attachYouTube(token){
  if(!window.YT?.Player)return;
  youtubePlayer=new YT.Player('youtube-frame',{events:{
    onStateChange(event){if(token===generation&&event.data===1)$('playback-status').textContent='';},
    onError(){if(token===generation)$('playback-status').textContent='This video cannot play here. Choose another video or open it on YouTube.';},
    onAutoplayBlocked(){if(token===generation)$('playback-status').textContent='Press Play in the video to begin.';}
  }});
}
window.onYouTubeIframeAPIReady=()=>{if(current.kind==='youtube')attachYouTube(generation);};
// Load the provider API only after the local interface is ready.
let ytScript;
function loadYouTube(){if(ytScript)return;ytScript=document.createElement('script');ytScript.src='https://www.youtube.com/iframe_api';ytScript.async=true;document.head.append(ytScript);}
window.addEventListener('message',event=>{
  if(current.kind!=='tiktok'||event.origin!=='https://www.tiktok.com'||event.source!==$('player').querySelector('iframe')?.contentWindow)return;
  const data=event.data;
  if(data?.type==='onPlayerError')$('playback-status').textContent='TikTok could not play this video. Try another link or open it on TikTok.';
  if(data?.type==='onStateChange'&&data.value===1)$('playback-status').textContent='';
});
function parseLink(text){
  let url;try{url=new URL(/^https?:\/\//i.test(text)?text:`https://${text}`);}catch{return null;}
  if(!['http:','https:'].includes(url.protocol))return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');let id;
  if(host==='youtu.be')id=url.pathname.split('/')[1];
  else if(['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host))id=url.searchParams.get('v')||url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if(id&&/^[\w-]{11}$/.test(id))return {kind:'youtube',id,title:'YouTube video',author:'From your link'};
  if(host==='tiktok.com'||host==='m.tiktok.com'){
    id=url.pathname.match(/\/(?:video|player\/v1)\/(\d{10,25})/)?.[1];
    if(id)return {kind:'tiktok',id,title:'TikTok video',author:'From your link'};
  }
  return null;
}
async function search(){
  const query=$('query').value.trim();if(!query){$('query').focus();return;}
  searchController?.abort();searchController=new AbortController();const controller=searchController;
  $('search-status').textContent='';$('results-panel').hidden=true;$('search-button').disabled=false;
  const linked=parseLink(query);if(linked){select(linked,true);return;}
  if(/^(https?:\/\/|www\.|(?:vm\.|vt\.|m\.)?tiktok\.com|youtu)/i.test(query)){
    $('search-status').textContent='Paste a full YouTube video link or TikTok link containing /video/. For a shortened TikTok share link, open it first and copy the full address.';return;
  }
  if(publicSite && !searchKey){$('key-dialog').showModal();$('api-key').focus();return;}
  $('search-button').disabled=true;$('search-status').textContent='Finding videos on YouTube…';
  try{
    let data;
    if(publicSite){
      const cached=searchCache.get(query.toLowerCase());
      if(cached && Date.now()-cached.time<900000){data=cached.data;}
      else{
        const params=new URLSearchParams({part:'snippet',type:'video',videoEmbeddable:'true',videoSyndicated:'true',maxResults:'12',q:query});
        const response=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{headers:{'X-Goog-Api-Key':searchKey},signal:controller.signal,credentials:'omit'});
        const result=await response.json();
        if(!response.ok)throw new Error(response.status===403 ? 'Search is unavailable. Check the key’s website/API restrictions and daily quota.' : 'Search failed. Check your API key or try again.');
        data={items:(result.items||[]).filter(v=>v.id?.videoId).map(v=>({kind:'youtube',id:v.id.videoId,title:v.snippet.title,author:v.snippet.channelTitle}))};
        if(searchCache.size>=100)searchCache.clear();
        searchCache.set(query.toLowerCase(),{time:Date.now(),data});
      }
    }else{
      const response=await fetch(`/api/search?q=${encodeURIComponent(query)}`,{signal:controller.signal});data=await response.json();
      if(!response.ok)throw new Error(data.error||'Search is unavailable. Try again.');
    }
    if(controller.signal.aborted)return;
    const items=data.items.map(v=>({...v,title:decode(v.title),author:decode(v.author)}));
    $('results-title').textContent=`Results for “${query}”`;$('results').replaceChildren(...items.map(v=>card(v,true)));$('results-panel').hidden=false;
    $('search-status').textContent=items.length?'':'No videos found. Try a different topic.';
  }catch(error){if(error.name!=='AbortError')$('search-status').textContent=error.message;}
  finally{if(controller===searchController)$('search-button').disabled=false;}
}
$('search-form').addEventListener('submit',event=>{event.preventDefault();search();});
document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{$('query').value=button.dataset.topic;search();}));
$('close-results').addEventListener('click',()=>{$('results-panel').hidden=true;});
$('clear-history').addEventListener('click',()=>{history=[];saveHistory();renderLibrary();});
$('reset').addEventListener('click',()=>{searchController?.abort();history=[];saveHistory();$('query').value='';$('search-status').textContent='';$('search-button').disabled=false;select(demos[0]);window.scrollTo({top:0,behavior:'smooth'});});
if(publicSite){
  $('key-settings').hidden=false;
  $('key-settings').addEventListener('click',()=>{$('api-key').value='';$('key-dialog').showModal();$('api-key').focus();});
  $('key-dialog').addEventListener('close',()=>{$('api-key').value='';});
  $('key-cancel').addEventListener('click',()=>{$('key-dialog').close();});
  $('key-clear').addEventListener('click',()=>{searchController?.abort();searchKey='';searchCache.clear();$('key-settings').textContent='Search key';$('key-dialog').close();$('search-status').textContent='Search key removed.';});
  $('key-form').addEventListener('submit',event=>{event.preventDefault();const value=$('api-key').value.trim();if(!value){$('api-key').focus();return;}searchController?.abort();searchKey=value;searchCache.clear();$('api-key').value='';$('key-dialog').close();$('key-settings').textContent='Search key ✓';$('search-status').textContent='';if($('query').value.trim())search();});
  window.addEventListener('pagehide',()=>{searchController?.abort();searchKey='';searchCache.clear();$('api-key').value='';$('key-settings').textContent='Search key';});
}
select(demos[0]);
