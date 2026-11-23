/* Authored preparations change fictional task conditions. Promises never award trust. */
const StoryConsequences={
  themes:{1:['携行清单','互助负重','渡口接应'],2:['转移信号','岸上照应','后续补给'],3:['材料出处','资料交接','基层保障'],4:['观察来源','机动联络','接应准备'],5:['渡口条件','分批携行','岸上接应'],6:['渡运信号','岸边协作','接收清点'],7:['通行信号','桥后照应','跟进保障'],8:['前后联络','结伴行军','下山接应'],9:['可用补给','同伴呼应','宿营份额'],10:['通道消息','任务衔接','后续保障'],11:['到达记录','安置照料','当地交接'],12:['来向资料','保障分工','会师后整顿']},
  role(){return typeof NpcStory!=='undefined'?NpcStory.role():GameState.character?.id||'soldier';},
  key(nodeId,role=this.role()){return `${role}:${Number(nodeId)}`;},
  rows(){const raw=GameState.storyPreparations;if(!raw||typeof raw!=='object'||Array.isArray(raw))GameState.storyPreparations={};return GameState.storyPreparations;},
  valid(row){return row?.version===1&&['soldier','commander','medic','logistics'].includes(row.role)&&Number.isInteger(row.nodeId)&&row.nodeId>=1&&row.nodeId<=12&&Array.isArray(row.choices)&&row.choices.length<=3&&row.delta&&typeof row.delta==='object'&&['food','stamina','morale'].every(k=>Number.isFinite(row.delta[k])&&Math.abs(row.delta[k])<=10)&&Number.isInteger(row.reserved)&&row.reserved>=0&&row.reserved<=2&&['pending','delivered','changed'].includes(row.handover);},
  row(nodeId){const row=this.rows()[this.key(nodeId)];return this.valid(row)&&row.role===this.role()&&Number(row.nodeId)===Number(nodeId)?row:null;},
  /* 2026-10-31 台词重写：三步交谈选择题逐章定稿（去模板化），effect 键与数值保持不变。 */
  steps20261031:{
    1:{verify:['携行前把清单当面点一遍。（任务开始时：体力−2，核验准备+1）','走，先把携行清单从头点一遍。费腿是费点，可带着疑问出发，路上要还账。点不清的，单独记下来。'],conserve:['清单先照旧登记，省下脚力。（无消耗，携行清单仍待核验）','成。已知的照旧登记，没点过的先标着“待核”。省下的力气留在路上，报告的时候可别省。'],share:['为互助负重多出一份力。（体力−3，士气+3）','分担可以，只是要说清你歇了谁顶上。为互助负重出力，全组心里都有底；到了地方，咱们一起把这份力点交清楚。'],signal:['先约好互助的求助哨音。（联络准备+1）','先把信号约死：一声哨是原地候，两声是来人。约好了不等于帮过了，行军路上要做数。'],reserve:['为渡口接应的人拨两份口粮。（口粮−2，待后续交接）','好。留出的这份记你名下，到渡口当面点交。路上有了变故，先开口。'],keep:['本组口粮照旧，抵达后再核对。（体力+2，无预留口粮）','也成。没有预留，账上就不写拨付——到了地方，把数再对一遍。']},
    2:{verify:['亲自去对一遍转移信号。（任务开始时：体力−2，核验准备+1）','好，转移信号要耳朵听、眼睛看，道听途说算不得数。这一趟费脚力，可江边容不得半点含糊。核不实的，另笔记下。'],conserve:['信号按原约执行，脚力留给渡江。（无消耗，转移信号仍待核验）','也成。原约怎么定的就怎么记，只是没核过的信号，不能当成已经接上。行动时多留个心眼。'],share:['为岸上照应搭一把手。（体力−3，士气+3）','好。照应的活最磨人，你搭一把手，滩上就少一声喊。说清谁来接你的岗；到了地方，一起点交这份力。'],signal:['先约定岸上照应的求助信号。（联络准备+1）','约信号是对的。江边风大，话传不远，一灯一哨都要有讲头。记住：约了不等于做了。'],reserve:['江边接应的弟兄，分他们两口吃的。（口粮−2，待后续交接）','好。这份就当替后头的人存下，交割那天一笔一笔点清。江边事急，有变化递句话。'],keep:['粮袋不启，先保行军。（体力+2，无预留口粮）','行。手里没预留，账上就不能记拨付——过了江，咱们再核一遍数。']},
    3:{verify:['找写材料的人把出处问实。（任务开始时：体力−2，核验准备+1）','该问。材料出处问实了，递上去才站得住。这一趟费脚力；问不出的，原样标注，别替它圆。'],conserve:['材料照收，出处存疑另册登记。（无消耗，材料出处仍待核验）','行。收归收，出处存疑的另立一册。省下的力气用在整理上，报告时把存疑的地方念明白。'],share:['为资料交接多担一段。（体力−3，士气+3）','成。资料交接多个人手，就少一页纸出差错。谁接你的手，先讲明白；到了地方，当面点交。'],signal:['先定资料交接的核对信号。（联络准备+1）','先把核对信号定下来：哪三下是“到齐”，哪两下是“缺页”。约是约了，核对还得靠人来。'],reserve:['匀两份给城里帮忙的后生。（口粮−2，待后续交接）','好，这份记你名下，交保障组点收。遵义住不了几天，有动静知会我。'],keep:['口粮按兵不动，养足脚力。（体力+2，无预留口粮）','成。没拨的就不入账，回头跟保障组当面核对。']},
    4:{verify:['亲眼再探一遍消息来源。（任务开始时：体力−2，核验准备+1）','好。观察来的消息，要经第二双眼睛才踏实。这半天路不白走；探不着的，照实说探不着。'],conserve:['消息先用，来源挂账待核。（无消耗，观察来源仍待核验）','也行。先用，但来源挂账。往后谁问起，答“待核”就是待核，不许说成已经看过。'],share:['为接应准备搭手出力。（体力−3，士气+3）','好。接应的活抢的是时辰，你这一份力，对岸就快一步。接手的人讲清；到了地方一起点交。'],signal:['先约接应的联络信号。（联络准备+1）','信号先约死，河两岸才叫得应。只是约好的信号不是接应本身，人到了才算数。'],reserve:['给对岸接应的留出两份。（口粮−2，待后续交接）','好。预留的两份入了册，到了对岸凭册点收。两岸来回跑，有变动提前讲。'],keep:['先紧着行军，抵达再清账。（体力+2，无预留口粮）','也好。没预留就不记拨付，接应那头核对时，照实说。']},
    5:{verify:['跟船工把渡口条件问个底。（任务开始时：体力−2，核验准备+1）','问得好。渡口的底细，一站一站走出来才算数。这趟腿不白费；问不出的，我给你画个问号，莫自己填。'],conserve:['渡口先按船工说的办。（无消耗，渡口条件仍待核验）','要得。先按我讲的办，只是没核过的数，你莫写成实的。装多少、走哪条水线，到时候看水。'],share:['为分批携行出一份力气。（体力−3，士气+3）','要得。船上多双手，滩上少喊几声。哪个替你撑篙，先讲好；拢了岸，一起把力气点交。'],signal:['先约分批上下船的招呼。（联络准备+1）','招呼先约好：几声篙点是催，几声是候。约了要作数，莫当耳边风。'],reserve:['滩头接应的兄弟，匀他们两口。（口粮−2，待后续交接）','要得。你名下记一笔，船拢岸就点交。江上风浪不等人，有变故先喊我。'],keep:['一粒不多动，脚力要紧。（体力+2，无预留口粮）','也行。没预留就不入账，回头岸上核对时，莫把数写岔了。']},
    6:{verify:['亲自核对渡运信号的约定。（任务开始时：体力−2，核验准备+1）','该核。渡运信号错一拍，滩上就乱一分。这一趟费脚力，值得；核不清的，单独记，不许臆断。'],conserve:['信号照约定先备着。（无消耗，渡运信号仍待核验）','成。约定的先备着，没核过的那一环，行动前要再问一遍。省力不是省心。'],share:['为岸边协作搭一把手。（体力−3，士气+3）','好。协作的活看着零碎，缺一个人就转不动。接手的讲清；到了地方，这份力一起点交。'],signal:['先约岸边协作的应答信号。（联络准备+1）','应答信号先定：一长两短是“收到”，三短是“来人”。约定了就照办，不含糊。'],reserve:['滩头接应，先拨两份口粮。（口粮−2，待后续交接）','好。拨出的两份落账，靠岸时按册点清。河滩上事杂，变化早些递话。'],keep:['口粮照旧，清点时再对账。（体力+2，无预留口粮）','成。账上没拨付的，就不能写拨付——清点时照实报。']},
    7:{verify:['上桥前把通行信号对齐。（任务开始时：体力−2，核验准备+1）','对！桥上桥下全凭信号说话，错半拍就卡在索子当中。这趟腿费得值；对不齐的，先莫上。'],conserve:['信号按原约，气力留在攀索。（无消耗，通行信号仍待核验）','也成。原约照记。只是没对过的信号，等于没有。真到索子上，耳朵要更尖。'],share:['为桥后照应出一份力。（体力−3，士气+3）','好。桥后头的活不显眼，少一个人就慢一拍。谁接你的手讲清楚；过了桥，一起点交。'],signal:['先约桥后照应的呼号。（联络准备+1）','呼号先约死。桥上风响，嗓子喊不赢手势。记牢：约了不等于做了，人到位才算数。'],reserve:['桥那头跟进的弟兄，分两口。（口粮−2，待后续交接）','有这份心，好。记你名下，桥面过完就点交。桥上桥下都忙，有变动扯嗓子喊。'],keep:['一份不挪，留力过桥。（体力+2，无预留口粮）','也对。没有预留，就不作拨付算——过完桥，把数再核一遍。']},
    8:{verify:['出发前把前后联络走一遍。（任务开始时：体力−2，核验准备+1）','该走一趟。雪幕一合，前后看不见人，联络就是命。费这趟脚力，买的是个踏实；走不动的，报给我。'],conserve:['联络按旧例，脚力留给爬山。（无消耗，前后联络仍待核验）','成。旧例照记。只是没走过一遍的联络，风雪里要出岔子。心里记着这一点。'],share:['为结伴行军多搭一把。（体力−3，士气+3）','好。结伴就是彼此搭一把，你这把搭出去，队伍就稳一分。谁接你讲清；下了山，一起点交。'],signal:['先约走散时的集合哨音。（联络准备+1）','哨音先约死：一声原地候，两声往回寻。雪窝子里，这一声哨比十条腿管用。'],reserve:['给山下接应的留两份。（口粮−2，待后续交接）','好，这份挂你名下，下山当面交割。山上山下两重天，情况有变赶紧捎信。'],keep:['粮不动，攒劲翻山。（体力+2，无预留口粮）','成。没拨的不入账，下得山来，咱们把账核清。']},
    9:{verify:['把可用补给实际盘一遍。（任务开始时：体力−2，核验准备+1）','该盘。草地里的家底，账面和肚子是两码事。这一趟费脚力；盘不实的，照实说，莫报虚数。'],conserve:['补给照账先用，日后再盘。（无消耗，可用补给仍待核验）','也成。账先用着，只是没盘过的数靠不住。分的时候，手要紧着点。'],share:['为同伴呼应出一份力。（体力−3，士气+3）','好。草地里搭一把手，就是搭一条命。谁接你的位子讲清；到了营地，这份力一起点交。'],signal:['先约泥潭呼救的哨音暗号。（联络准备+1）','暗号先约死：一声短哨是“稳住”，两声是“来人”。草甸子吃人不出声，全凭这个。'],reserve:['宿营地那头，先拨两份。（口粮−2，待后续交接）','好。预留的这份入了册，宿营那晚点交。草地里日子长，有变故提前捎个信。'],keep:['口粮照旧，草地里省着走。（体力+2，无预留口粮）','也成。没预留就不记拨付，宿营时把数目对一遍。']},
    10:{verify:['再探一遍通道消息的来源。（任务开始时：体力−2，核验准备+1）','应该再探。口子上的消息，错一条就搭进去几个人。这趟腿我熟路；探不实的，我照实报，不添半分。'],conserve:['消息先传，来源标注待核。（无消耗，通道消息仍待核验）','行。先传，来源标着“待核”。传令的规矩不破：没核实的话，不当准话讲。'],share:['为任务衔接多跑一趟。（体力−3，士气+3）','好。衔接的活差半步就断线，你这趟腿补的是整条链。接手的讲清；事毕一起点交。'],signal:['先约传令不到的备用哨音。（联络准备+1）','备用信号先约死：正令不到，几声哨算“改道”。约是约了，核实还得靠人跑。'],reserve:['给口子外接应的留两份。（口粮−2，待后续交接）','好，这份记你名下，出隘口就点交。前线信儿变化快，有动静递个话。'],keep:['不另拨付，奔袭的脚力要紧。（体力+2，无预留口粮）','行。没预留就不作拨付，接应那头核对时，照实讲。']},
    11:{verify:['拿记录把到达情况核一遍。（任务开始时：体力−2，核验准备+1）','该核。到了不等于走到了，要有一笔一笔的记录撑着。这趟腿费得值；对不上的，原样报，不粉饰。'],conserve:['记录照旧存档，脚力留给安置。（无消耗，到达记录仍待核验）','成。存档照旧，没核过的先标着。安置的活要人手，力气花在那里也是正事。'],share:['为安置照料搭一把手。（体力−3，士气+3）','好。安置的活细，多双手就多一分妥帖。谁接你的担子讲清；安顿好了，一起点交。'],signal:['先约安置点的联络记号。（联络准备+1）','记号先定下：窑口挂一条巾是“有人”，两条是“满员”。约了要常看，莫挂了就忘。'],reserve:['给地方上的同志留两份。（口粮−2，待后续交接）','好，这份记你名下，交接那天当面点清。落脚的日子还长，有安排早些讲。'],keep:['口粮照旧，先安顿行装。（体力+2，无预留口粮）','成。没有预留，便不作拨付记录。安顿停当，再把数目录一录。']},
    12:{verify:['把来向资料当面问清。（任务开始时：体力−2，核验准备+1）','该问。各路来向，差一天一地都是岔账。这趟腿费得值；问不实的，照实登记，别替史料圆场。'],conserve:['资料先归档，来向存疑另记。（无消耗，来向资料仍待核验）','成。先归档，存疑的另记一页。会师的大日子，账面更要干净。'],share:['为保障分工多担一摊。（体力−3，士气+3）','好。保障的摊子多个人担，会师的日子就多一分齐整。接手的讲明；礼成之后，一起点交。'],signal:['先约保障组的碰头信号。（联络准备+1）','碰头信号先定：一炷香为限，不到即报。约了不等于齐了，人齐账清才算成。'],reserve:['给先期到会的同志留两份。（口粮−2，待后续交接）','好。这份拨出去有册可查，会师城里当面交割。大事临近，有变故即刻报来。'],keep:['一份不挪，攒力接应。（体力+2，无预留口粮）','成。没有预留，便不写成拨付。整顿那天，把账面再核一遍。']}
  },
  options(script,role,step){
    if(script.part!==1||![2,4,6].includes(step))return null;
    const table=this.steps20261031[script.nodeId]||this.steps20261031[1];
    const pair=(id,label,reply,effect)=>({id,label,reply,effect});
    if(step===2)return [
      pair('verify',table.verify[0],table.verify[1],{kind:'verify',stamina:-2,readiness:1}),
      pair('conserve',table.conserve[0],table.conserve[1],{kind:'conserve'})];
    if(step===4)return [
      pair('share',table.share[0],table.share[1],{kind:'share',stamina:-3,morale:3}),
      pair('signal',table.signal[0],table.signal[1],{kind:'signal',coordination:1})];
    return [
      pair('reserve',table.reserve[0],table.reserve[1],{kind:'reserve',food:-2}),
      pair('keep',table.keep[0],table.keep[1],{kind:'keep',stamina:2})];
  },
  canApply(node){return !!node?.id&&!!GameState.character&&typeof NpcStory!=='undefined'&&NpcStory.unlocked(node.id)&&(typeof RouteMap==='undefined'||!RouteMap.isNodeLocked(node.id));},
  apply(node){
    // 容错：某些旧流程（分粮结算后继续、无节点上下文的重入）会不带节点调用，
    // 此前直接读 node.id 会抛 "Cannot read properties of undefined"，整条调用链中断。
    if(!node?.id)return null;
    if(!this.canApply(node)||this.row(node.id))return this.row(node.id);
    const script=NpcStory.get(node.id,1),turns=NpcDialogueFlow.turns(script,this.role()),selected=[3,5,7].map(round=>turns.find(t=>t.round===round&&({3:['verify','conserve'],5:['share','signal'],7:['reserve','keep']}[round]).includes(t.effect?.kind))).filter(Boolean);
    // Existing saves have no new branches. Do not charge or invent past choices.
    if(!selected.length)return null;
    const partner=NpcStoryCore.participants(script,this.role()).find(id=>!['narrator','enemy_messenger'].includes(id))||'squad';
    const row={version:1,nodeId:Number(node.id),role:this.role(),partner,choices:selected.map(t=>({round:t.round,label:t.label,kind:t.effect.kind})),delta:{food:0,stamina:0,morale:0},verified:false,coordination:0,reserved:0,completed:false,handover:'pending'};
    for(const choice of selected){
      // Use the authored branch id, never an effect supplied by model text or save data.
      const effect={verify:{stamina:-2},conserve:{},share:{stamina:-3,morale:3},signal:{},reserve:{food:-2},keep:{stamina:2}}[choice.effect.kind];
      if(effect.stamina<0&&(Number(GameState.stamina)||0)<-effect.stamina){(row.limits??=[]).push(choice.effect.kind==='verify'?'体力不足，核验仍待完成':'体力不足，分担准备改为待安排');continue;}
      for(const [key,amount] of Object.entries(effect)){const holder=key==='stamina'?GameState:GameState.resources;const before=Number(holder[key])||0;holder[key]=Math.max(0,Math.min(100,before+amount));row.delta[key]+=holder[key]-before;}
      if(choice.effect.kind==='verify')row.verified=row.delta.stamina<=-2;
      if(choice.effect.kind==='signal')row.coordination=1;
      if(choice.effect.kind==='reserve')row.reserved=Math.max(0,-row.delta.food);
    }
    this.rows()[this.key(node.id)]=row;GameState.save();GameUI.updateResourceHUD?.();
    GameUI.showToast?.('交谈准备已带入任务：'+this.describe(row));return row;
  },
  describe(row){const names={food:'口粮',stamina:'体力',morale:'士气'};return Object.entries(row.delta||{}).filter(([,n])=>n).map(([k,n])=>`${names[k]}${n>0?'+':''}${n}`).concat(row.verified?['核验准备已登记']:[],row.coordination?['求助信号已约定']:[],row.reserved?[`预留${row.reserved}点待交接`]:[],Array.isArray(row.limits)?row.limits:[]).join(' · ')||'保留现有条件';},
  complete(node){const row=this.row(node.id);if(!row||row.completed)return;row.completed=true;GameState.save();},
  pending(nodeId){return Object.values(this.rows()).filter(r=>this.valid(r)&&r.role===this.role()&&r.completed&&r.handover==='pending'&&r.nodeId<Number(nodeId)).sort((a,b)=>a.nodeId-b.nodeId);},
  handover(sourceNode,currentNode,action){
    const row=this.row(sourceNode);if(!row||!row.completed||row.handover!=='pending'||Number(currentNode)<=row.nodeId||!['deliver','defer','reclaim'].includes(action))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(Number(currentNode)))return false;
    if(action==='defer'){row.deferredAt=Number(currentNode);GameState.save();return '暂缓交接已登记，不扣关系分；约定仍可在后续章节兑现。';}
    if(action==='reclaim'){const before=Number(GameState.resources.food)||0;GameState.resources.food=Math.min(100,before+row.reserved);row.handover='changed';row.deliveredAt=Number(currentNode);if(typeof ExperienceSystem!=='undefined')ExperienceSystem.remember({id:`story-handover-${row.role}-${row.nodeId}`,nodeId:Number(currentNode),npcId:row.partner,type:'changed_plan',note:`主动更改第${sourceNode}章交接约定，预留补给改作本组使用。`,delta:-2});GameState.save();GameUI.updateResourceHUD?.();return `约定已更改：口粮+${GameState.resources.food-before}，战友信任−2。不会重复返还。`;}
    const cost=row.reserved?0:2;if((Number(GameState.stamina)||0)<cost)return false;
    GameState.stamina=Math.max(0,GameState.stamina-cost);const before=Number(GameState.resources.morale)||0;GameState.resources.morale=Math.min(100,before+2);
    row.handover='delivered';row.deliveredAt=Number(currentNode);row.deliveryCost=cost;
    const place=GAME_NODES.find(n=>n.id===row.nodeId)?.name||`第${row.nodeId}章`;
    const note=row.reserved?`在${place}预留的${row.reserved}点补给，于第${currentNode}章完成交接。`:`在${place}约定的抵达核对，于第${currentNode}章花费2点体力完成。`;
    const memory={id:`story-handover-${row.role}-${row.nodeId}`,nodeId:Number(currentNode),npcId:row.partner,type:'support',note,delta:row.reserved?4:2};
    if(typeof ExperienceSystem!=='undefined')ExperienceSystem.remember(memory);
    GameState.save();GameUI.updateResourceHUD?.();return `${note} 士气+${GameState.resources.morale-before}；战友信任+${memory.delta}。`;
  },
  recall(npcId,nodeId){const rows=Object.values(this.rows()).filter(r=>r?.version===1&&r.role===this.role()&&r.partner===npcId&&r.completed&&r.nodeId<Number(nodeId)).sort((a,b)=>b.nodeId-a.nodeId);const row=rows[0];if(!row)return '';
    const place=GAME_NODES.find(n=>n.id===row.nodeId)?.name||'上一程';if(row.handover==='changed')return `在${place}时，你后来更改了交接安排，把保障留给了本组。我记得这个变化。这一程有困难就早些说明，咱们按眼前的条件重新商量。`;return row.handover==='delivered'?`我还记得在${place}商量的安排。那份交接已经核对过，行记里有记录。这一程我们再把眼前的困难说清楚。`:`在${place}商量的交接还没有核对。等条件允许再兑现，眼下先听清本章任务。`;
  },
  card(host,nodeId){
    if(!host)return;host.querySelector(':scope > .story-preparation')?.remove();const row=this.row(nodeId),pending=this.pending(nodeId);if(!row&&!pending.length)return;
    const details=document.createElement('details');details.className='story-preparation';const summary=document.createElement('summary');summary.textContent=`交谈与任务条件${pending.length?` · ${pending.length}份上程约定待交接`:''}`;details.append(summary);
    const append=text=>{const p=document.createElement('p');p.textContent=text;details.append(p);};
    if(row){append(this.describe(row)+'（虚构任务体验指数，不代表历史统计）');for(const c of row.choices)append(`第${c.round}轮：${c.label}`);if(row.completed){const recap=document.createElement('div');details.append(recap);this.renderRecap(recap,nodeId);}}
    for(const old of pending.slice(-3)){append(`${NpcStoryCore.names[old.partner]||'岗位搭档'} · 第${old.nodeId}章约定：${old.reserved?`已留出${old.reserved}点补给，交接不重复扣粮`:'抵达核对需体力−2'}。兑现后士气+2、信任增加；暂缓不惩罚。`);
      for(const [action,label] of [['deliver','兑现上程约定'],['defer','暂缓，保留记录'],['reclaim',`改作本组保障（口粮+${old.reserved}，信任−2）`]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{const result=this.handover(old.nodeId,nodeId,action);GameUI.showToast?.(result||'当前体力不足，可暂缓交接，继续本章任务。');this.card(host,nodeId);};details.append(b);}}
    host.prepend(details);
  },
  recap(nodeId){
    const row=this.row(nodeId);if(!row)return [];
    const cost=Object.entries(row.delta).filter(([,n])=>n).map(([k,n])=>`${{food:'口粮',stamina:'体力',morale:'士气'}[k]}${n>0?'+':''}${n}`).join(' · ')||'本轮没有产生资源变化';
    const conditions=[row.verified?'已核验本章准备':null,row.coordination?'已约定联络信号':null,...(row.limits||[])].filter(Boolean).join('；')||'按现有记录行动，保留尚未核实之处';
    const promise=row.handover==='delivered'?'约定已经交接，后续不重复结算':row.handover==='changed'?'你更改了约定，预留物资转作本组保障':row.reserved?`已预留${row.reserved}点口粮，后续章节仍需实际交接`:'抵达核对的约定仍待后续完成，没有预留口粮';
    return [{title:'你作了什么选择',text:row.choices.map(c=>`第${c.round}轮：${c.label.split('（')[0]}`).join('；')},{title:'实际付出与获得',text:cost+'。'+conditions+'。这些是任务开始时已经结算的准备，非战斗总损耗。'},{title:'下一程留下什么',text:promise+'。聊天本身不增加信任，实际交接才会改变关系。'}];
  },
  renderRecap(host,nodeId){
    if(!host)return;host.querySelector('.choice-recap')?.remove();const rows=this.recap(nodeId);if(!rows.length)return;
    const section=document.createElement('section');section.className='choice-recap';section.setAttribute('aria-label','本章关键选择复盘');
    const head=document.createElement('h3');head.textContent='这一次选择，留下了什么';section.append(head);
    rows.forEach((r,i)=>{const a=document.createElement('article'),n=document.createElement('small'),b=document.createElement('h4'),p=document.createElement('p');n.textContent=String(i+1).padStart(2,'0');b.textContent=r.title;p.textContent=r.text;a.append(n,b,p);section.append(a);});host.prepend(section);
  },
  install(){
    if(this.installed||typeof NpcStory==='undefined'||!NpcStory.scripts.length)return;this.installed=true;
    const wrapEntry=(object,key)=>{const original=object[key];if(!original)return;object[key]=function(node){StoryConsequences.apply(node);return original.apply(this,arguments);};};
    for(const key of ['showPreBattleChoice','showCommandPost','showRationAlloc','showLearningTask','showZunyiWarRoom','startQTE'])wrapEntry(GameUI,key);
    if(typeof JourneyChapter!=='undefined'){wrapEntry(JourneyChapter,'open');const review=JourneyChapter.renderReview;if(review)JourneyChapter.renderReview=function(host){const result=review.apply(this,arguments);StoryConsequences.renderRecap(host,1);return result;};const create=JourneyChapter.createState;JourneyChapter.createState=function(){const state=create.apply(this,arguments),row=StoryConsequences.row(1);if(row){for(const k of ['food','stamina','morale'])state.resource[k]=Math.max(0,Math.min(100,state.resource[k]+(row.delta[k]||0)));state.resource.cooperation=Math.min(100,state.resource.cooperation+(row.coordination?3:0));}return state;};}
    if(typeof ChishuiSandbox!=='undefined')wrapEntry(ChishuiSandbox,'open');
    const ration=GameUI.showRationResult;if(ration)GameUI.showRationResult=function(){const result=ration.apply(this,arguments);StoryConsequences.renderRecap(document.getElementById('rationResultOverlay')?.firstElementChild,this.rationCurrentNode?.id);return result;};
    const attach=NpcStory.attach;NpcStory.attach=function(host,node){const result=attach.apply(this,arguments);if(node)StoryConsequences.card(host,node.id);return result;};
    const complete=GameUI.completeDungeon;GameUI.completeDungeon=function(node){const eligible=StoryConsequences.canApply(node),result=complete.apply(this,arguments);if(eligible&&typeof RouteMap!=='undefined'&&RouteMap.completedNodeIds.has(node.id))StoryConsequences.complete(node);return result;};
    if(typeof ExperienceSystem!=='undefined'&&typeof ExperienceSystem.installAssessment==='function')ExperienceSystem.installAssessment();
    const open=GameUI.openNpcChat;GameUI.openNpcChat=function(id,level,node){const result=open.apply(this,arguments);const text=StoryConsequences.recall(id,node?.id);if(text)this.renderNpcAiMessage({reply:text,emotion_tag:'calm',instant:true});return result;};
    if(typeof CompanionBoard!=='undefined'){const render=CompanionBoard.render;CompanionBoard.render=function(){const result=render.apply(this,arguments);StoryConsequences.card(ExperienceSystem.content,ExperienceSystem.nodeId);return result;};}
  }
};
document.addEventListener('npc-story-ready',()=>StoryConsequences.install());
document.addEventListener('DOMContentLoaded',()=>StoryConsequences.install());
