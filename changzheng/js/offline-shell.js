/* Activate only on the published secure origin; local review and EXE keep their own server. */
window.addEventListener('load',()=>{
  if(!['http:','https:'].includes(location.protocol)||!('serviceWorker' in navigator)||!window.isSecureContext||window.CZ_DESKTOP||['localhost','127.0.0.1',''].includes(location.hostname))return;
  const warn=()=>{if(document.getElementById('offlineInstallWarning'))return;const message=document.createElement('p');message.id='offlineInstallWarning';message.setAttribute('role','status');message.textContent='离线资源未能准备完成；当前仍可联网游玩，请联网后刷新重试。';document.querySelector('.title-links')?.append(message);console.warn('[offline] shell installation failed');};
  navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_INSTALL_FAILED')warn();});
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(registration=>{
    const observe=()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='redundant')warn();});};
    observe();registration.addEventListener('updatefound',observe);
  }).catch(warn);
},{once:true});
