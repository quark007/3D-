/* B-side compatibility boundary. Classic-script lexical globals are intentional. */
(() => {
  'use strict';
  window.CZMarchEnv = () => ({
    state: typeof GameState !== 'undefined' ? GameState : null,
    route: typeof RouteMap !== 'undefined' ? RouteMap : null,
    ui: typeof GameUI !== 'undefined' ? GameUI : null,
    nodes: typeof GAME_NODES !== 'undefined' ? GAME_NODES : [],
    story: typeof NpcStory !== 'undefined' ? NpcStory : null,
    core: typeof NpcStoryCore !== 'undefined' ? NpcStoryCore : null,
    flow: typeof NpcDialogueFlow !== 'undefined' ? NpcDialogueFlow : null,
    heroes: typeof HeroStories63 !== 'undefined' ? HeroStories63 : null,
    snow: typeof SnowPrologue63 !== 'undefined' ? SnowPrologue63 : null,
    history: typeof NODE_HISTORY_DATA !== 'undefined' ? NODE_HISTORY_DATA : {},
    rationSoldiers:typeof GRASSLAND_SOLDIERS!=='undefined'?GRASSLAND_SOLDIERS:[],rationMax:typeof RATION_PER_PERSON_MAX!=='undefined'?RATION_PER_PERSON_MAX:20,
    rationTotal:typeof calcRationTotal==='function'?calcRationTotal():0,
    owner: String(typeof PlayerProfiles40 !== 'undefined' ? PlayerProfiles40.id : 'default') + ':' + !!window.MainlineDemo?.active,
    muted: typeof AudioControl43 !== 'undefined' ? AudioControl43.muted === true : false
  });
})();
