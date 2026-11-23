/* Loaded by local puzzle pages. Legacy standalone archive retains its string signal. */
window.CZMarchFrameReport = function(signal) {
  const sessionId = new URLSearchParams(location.search).get('czMarchSession');
  const payload = sessionId ? {type:'czmarch:minigame-result',sessionId,signal,status:signal.endsWith('_success')?'completed':'cancelled'} : signal;
  parent.postMessage(payload,location.origin);
};
