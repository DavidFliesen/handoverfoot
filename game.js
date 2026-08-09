(() => {
'use strict';
const $ = id => document.getElementById(id);
const suits = ['♠','♥','♦','♣'];
const redSuits = new Set(['♥','♦']);
const meldRanks = ['4','5','6','7','8','9','10','J','Q','K','A'];
const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JK'];
const openMinimums = [50,90,120,150];
const standardCardPoints = { '3':5, '4':5, '5':5, '6':5, '7':5, '8':10, '9':10, '10':10, 'J':10, 'Q':10, 'K':10, 'A':20, '2':20, 'JK':50 };
const kentuckyCardPoints = { '3':5, '4':5, '5':5, '6':5, '7':5, '8':5, '9':5, '10':10, 'J':10, 'Q':10, 'K':10, 'A':20, '2':20, 'JK':50 };
const bookBonus = { red:500, black:300 };
const penalty3 = { red:-500, black:-300 };
let UID=0;
let aiTurnTimer = null;
let aiReadyAt = 0;
const state = {
  view:'home', mode:'ai', zoom:1, audioOn:true, audioVolume:.55, difficulty:'club', gameStyle:'standard', allowBookAdds:true, confirmGoOut:true, requireBooks:true, learningMode:false,
  handNo:1, current:0, phase:'draw', selected:new Set(), selectedMeld:null,
  stock:[], discard:[], players:[], teams:[], gameEnded:false, handEnded:false, pileIntent:false, pickupObligation:null
};
function id(){ return `c${++UID}`; }
function teamOf(i){ return i%2; }
function makePlayer(name, ai=true){ return { name, ai, hand:[], foot:[], inFoot:false, out:false, floating:false }; }
function makeTeam(name){ return { name, score:0, handScore:0, melds:[], opened:false, wentOut:false }; }
function makeDeck(decks=5){
  const cards=[];
  for(let d=0; d<decks; d++){
    for(const s of suits){ for(const r of ['A','2','3','4','5','6','7','8','9','10','J','Q','K']) cards.push({id:id(), rank:r, suit:s}); }
    cards.push({id:id(), rank:'JK', suit:'★'}); cards.push({id:id(), rank:'JK', suit:'★'});
  }
  return shuffle(cards);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function isRed(c){ return c.rank!=='JK' && redSuits.has(c.suit); }
function isThree(c){ return c.rank==='3'; }
function isWild(c){ return c.rank==='2' || c.rank==='JK'; }
function isMeldRank(c){ return meldRanks.includes(c.rank); }
function rankLabel(rank){
  const names = { J:'Jacks', Q:'Queens', K:'Kings', A:'Aces', JK:'Jokers' };
  return names[rank] || `${rank}s`;
}
function isKentucky(){ return state.gameStyle === 'kentucky'; }
function points(c){
  const table = isKentucky() ? kentuckyCardPoints : standardCardPoints;
  return table[c.rank] || 0;
}
function requiredOpening(){ return openMinimums[state.handNo-1]; }
function hasRequiredBooks(team){
  const hasClean = team.melds.some(m=>m.booked && !m.black);
  const hasDirty = team.melds.some(m=>m.booked && m.black);
  return hasClean && hasDirty;
}
function colorClass(c){ return isWild(c)?'wild':isRed(c)?'red':'black'; }
function liveCards(p){ return p.inFoot ? p.foot : p.hand; }
function currentPlayer(){ return state.players[state.current]; }
function currentTeam(){ return state.teams[teamOf(state.current)]; }
function playerMeldCount(playerIndex){ return state.teams[teamOf(playerIndex)]?.melds?.length || 0; }
function manualSortHand(){
  sortCards(liveCards(currentPlayer()));
  render();
}

function sortCards(cards){ cards.sort((a,b)=> rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank) || suits.indexOf(a.suit)-suits.indexOf(b.suit)); }
function show(view){
  ['home','setup','game'].forEach(v=>{
    const el = $(v);
    if(el) el.classList.toggle('hidden', v!==view);
  });
  state.view=view;
}
function message(txt){ $('message').textContent = txt; }
function selectedCards(){ const p=state.players[0]; return liveCards(p).filter(c=>state.selected.has(c.id)); }
function startSetup(mode='ai'){
  state.mode = 'ai';
  const title = $('setupTitle');
  const intro = $('setupIntro');

  if(title) title.textContent = 'Play';
  if(intro) intro.textContent = 'Choose a robot difficulty level, then deal the cards.';

  show('setup');
}
function clearAiTimer(){
  if(aiTurnTimer){
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }
  aiReadyAt = 0;
}
function startGame(event){
  if(event) event.preventDefault();
  clearAiTimer();
  sound('click');

  try{
    state.difficulty = document.querySelector('input[name="ai"]:checked')?.value || 'club';
    state.gameStyle = document.querySelector('input[name="gameStyle"]:checked')?.value || 'standard';
    state.allowBookAdds = isKentucky() ? true : ($('allowBookAdds') ? $('allowBookAdds').checked : true);
    state.confirmGoOut = isKentucky() ? false : ($('confirmGoOut') ? $('confirmGoOut').checked : true);
    state.learningMode = $('setupLearning') ? $('setupLearning').checked : false;
    state.requireBooks = true;
    state.pickupObligation = null;
    state.handNo=1;
    state.current=0;
    state.gameEnded=false;
    state.handEnded=false;
    state.players = [makePlayer('You',false), makePlayer('AI Opponent')];
    state.teams = [makeTeam('Your Team'), makeTeam('AI Opponent')];
    dealHand();
    show('game');
  }catch(err){
    console.error('Deal Cards failed:', err);
    const detail = err && err.message ? err.message : 'Unknown error';
    alert(`Deal Cards hit an error: ${detail}`);
  }
}

function dealHand(){
  clearAiTimer();
  UID=0;
  const deckCount = isKentucky() ? state.players.length : 5;
  const packetSize = isKentucky() ? 13 : 11;

  state.stock=makeDeck(deckCount);
  state.discard=[];
  state.selected.clear();
  state.selectedMeld=null;
  state.phase='draw';
  state.handEnded=false;
  state.pileIntent=false;
  state.pickupObligation=null;

  state.teams.forEach(t=>{ t.melds=[]; t.opened=false; t.handScore=0; t.wentOut=false; });
  state.players.forEach(p=>{ p.hand=[]; p.foot=[]; p.inFoot=false; p.out=false; p.floating=false; });

  for(let i=0;i<packetSize;i++) state.players.forEach(p=>p.hand.push(state.stock.pop()));
  for(let i=0;i<packetSize;i++) state.players.forEach(p=>p.foot.push(state.stock.pop()));
  state.players.forEach(p=>sortCards(p.hand));

  // Kentucky play begins with drawing from the stock; the discard pile grows from actual discards.
  if(!isKentucky()){
    let up;
    do { up = state.stock.pop(); if(!up) break; } while(isWild(up));
    if(up) state.discard.push(up);
  }

  state.current = (state.handNo-1) % state.players.length;
  render();
  message(state.current===0
    ? `You start Hand ${state.handNo}. Draw 2${isKentucky() ? '.' : ' or take the discard pile.'}`
    : `${state.players[state.current].name} starts Hand ${state.handNo}. Draw 2${isKentucky() ? '.' : ' or take the discard pile.'}`);
  maybeRobotTurn();
}

function drawTwo(){
  if(state.phase!=='draw' || state.current!==0) return;
  sound('draw');
  drawFor(currentPlayer(),2);
  state.phase='play';
  state.pileIntent=false;
  state.pickupObligation=null;
  render();
  message(isKentucky() && currentPlayer().floating
    ? 'You are floating. Play what you can, but you must finish the hand by discarding a card that cannot be played.'
    : 'You drew 2. Make sets, add to books, then discard.');
}

function drawFor(p,n){ for(let i=0;i<n;i++){ if(!state.stock.length) recycleDiscard(); if(state.stock.length) liveCards(p).push(state.stock.pop()); } cardMoveSound(n); }
function recycleDiscard(){ if(state.discard.length<=1) return; const top=state.discard.pop(); state.stock=shuffle(state.discard.splice(0)); state.discard=[top]; }
function topDiscard(){ return state.discard[state.discard.length-1]; }
function kentuckyPickupPlan(playerIndex, top){
  if(!top || isThree(top)) return null;
  const p = state.players[playerIndex];
  const team = state.teams[teamOf(playerIndex)];
  const cards = liveCards(p);

  // If the top card can be played directly onto an existing book/meld, that is legal.
  for(const m of team.melds){
    if(isWild(top)){
      if(canAddToMeld([top],m).ok) return {type:'add', meldRank:m.rank, cardIds:[top.id]};
    }else if(m.rank===top.rank && canAddToMeld([top],m).ok){
      return {type:'add', meldRank:m.rank, cardIds:[top.id]};
    }
  }

  // A new pickup meld requires either a natural pair, or one natural plus one wild.
  if(isWild(top)) return null;
  const naturals = cards.filter(c=>!isWild(c) && c.rank===top.rank);
  const wilds = cards.filter(isWild);
  let pickupSet = null;
  if(naturals.length>=2){
    pickupSet = [top,naturals[0],naturals[1]];
  }else if(naturals.length>=1 && wilds.length>=1){
    pickupSet = [top,naturals[0],wilds[0]];
  }
  if(!pickupSet) return null;

  if(team.opened){
    return {type:'set', rank:top.rank, cardIds:pickupSet.map(c=>c.id)};
  }

  // Before opening, the pickup card must participate in a legal opening that reaches the hand minimum.
  const opening = robotOpeningCandidates([...cards,top],team,top.id);
  if(!opening.length) return null;
  return {
    type:'opening',
    rank:top.rank,
    groups:opening.map(item=>item.set.map(c=>c.id))
  };
}

function canTakePile(playerIndex){
  if(state.phase!=='draw') return {ok:false, reason:'You must draw or take the pile first.'};
  const top=topDiscard();
  if(!top) return {ok:false, reason:'Discard pile is empty.'};

  if(!isKentucky()){
    if(isThree(top) || isWild(top)) return {ok:false, reason:'The pile is frozen because the top card is a 3 or wild card.'};
    const team=state.teams[teamOf(playerIndex)];
    if(team.melds.some(m=>m.rank===top.rank)) return {ok:false, reason:'Your team already has a set or book of that face.'};
    const cards=liveCards(state.players[playerIndex]);
    const matches=cards.filter(c=>c.rank===top.rank && !isWild(c));
    if(matches.length<2) return {ok:false, reason:'You need two natural cards matching the top discard.'};
    return {ok:true, matches};
  }

  if(isThree(top)) return {ok:false, reason:'A discarded 3 freezes the pile in Kentucky Rules.'};
  const plan = kentuckyPickupPlan(playerIndex,top);
  if(!plan){
    return {ok:false, reason:'To take the pile, the top card must be playable now with a natural pair, a natural + wild, or an existing meld/book.'};
  }
  return {ok:true, plan, top};
}

function takeCardsFromDiscard(playerIndex,count,plan=null){
  const top = topDiscard();
  if(!top) return [];
  const amount = Math.max(1,Math.min(count,state.discard.length));
  const take = state.discard.splice(Math.max(0,state.discard.length-amount));
  liveCards(state.players[playerIndex]).push(...take);
  cardMoveSound(take.length);

  if(isKentucky()){
    state.pickupObligation = {
      playerIndex,
      cardId:top.id,
      rank:top.rank,
      plan
    };
  }
  return take;
}

function finishHumanPileTake(count,plan){
  const take = takeCardsFromDiscard(0,count,plan);
  state.phase='play';
  render();
  message(`You took ${take.length} card${take.length===1?'':'s'} from the discard pile. Play the top pickup card immediately.`);
}

function takePile(){
  if(state.current!==0) return;
  sound('draw');
  const chk=canTakePile(0);
  if(!chk.ok){ message(chk.reason); return; }

  if(!isKentucky()){
    const take = state.discard.splice(Math.max(0,state.discard.length-7));
    liveCards(currentPlayer()).push(...take);
    cardMoveSound(take.length);
    state.phase='play';
    render();
    message(`You took ${take.length} cards from the discard pile. Use the top card in a new set.`);
    return;
  }

  const maxTake = Math.min(8,state.discard.length);
  if(maxTake<=1){
    finishHumanPileTake(1,chk.plan);
    return;
  }

  showModal(`
    <section class="winner-card pile-choice-card">
      <div class="winner-badge">🂠</div>
      <h2>Take the Discard Pile</h2>
      <p>Kentucky Rules require the top card to be played immediately.</p>
      <div class="modal-actions">
        <button id="takeTopOnly" type="button">Top Card Only</button>
        <button id="takeTopPlus" class="gold" type="button">Top + ${maxTake-1} (${maxTake} cards)</button>
      </div>
    </section>
  `);

  setTimeout(()=>{
    const one = $('takeTopOnly');
    const many = $('takeTopPlus');
    if(one) one.onclick = ()=>{ $('modal')?.close(); finishHumanPileTake(1,chk.plan); };
    if(many) many.onclick = ()=>{ $('modal')?.close(); finishHumanPileTake(maxTake,chk.plan); };
  },0);
}

function validateSet(cards, team){
  if(cards.length<3) return {ok:false, reason:'A set needs at least 3 cards.'};
  if(cards.some(isThree)) return {ok:false, reason:'3s cannot be melded.'};
  const naturals=cards.filter(c=>!isWild(c));
  const wilds=cards.filter(isWild);
  if(!naturals.length) return {ok:false, reason:'You may not make a wild-card set.'};
  const rank=naturals[0].rank;
  if(!meldRanks.includes(rank)) return {ok:false, reason:'Sets must be 4 through Ace.'};
  if(naturals.some(c=>c.rank!==rank)) return {ok:false, reason:'Natural cards in a set must match.'};
  if(wilds.length>naturals.length) return {ok:false, reason:'A black set must have at least as many natural cards as wilds.'};
  if(team.melds.some(m=>m.rank===rank)) return {ok:false, reason:'Your team already has a set or book of that face.'};
  const meldPoints=cards.reduce((s,c)=>s+points(c),0);
  if(!team.opened && meldPoints < openMinimums[state.handNo-1]) return {ok:false, reason:`Your team needs ${openMinimums[state.handNo-1]} points to open.`};
  return {ok:true, rank, wilds:wilds.length, meldPoints};
}

function analyzeSelectedSets(cards, team){
  if(!cards.length) return {ok:false, reason:'Select cards to meld.'};
  if(cards.some(isThree)) return {ok:false, reason:'3s cannot be melded.'};

  const naturalGroups = new Map();
  const wilds = [];
  for(const c of cards){
    if(isWild(c)) wilds.push(c);
    else {
      if(!meldRanks.includes(c.rank)) return {ok:false, reason:'Sets must be 4 through Ace.'};
      if(!naturalGroups.has(c.rank)) naturalGroups.set(c.rank, []);
      naturalGroups.get(c.rank).push(c);
    }
  }

  if(!naturalGroups.size) return {ok:false, reason:'You may not make a wild-card set.'};

  const sets = [];
  const ranks = [...naturalGroups.keys()].sort((a,b)=>rankOrder.indexOf(a)-rankOrder.indexOf(b));
  let remainingWilds = [...wilds];

  for(const rank of ranks){
    if(team.melds.some(m=>m.rank===rank)) return {ok:false, reason:`Your team already has a set or book of ${rankLabel(rank)}.`};
    const naturals = naturalGroups.get(rank);
    let setWilds = [];
    const needed = Math.max(0, 3 - naturals.length);

    if(needed > 0){
      const maxWilds = naturals.length;
      if(needed > maxWilds) return {ok:false, reason:`${rankLabel(rank)} need more natural cards before wilds can be used.`};
      setWilds = remainingWilds.splice(0, needed);
      if(setWilds.length < needed) return {ok:false, reason:`${rankLabel(rank)} need at least 3 cards to make a set.`};
    }

    const setCards = [...naturals, ...setWilds];
    if(setCards.length < 3) return {ok:false, reason:`${rankLabel(rank)} need at least 3 cards to make a set.`};
    if(setWilds.length > naturals.length) return {ok:false, reason:'A black set must have at least as many natural cards as wild cards.'};
    sets.push({rank, cards:setCards, wilds:setWilds.length});
  }

  if(remainingWilds.length){
    if(sets.length !== 1) return {ok:false, reason:'Extra wilds can only be added when one new set is selected.'};
    const s = sets[0];
    const naturalCount = s.cards.length - s.wilds;
    const maxExtraWilds = Math.max(0, naturalCount - s.wilds);
    if(remainingWilds.length > maxExtraWilds) return {ok:false, reason:'Too many wilds. Natural cards must be at least wild cards.'};
    s.cards.push(...remainingWilds);
    s.wilds += remainingWilds.length;
  }

  const meldPoints = sets.reduce((sum,set)=>sum + set.cards.reduce((s,c)=>s+points(c),0), 0);
  if(!team.opened && meldPoints < openMinimums[state.handNo-1]){
    return {ok:false, reason:`Your team needs ${openMinimums[state.handNo-1]} points to open. Selected cards total ${meldPoints}.`};
  }

  return {ok:true, sets, meldPoints};
}

function makeSet(){
  if(state.current!==0 || state.phase!=='play') return;
  const cards=selectedCards();
  const team=currentTeam();

  if(isKentucky() && state.pickupObligation?.playerIndex===0 && !cards.some(c=>c.id===state.pickupObligation.cardId)){
    sound('error'); message('Play the top card you picked up before making another meld.'); return;
  }
  const v=analyzeSelectedSets(cards, team);
  if(!v.ok){ sound('error'); message(v.reason); return; }

  for(const set of v.sets){
    removeCards(currentPlayer(), set.cards);
    team.melds.push({
      rank:set.rank,
      cards:[...set.cards],
      black:set.wilds>0,
      booked:set.cards.length>=7
    });
  }

  sortTeamMelds(team);
  team.opened=true;
  if(isKentucky() && state.pickupObligation?.playerIndex===0 && cards.some(c=>c.id===state.pickupObligation.cardId)) state.pickupObligation=null;
  state.selected.clear();
  checkFoot(currentPlayer());
  render();

  const label = v.sets.map(s => `${s.rank}s`).join(', ');
  cardMoveSound(cards.length); sound('meld'); message(`Melded ${label} for ${v.meldPoints} points.`);
  checkHumanEmpty();
}
function removeCards(p,cards){ const ids=new Set(cards.map(c=>c.id)); p.hand=p.hand.filter(c=>!ids.has(c.id)); p.foot=p.foot.filter(c=>!ids.has(c.id)); }
function canAddToMeld(cards, meld){
  if(!cards.length) return {ok:false, reason:'Select cards to add.'};
  if(cards.some(isThree)) return {ok:false, reason:'3s cannot be melded.'};
  if(meld.rank && cards.some(c=>!isWild(c) && c.rank!==meld.rank)) return {ok:false, reason:`Only ${meld.rank}s or wilds can be added.`};
  const currentWild = meld.cards.filter(isWild).length;
  const currentNat = meld.cards.length-currentWild;
  const addWild = cards.filter(isWild).length;
  const addNat = cards.length-addWild;
  if(meld.booked && !state.allowBookAdds) return {ok:false, reason:'This game does not allow cards to be added to completed books.'};
  if(!meld.black && addWild>0 && meld.booked) return {ok:false, reason:'A red book can only receive natural cards.'};
  if(isKentucky() && currentWild+addWild > currentNat+addNat) return {ok:false, reason:'Kentucky dirty books may never have more wild cards than natural cards.'};
  if(!isKentucky() && !meld.booked && currentWild+addWild > currentNat+addNat) return {ok:false, reason:'Before booking, natural cards must be at least wild cards.'};
  return {ok:true};
}
function addToMeld(){
  if(state.current!==0 || state.phase!=='play') return;
  const team=currentTeam(); if(!team.opened){ message('Your team must open before adding cards.'); return; }
  const cards=selectedCards();
  if(isKentucky() && state.pickupObligation?.playerIndex===0 && !cards.some(c=>c.id===state.pickupObligation.cardId)){
    message('Play the top card you picked up before adding anything else.'); return;
  }
  let meld = state.selectedMeld!==null ? team.melds[state.selectedMeld] : null;
  if(!meld && cards.length){ const natural=cards.find(c=>!isWild(c)); if(natural) meld=team.melds.find(m=>m.rank===natural.rank); }
  if(!meld){ message('Tap one of your team melds, then press Add.'); return; }
  const v=canAddToMeld(cards,meld); if(!v.ok){ message(v.reason); return; }
  removeCards(currentPlayer(),cards); meld.cards.push(...cards); if(cards.some(isWild)) meld.black=true; if(meld.cards.length>=7) meld.booked=true;
  if(isKentucky() && state.pickupObligation?.playerIndex===0 && cards.some(c=>c.id===state.pickupObligation.cardId)) state.pickupObligation=null;
  state.selected.clear(); state.selectedMeld=null; checkFoot(currentPlayer()); render(); cardMoveSound(cards.length); message(`Added ${cards.length} card${cards.length===1?'':'s'} to ${meld.rank}s.`); checkHumanEmpty();
}
function kentuckyNewSetIncluding(card,playerIndex){
  if(isThree(card)) return null;
  const p=state.players[playerIndex];
  const team=state.teams[teamOf(playerIndex)];
  const cards=liveCards(p);

  if(isWild(card)){
    for(const rank of meldRanks){
      if(team.melds.some(m=>m.rank===rank)) continue;
      const naturals=cards.filter(c=>c.id!==card.id && !isWild(c) && c.rank===rank);
      if(naturals.length>=2) return [card,naturals[0],naturals[1]];
    }
    return null;
  }

  if(team.melds.some(m=>m.rank===card.rank)) return null;
  const naturals=cards.filter(c=>c.id!==card.id && !isWild(c) && c.rank===card.rank);
  const wilds=cards.filter(c=>c.id!==card.id && isWild(c));
  if(naturals.length>=2) return [card,naturals[0],naturals[1]];
  if(naturals.length>=1 && wilds.length>=1) return [card,naturals[0],wilds[0]];
  return null;
}

function kentuckyCardCanBePlayed(card,playerIndex){
  if(!isKentucky() || isThree(card)) return false;
  const p=state.players[playerIndex];
  const team=state.teams[teamOf(playerIndex)];

  for(const m of team.melds){
    if((isWild(card) || m.rank===card.rank) && canAddToMeld([card],m).ok) return true;
  }

  if(team.opened) return !!kentuckyNewSetIncluding(card,playerIndex);

  const opening = robotOpeningCandidates(liveCards(p),team,card.id);
  return opening.length>0;
}

function markFloatingAndPass(playerIndex){
  const p=state.players[playerIndex];
  p.floating=true;
  state.pickupObligation=null;
  state.selected.clear();
  state.selectedMeld=null;
  nextTurn();
}

function discardSelected(){
  if(state.current!==0 || state.phase!=='play') return;
  const cards=selectedCards();
  if(cards.length!==1){ message('Select exactly one card to discard.'); return; }

  const c=cards[0];
  if(isKentucky()){
    if(state.pickupObligation?.playerIndex===0){
      message('You must play the top card you picked up before you can discard.'); return;
    }
    if(kentuckyCardCanBePlayed(c,0)){
      message(`${rankLabel(c.rank)} can still be played. Kentucky Rules do not allow you to discard a playable card.`);
      return;
    }
  }

  sound('discard');
  cardMoveSound(1);
  removeCards(currentPlayer(),[c]);
  state.discard.push(c);
  state.selected.clear();
  state.selectedMeld=null;

  const p=currentPlayer();
  if(!p.inFoot && p.hand.length===0){
    p.inFoot=true;
    message('You discarded your last Hand card. Your Foot starts next turn.');
  }

  if(p.inFoot && p.foot.length===0){
    if(isKentucky()){
      if(hasRequiredBooks(currentTeam())){
        finishHand(0);
      }else{
        p.floating=true;
        nextTurn();
      }
      return;
    }
    finishHand(0);
    return;
  }
  nextTurn();
}

function checkFoot(p){
  if(!p.inFoot && p.hand.length===0){
    p.inFoot=true;
    message('You picked up your Foot and may keep playing.');
  }
}

function checkHumanEmpty(){
  const p=state.players[0];
  if(p.inFoot && p.foot.length===0){
    if(isKentucky()){
      p.floating=true;
      markFloatingAndPass(0);
      return;
    }
    finishHand(0);
    return;
  }
  render();
}

function canGoOut(playerIndex){
  const p=state.players[playerIndex], team=state.teams[teamOf(playerIndex)];
  if(isKentucky()){
    return {ok:false, reason:'Kentucky Rules end the hand by discarding your final non-playable Foot card.'};
  }
  if(!p.inFoot) return {ok:false, reason:'You must be in your foot before going out.'};
  if(liveCards(p).length>0) return {ok:false, reason:'Play or discard all foot cards to go out.'};
  if(state.requireBooks && !hasRequiredBooks(team)){
    return {ok:false, reason:'This table requires one clean and one dirty book to go out.'};
  }
  return {ok:true};
}

function goOutClick(){
  const chk=canGoOut(0);
  if(!chk.ok){ message(chk.reason); return; }

  if(!state.confirmGoOut){
    finishHand(0);
    return;
  }

  showModal(`
    <section class="winner-card">
      <div class="winner-badge">🏁</div>
      <h2>Go Out?</h2>
      <p>This will end the current hand.</p>
      <div class="modal-actions">
        <button id="cancelGoOut" type="button">Keep Playing</button>
        <button id="confirmGoOutNow" class="gold" type="button">Go Out</button>
      </div>
    </section>
  `);

  setTimeout(()=>{
    const cancel = $('cancelGoOut');
    const confirm = $('confirmGoOutNow');
    if(cancel) cancel.onclick = () => $('modal')?.close();
    if(confirm) confirm.onclick = () => {
      $('modal')?.close();
      finishHand(0);
    };
  },0);
}

function aiDelay(min=2000,max=6000){
  return Math.floor(Math.random() * (max-min+1)) + min;
}
function aiDelayByDifficulty(){
  const d = state.difficulty || 'club';
  if(d === 'easy') return aiDelay(4000,6000);
  if(d === 'shark') return aiDelay(2000,4000);
  return aiDelay(3000,5000);
}

function nextTurn(){
  state.phase='draw'; state.pileIntent=false; state.selected.clear(); state.selectedMeld=null;
  for(let i=1;i<=state.players.length;i++){ const n=(state.current+i)%state.players.length; if(!state.players[n].out){ state.current=n; break; } }
  render(); message(state.current===0 ? 'Your turn. Draw 2 or take the pile.' : `${state.players[state.current].name}'s turn. Draw 2 or take the pile.`); maybeRobotTurn();
}

function showRoundWinner(playerIndex){
  const my = state.teams[0];
  const opp = state.teams[1];
  const winningTeam = my.handScore >= opp.handScore ? my : opp;
  const isGameOver = state.handNo >= 4;
  sound('win');
  showModal(`
    <section class="winner-card">
      <div class="winner-badge">${winningTeam === my ? '🏆' : '🤖'}</div>
      <h2>${isGameOver ? 'Game Complete' : `Hand ${state.handNo} Complete`}</h2>
      <p>${state.players[playerIndex].name} went out. <b>${winningTeam.name}</b> won this hand.</p>
      <div class="winner-score">
        <div>Your Team<strong>${my.handScore}</strong><small>Total: ${my.score}</small></div>
        <div>Opponents<strong>${opp.handScore}</strong><small>Total: ${opp.score}</small></div>
      </div>
      <p>${isGameOver ? finalWinnerText() : 'Close this window, then press Next Hand when ready.'}</p>
    </section>
  `);
}
function finalWinnerText(){
  const my = state.teams[0], opp = state.teams[1];
  if(my.score === opp.score) return `Final score is tied at ${my.score}.`;
  const winner = my.score > opp.score ? my : opp;
  return `${winner.name} wins the game, ${my.score} to ${opp.score}.`;
}

function finishHand(playerIndex){
  state.handEnded=true; state.teams[teamOf(playerIndex)].wentOut=true;
  scoreHand(); render();
  const winner = state.teams[0].handScore >= state.teams[1].handScore ? state.teams[0] : state.teams[1];
  message(`${state.players[playerIndex].name} went out. ${winner.name} won this hand.`);
  $('nextHandBtn').classList.toggle('hidden', state.handNo>=4);
  showRoundWinner(playerIndex);
  if(state.handNo>=4) setTimeout(showFinalScores, 600);
}
function scoreHand(){
  state.teams.forEach((t,ti)=>{
    let score=0;

    for(const m of t.melds){
      if(isKentucky()){
        if(m.booked){
          score += m.black ? 300 : 500;
        }else{
          score += m.cards.reduce((s,c)=>s+points(c),0);
        }
      }else{
        score += m.cards.reduce((s,c)=>s+points(c),0);
        if(m.booked) score += m.black ? bookBonus.black : bookBonus.red;
      }
    }

    state.players.forEach((p,pi)=>{
      if(teamOf(pi)!==ti) return;
      for(const c of [...p.hand,...p.foot]){
        if(isKentucky()){
          if(isThree(c)) score += isRed(c) ? -500 : -5;
          else score -= points(c);
        }else{
          score += isThree(c) ? (isRed(c)?penalty3.red:penalty3.black) : -points(c);
        }
      }
    });

    if(t.wentOut) score += isKentucky() ? 500 : 100;
    t.handScore=score;
    t.score+=score;
  });
}

function nextHand(){ if(state.handNo>=4) return; state.handNo++; dealHand(); }
function robotTurn(){
  if(state.current===0 || state.handEnded) return;

  const remaining = aiReadyAt ? aiReadyAt - Date.now() : 0;
  if(remaining > 25){
    if(aiTurnTimer) clearTimeout(aiTurnTimer);
    aiTurnTimer = window.setTimeout(()=>{
      aiTurnTimer = null;
      robotTurn();
    }, remaining);
    return;
  }

  aiReadyAt = 0;
  const idx=state.current, p=currentPlayer();

  const take = robotShouldTake(idx);
  if(take){
    const chk=canTakePile(idx);
    if(isKentucky()){
      const pickupCount = robotKentuckyPickupCount(idx);
      takeCardsFromDiscard(idx,pickupCount,chk.plan);
    }else{
      const cards=state.discard.splice(Math.max(0,state.discard.length-7));
      liveCards(p).push(...cards);
      cardMoveSound(cards.length);
    }
  } else {
    drawFor(p,2);
    state.pickupObligation=null;
  }

  state.phase='play';
  robotPlay(idx);
  render();
  robotDiscard(idx);
}

function robotKentuckyPickupCount(idx){
  const maxTake=Math.min(8,state.discard.length);
  if(maxTake<=1) return 1;
  const pickup=state.discard.slice(Math.max(0,state.discard.length-maxTake));
  const redThrees=pickup.filter(c=>isThree(c) && isRed(c)).length;
  if(redThrees>=2) return 1;
  if(state.difficulty==='easy') return 1;
  return maxTake;
}

function robotShouldTake(idx){
  const chk=canTakePile(idx);
  if(!chk.ok) return false;
  if(state.difficulty==='easy') return false;

  if(isKentucky()){
    const top=topDiscard();
    const p=state.players[idx];
    const team=state.teams[teamOf(idx)];
    const pickup=state.discard.slice(Math.max(0,state.discard.length-Math.min(8,state.discard.length)));
    const useful=pickup.filter(c =>
      !isThree(c) && (
        (!isWild(c) && team.melds.some(m=>m.rank===c.rank)) ||
        (!isWild(c) && liveCards(p).filter(h=>!isWild(h)&&h.rank===c.rank).length>=2) ||
        isWild(c)
      )
    ).length;
    const redPenalty=pickup.filter(c=>isThree(c)&&isRed(c)).length;

    if(state.difficulty==='shark'){
      return chk.plan?.type==='add' || useful>=3 || (useful>=2 && redPenalty===0);
    }
    return Math.random() < (redPenalty ? .25 : .55);
  }

  if(state.difficulty==='club') return Math.random()<.55;

  const top = topDiscard();
  const p = state.players[idx];
  const team = state.teams[teamOf(idx)];
  const cards = liveCards(p);
  const matching = cards.filter(c=>c.rank===top.rank && !isWild(c)).length;
  const pickup = state.discard.slice(Math.max(0,state.discard.length-7));
  const useful = pickup.filter(c =>
    !isThree(c) && (
      c.rank===top.rank ||
      team.melds.some(m=>m.rank===c.rank) ||
      cards.filter(h=>h.rank===c.rank && !isWild(h)).length>=2
    )
  ).length;
  const penalty = pickup.filter(isThree).length;
  return matching>=3 || useful>=3 || (useful>=2 && penalty===0) || (!team.opened && pickup.reduce((s,c)=>s+Math.max(0,points(c)),0)>=40);
}

function robotOpeningCandidates(cards, team, requiredCardId=null){
  const byRank = {};
  cards.forEach(c => {
    if(!isWild(c) && isMeldRank(c)){
      (byRank[c.rank] ||= []).push(c);
    }
  });

  const unusedWilds = [...cards.filter(isWild)];
  const sets = [];

  for(const rank of meldRanks){
    if(team.melds.some(m=>m.rank===rank)) continue;
    const naturals=[...(byRank[rank]||[])];
    if(naturals.length>=3){
      let set=naturals.slice(0,Math.min(naturals.length,7));
      if(requiredCardId && naturals.some(c=>c.id===requiredCardId) && !set.some(c=>c.id===requiredCardId)){
        set[set.length-1]=naturals.find(c=>c.id===requiredCardId);
      }
      sets.push(set);
    }else if(naturals.length>=2 && unusedWilds.length){
      sets.push([naturals[0],naturals[1],unusedWilds.shift()]);
    }
  }

  sets.sort((a,b)=>{
    if(requiredCardId){
      const ar=a.some(c=>c.id===requiredCardId), br=b.some(c=>c.id===requiredCardId);
      if(ar!==br) return ar ? -1 : 1;
    }
    return b.reduce((s,c)=>s+points(c),0)-a.reduce((s,c)=>s+points(c),0);
  });

  const chosen=[];
  let total=0;
  for(const set of sets){
    const naturals=set.filter(c=>!isWild(c));
    const wilds=set.filter(isWild);
    if(set.length<3 || !naturals.length || wilds.length>naturals.length) continue;
    chosen.push({
      set,
      validation:{ok:true,rank:naturals[0].rank,wilds:wilds.length,meldPoints:set.reduce((s,c)=>s+points(c),0)}
    });
    total += set.reduce((s,c)=>s+points(c),0);
    const hasRequired = !requiredCardId || chosen.some(item=>item.set.some(c=>c.id===requiredCardId));
    if(total>=requiredOpening() && hasRequired) return chosen;
  }
  return [];
}

function robotUseKentuckyPickup(idx){
  const obligation=state.pickupObligation;
  if(!isKentucky() || !obligation || obligation.playerIndex!==idx) return true;

  const p=state.players[idx];
  const team=state.teams[teamOf(idx)];
  const top=liveCards(p).find(c=>c.id===obligation.cardId);
  if(!top){ state.pickupObligation=null; return true; }

  const plan=obligation.plan || {};
  if(plan.type==='add'){
    const meld=team.melds.find(m=>m.rank===plan.meldRank && canAddToMeld([top],m).ok);
    if(meld){
      removeCards(p,[top]);
      meld.cards.push(top);
      if(isWild(top)) meld.black=true;
      if(meld.cards.length>=7) meld.booked=true;
      state.pickupObligation=null;
      return true;
    }
  }

  if(plan.type==='set'){
    const use=plan.cardIds.map(id=>liveCards(p).find(c=>c.id===id)).filter(Boolean);
    const v=validateSet(use,team);
    if(v.ok){
      removeCards(p,use);
      team.melds.push({rank:v.rank,cards:[...use],black:v.wilds>0,booked:use.length>=7});
      team.opened=true;
      sortTeamMelds(team);
      state.pickupObligation=null;
      return true;
    }
  }

  if(plan.type==='opening'){
    const opening=robotOpeningCandidates(liveCards(p),team,obligation.cardId);
    if(opening.length){
      for(const item of opening){
        removeCards(p,item.set);
        team.melds.push({
          rank:item.validation.rank,
          cards:[...item.set],
          black:item.validation.wilds>0,
          booked:item.set.length>=7
        });
      }
      team.opened=true;
      sortTeamMelds(team);
      state.pickupObligation=null;
      return true;
    }
  }

  return false;
}

function robotPlay(idx){
  cardMoveSound(1);
  const p=state.players[idx], team=state.teams[teamOf(idx)];
  sortCards(liveCards(p));

  if(isKentucky() && state.pickupObligation?.playerIndex===idx){
    robotUseKentuckyPickup(idx);
    sortCards(liveCards(p));
  }

  if(!team.opened){
    const opening = robotOpeningCandidates(liveCards(p), team);
    if(opening.length){
      for(const item of opening){
        removeCards(p,item.set);
        team.melds.push({
          rank:item.validation.rank,
          cards:[...item.set],
          black:item.validation.wilds>0,
          booked:item.set.length>=7
        });
      }
      sortTeamMelds(team);
      team.opened=true;
      checkFoot(p);
      sortCards(liveCards(p));
    }
  }

  let played=true, safety=0;
  while(played && safety++<20){
    played=false;

    for(const m of team.melds){
      const cardsNow=[...liveCards(p)];
      const add=[];
      for(const c of cardsNow){
        const wildRoom = m.cards.filter(isWild).length < (m.cards.length - m.cards.filter(isWild).length);
        if(c.rank===m.rank || (isWild(c) && (m.black || (!m.booked && wildRoom)))) add.push(c);
      }
      if(add.length){
        let use;
        if(state.difficulty==='shark'){
          const naturals = add.filter(c=>!isWild(c));
          const wilds = add.filter(isWild);
          const neededForBook = Math.max(0, 7 - m.cards.length);
          use = naturals.slice(0, Math.max(1, neededForBook));
          if(m.cards.length + use.length < 7 && wilds.length){
            const currentNatural = m.cards.filter(c=>!isWild(c)).length + use.length;
            const currentWild = m.cards.filter(isWild).length;
            if(currentNatural > currentWild) use.push(wilds[0]);
          }
        } else {
          use=add.slice(0,1);
        }
        const v=canAddToMeld(use,m);
        if(v.ok){
          removeCards(p,use);
          m.cards.push(...use);
          if(use.some(isWild)) m.black=true;
          if(m.cards.length>=7) m.booked=true;
          played=true;
        }
      }
    }

    const candidate=bestRobotSet(liveCards(p),team);
    if(candidate){
      const v=validateSet(candidate,team);
      if(v.ok){
        removeCards(p,candidate);
        team.melds.push({rank:v.rank,cards:[...candidate],black:v.wilds>0,booked:candidate.length>=7});
        sortTeamMelds(team);
        team.opened=true;
        played=true;
      }
    }

    checkFoot(p);
    sortCards(liveCards(p));
  }
}

function bestRobotSet(cards,team){
  const by={}; for(const c of cards){ if(!isWild(c) && !isThree(c) && meldRanks.includes(c.rank)){ (by[c.rank] ||= []).push(c); } }
  const wilds=cards.filter(isWild);
  const ranks=Object.keys(by).sort((a,b)=>by[b].length-by[a].length);
  for(const r of ranks){
    if(team.melds.some(m=>m.rank===r)) continue;
    const naturals=by[r]; if(naturals.length<3 && state.difficulty==='easy') continue;
    const use=[...naturals];
    if(state.difficulty!=='easy' && use.length>=2 && wilds.length) use.push(...wilds.slice(0,Math.min(wilds.length,use.length)));
    if(use.length>=3){ const pts=use.reduce((s,c)=>s+points(c),0); if(team.opened || pts>=openMinimums[state.handNo-1]) return use; }
  }
  return null;
}
function robotDiscardKeepValue(card, cards, idx){
  if(isThree(card)) return -1000;
  if(isWild(card)) return 1000;

  const sameRank = cards.filter(c=>c.id!==card.id && c.rank===card.rank && !isWild(c)).length;
  const ownTeam = state.teams[teamOf(idx)];
  const opponent = state.teams[1-teamOf(idx)];
  let keep = sameRank * 90 + points(card);

  if(ownTeam.melds.some(m=>m.rank===card.rank)){
    const meld = ownTeam.melds.find(m=>m.rank===card.rank);
    keep += meld && meld.cards.length < 7 ? 180 : 70;
  }

  // Shark remembers exposed opponent melds and avoids feeding them.
  if(opponent.melds.some(m=>m.rank===card.rank)) keep += state.difficulty==='shark' ? 500 : 180;

  // Aces and other high cards are useful for opening, especially early.
  if(!ownTeam.opened) keep += points(card) * (state.difficulty==='shark' ? 3 : 1);

  return keep;
}

function robotDiscard(idx){
  cardMoveSound(1);
  const p=state.players[idx];
  let cards=liveCards(p);

  if(!cards.length){
    if(isKentucky() && p.inFoot){
      markFloatingAndPass(idx);
      return;
    }
    finishHand(idx);
    return;
  }

  let choice;
  if(isKentucky()){
    const legalDiscards=cards.filter(c=>!kentuckyCardCanBePlayed(c,idx));
    if(!legalDiscards.length){
      robotPlay(idx);
      cards=liveCards(p);
      const retry=cards.filter(c=>!kentuckyCardCanBePlayed(c,idx));
      if(!cards.length){
        if(p.inFoot){ markFloatingAndPass(idx); return; }
      }
      choice=retry[0] || null;
      if(!choice){
        // No legal Kentucky discard this turn. Pass and try again after the next draw.
        p.floating = p.inFoot;
        nextTurn();
        return;
      }
    }else if(state.difficulty==='shark'){
      choice=[...legalDiscards].sort((a,b)=>robotDiscardKeepValue(a,cards,idx)-robotDiscardKeepValue(b,cards,idx))[0];
    }else{
      choice=legalDiscards.find(isThree) || legalDiscards.find(c=>!isWild(c)) || legalDiscards[0];
    }
  }else if(state.difficulty==='shark'){
    choice = [...cards]
      .filter(c=>!isWild(c))
      .sort((a,b)=>robotDiscardKeepValue(a,cards,idx)-robotDiscardKeepValue(b,cards,idx))[0]
      || cards[0];
  }else{
    choice=cards.find(isThree);
    if(!choice){
      const team=state.teams[teamOf(idx)], opp=state.teams[1-teamOf(idx)];
      const danger=new Set(opp.melds.map(m=>m.rank));
      choice=[...cards].reverse().find(c=>!isWild(c) && !danger.has(c.rank)) || cards.find(c=>!isWild(c)) || cards[0];
    }
  }

  removeCards(p,[choice]);
  state.discard.push(choice);
  if(!p.inFoot && p.hand.length===0) p.inFoot=true;

  if(p.inFoot && p.foot.length===0){
    if(isKentucky()){
      if(hasRequiredBooks(state.teams[teamOf(idx)])){
        finishHand(idx);
      }else{
        p.floating=true;
        nextTurn();
      }
      return;
    }
    finishHand(idx);
    return;
  }
  nextTurn();
}

function maybeRobotTurn(){
  if(state.current===0 || state.handEnded) return;

  if(aiTurnTimer){
    clearTimeout(aiTurnTimer);
    aiTurnTimer = null;
  }

  const delay = typeof aiDelayByDifficulty === 'function' ? aiDelayByDifficulty() : aiDelay();
  aiReadyAt = Date.now() + delay;
  message(`${state.players[state.current].name} is thinking...`);

  aiTurnTimer = window.setTimeout(()=>{
    aiTurnTimer = null;
    robotTurn();
  }, delay);
}

function cardHtml(c, selected=false){
  if(!c) return `<div class="card back"></div>`;
  return `<button class="card ${colorClass(c)}${selected?' selected':''}" data-card="${c.id}" title="${c.rank}${c.suit}"><span>${c.rank}</span><span class="suit">${c.suit}</span><span class="bottom">${c.rank}</span></button>`;
}

function meldSortValue(meld){
  return rankOrder.indexOf(meld.rank);
}
function sortTeamMelds(team){
  if(!team || !Array.isArray(team.melds)) return;
  team.melds.sort((a,b)=>{
    const av = meldSortValue(a);
    const bv = meldSortValue(b);
    if(av !== bv) return av - bv;
    return (a.black === b.black) ? 0 : a.black ? 1 : -1;
  });
}

function activeRulesName(){
  return isKentucky() ? 'Kentucky Rules' : 'Standard Rules';
}
function pileJourneyHtml(p, owner='player'){
  const handDone = p.inFoot || p.hand.length===0;
  const handCount = p.hand.length;
  const footCount = p.foot.length;
  return `
    <span class="journey-step ${handDone?'complete':'active'}">
      <span class="journey-icon">🂠</span>
      <b>HAND</b>
      <small>${handDone?'✓':handCount}</small>
    </span>
    <span class="journey-arrow">→</span>
    <span class="journey-step ${p.inFoot?'active':'waiting'}">
      <span class="journey-icon">🂠</span>
      <b>FOOT</b>
      <small>${p.floating?'FLOAT':footCount}</small>
    </span>`;
}
function updateOpeningProgress(){
  const box = $('openingProgress');
  if(!box || !state.teams.length) return;
  const team = state.teams[0];
  if(team.opened){
    box.innerHTML = '<b>Opening Meld:</b> Complete ✓';
    box.classList.add('complete');
    return;
  }
  box.classList.remove('complete');
  const selected = selectedCards().reduce((sum,c)=>sum+points(c),0);
  const need = openMinimums[state.handNo-1];
  const remaining = Math.max(0,need-selected);
  box.innerHTML = `<b>Opening Meld:</b> ${selected} / ${need}<small>${remaining} point${remaining===1?'':'s'} remaining</small>`;
}
function showActiveRules(){
  sound('click');
  const items = isKentucky()
    ? `
      <li>13 cards in the Hand and 13 in the Foot.</li>
      <li>Draw 2, or take the top discard when it can be played immediately; you may take the top card only or the top + next 7.</li>
      <li>A red or black 3 freezes the discard pile.</li>
      <li>You may not discard a card that can legally be played.</li>
      <li>Seven cards complete a book; one clean and one dirty book are required.</li>
      <li>Dirty books may never contain more wild cards than natural cards.</li>
      <li>To finish, discard your final non-playable Foot card. If you play everything and cannot discard, you are floating.</li>`
    : `
      <li>Draw two cards, or legally take up to seven from the discard pile.</li>
      <li>Seven cards complete a book.</li>
      <li>One clean and one dirty book are required to go out.</li>
      <li>${state.allowBookAdds?'Cards may':'Cards may not'} be added to completed books.</li>
      <li>${state.confirmGoOut?'Confirmation is required':'No confirmation is required'} before going out.</li>`;

  showModal(`
    <section class="rules-panel compact-rules">
      <div class="rules-hero">
        <div class="rules-hero-icon">🃏</div>
        <div><h2>${activeRulesName()}</h2><p>The active rules are locked for this game.</p></div>
      </div>
      <article class="rule-card full"><ul>${items}</ul></article>
      ${isKentucky()?'<p class="rules-adaptation"><b>Single-player adaptation:</b> the app uses two decks (one per player), omits the physical-dealing bonus, and does not require partner permission before going out.</p>':''}
    </section>
  `);
}

function renderMeld(m, i, teamIndex){
  const cleanWord = isKentucky() ? 'CLEAN' : 'RED';
  const dirtyWord = isKentucky() ? 'DIRTY' : 'BLACK';
  const tag = m.booked ? (m.black?`${dirtyWord} BOOK`:`${cleanWord} BOOK`) : (m.black?`${dirtyWord} SET`:`${cleanWord} SET`);
  const cls = m.booked ? (m.black?'black-book':'red-book') : (m.black?'dirty':'');
  const suit = m.black ? '♣' : '♥';
  const selectable = teamIndex===0 && state.current===0 && state.phase==='play';
  return `<button class="meld ${cls}${selectable?' selectable':''}" data-meld="${i}"><div>${m.rank}</div><div class="m-suit">${suit}</div><div class="m-count">${m.cards.length}</div><div class="m-tag">${tag}</div></button>`;
}

function updateHumanStatsDisplay(){
  const p = state.players[0];
  const handMode = $('handMode');
  const cardsLeft = $('cardsLeft');
  if(handMode && p){
    handMode.textContent = `${p.inFoot ? 'Foot' : 'Hand'} · ${liveCards(p).length} cards · ${playerMeldCount(0)} melds`;
  }
  if(cardsLeft) cardsLeft.textContent = '';
}

function ensureLearningCoach(){
  if($('learningCoach')) return;
  const turnBox = document.querySelector('.turn-box');
  if(!turnBox) return;
  const box = document.createElement('p');
  box.id = 'learningCoach';
  box.className = 'turn-hint hidden';
  box.setAttribute('aria-live','polite');
  turnBox.appendChild(box);
}


function render(){
  state.teams.forEach(sortTeamMelds);
  ensureLearningCoach();
  setTimeout(updateHumanStatsDisplay,0);
  $('roundBadge').textContent = `Hand ${state.handNo} · Meld ${openMinimums[state.handNo-1]}`;
  $('scoreBadges').innerHTML = state.teams.map((t,i)=>`<span class="score-chip ${teamOf(state.current)===i?'active':''}">${t.name}: ${t.score}</span>`).join('');
  syncHeaderScores();
  $('opponentStrip').innerHTML = state.players.slice(1).map((p,offset)=>{
    const idx=offset+1;
    return `<div class="mini-player ${idx===state.current?'active':''}">
      <strong>${p.name}</strong>
      <div class="opponent-journey">${pileJourneyHtml(p,'ai')}</div>
      <span class="meld-count">${playerMeldCount(idx)} meld${playerMeldCount(idx)===1?'':'s'}</span>
    </div>`;
  }).join('');
  $('team0Melds').innerHTML = state.teams[0].melds.map((m,i)=>renderMeld(m,i,0)).join('') || '<p class="muted">No melds yet.</p>';
  $('team1Melds').innerHTML = state.teams[1].melds.map((m,i)=>renderMeld(m,i,1)).join('') || '<p class="muted">No melds yet.</p>';
  const p=state.players[0];
  $('handMode').textContent = state.players[0].inFoot ? 'Foot' : 'Hand';
  $('playerJourney').innerHTML = pileJourneyHtml(p,'player');
  $('cardsLeft').textContent = `${playerMeldCount(0)} meld${playerMeldCount(0)===1?'':'s'}`;
  $('humanCards').innerHTML = liveCards(p).map(c=>cardHtml(c,state.selected.has(c.id))).join('');
  $('stockCount').textContent=state.stock.length;
  const top=topDiscard(); $('discardPileBtn').innerHTML = top ? `<div class="card ${colorClass(top)}"><span>${top.rank}</span><span class="suit">${top.suit}</span><span class="bottom">${top.rank}</span></div><small>${state.discard.length}</small>` : '';
  const takeText = isKentucky() ? 'Take Pile' : 'Take 7';
  if($('takeActionBtn')) $('takeActionBtn').textContent=takeText;
  if($('takePileLabel')) $('takePileLabel').textContent=takeText;
  $('turnName').textContent = state.handEnded ? 'Hand Complete' : state.current===0 ? 'Your Turn' : `${currentPlayer().name}'s Turn`;
  $('rulesIndicator').textContent = activeRulesName();
  updateOpeningProgress();
  bindClicks(); updateActions();
}
function updateActions(){
  const humanTurn=state.current===0 && !state.handEnded;
  const drawing=humanTurn && state.phase==='draw';
  const playing=humanTurn && state.phase==='play';
  const takeCheck = humanTurn ? canTakePile(0) : {ok:false,reason:'Wait for your turn.'};
  const pickupPending = isKentucky() && state.pickupObligation?.playerIndex===0;

  $('drawBtn').disabled=!drawing;
  $('discardPileBtn').disabled=!(drawing && takeCheck.ok);
  $('drawActionBtn').disabled=!drawing;
  $('takeActionBtn').disabled=!(drawing && takeCheck.ok);
  $('takeActionBtn').title = takeCheck.ok
    ? (isKentucky() ? 'Take the playable top discard, with an option to take the next 7 too' : 'Take up to 7 cards from the discard pile')
    : takeCheck.reason;

  $('setBtn').disabled=!playing;
  $('addBtn').disabled=!playing;
  $('discardBtn').disabled=!playing || pickupPending;

  if(isKentucky()){
    $('goOutBtn').classList.add('hidden');
    $('goOutBtn').disabled=true;
  }else{
    $('goOutBtn').classList.remove('hidden');
    $('goOutBtn').disabled=!(playing && canGoOut(0).ok);
  }

  $('sortBtn').disabled=!humanTurn;
  $('clearBtn').disabled=!playing;

  const hand = $('humanCards');
  if(hand) hand.classList.toggle('selection-locked', !playing);
}

function bindClicks(){
  document.querySelectorAll('[data-card]').forEach(btn=>{
    btn.disabled = !(state.current===0 && state.phase==='play' && !state.handEnded);
    btn.onclick=()=>{
      if(state.current!==0 || state.phase!=='play' || state.handEnded){
        message('Draw 2 or Take 7 before selecting cards.');
        return;
      }
      const id=btn.dataset.card;
      state.selected.has(id)?state.selected.delete(id):state.selected.add(id);
      render();
    };
  });
  document.querySelectorAll('[data-meld]').forEach(btn=>btn.onclick=()=>{
    if(state.phase!=='play'){ message('Draw 2 or Take 7 first.'); return; }
    state.selectedMeld=Number(btn.dataset.meld);
    message('Meld selected. Choose cards, then press Add.');
    render();
  });
}

function sortHuman(){ sortCards(liveCards(state.players[0])); render(); }
function clearSelection(){ state.selected.clear(); state.selectedMeld=null; render(); }
function showModal(html){
  const modal = $('modal');
  const body = $('modalBody');
  if(!modal || !body) return;
  body.innerHTML = html;
  try{
    if(modal.open) modal.close();
    modal.showModal();
  }catch(e){
    modal.setAttribute('open','');
  }
}


function gameInProgress(){
  return state.view === 'game' && state.players.length > 0 && !state.gameEnded;
}
function returnHomeWithWarning(event){
  if(event) event.preventDefault();

  if(!gameInProgress()){
    show('home');
    return;
  }

  showModal(`
    <section class="winner-card safe-home-card">
      <div class="winner-badge">⚠️</div>
      <h2>Return to Home Screen?</h2>
      <p>Any progress in the current game will be lost.</p>
      <div class="modal-actions">
        <button id="cancelHomeReturn" type="button">Cancel</button>
        <button id="confirmHomeReturn" class="danger" type="button">Return Home</button>
      </div>
    </section>
  `);

  setTimeout(()=>{
    const cancel = $('cancelHomeReturn');
    const confirm = $('confirmHomeReturn');
    if(cancel) cancel.onclick = () => $('modal')?.close();
    if(confirm) confirm.onclick = () => {
      $('modal')?.close();
      state.players = [];
      state.teams = [];
      state.selected.clear();
      state.selectedMeld = null;
      state.gameEnded = true;
      state.handEnded = true;
      if(typeof closeMenu === 'function') closeMenu();
      show('home');
    };
  },0);
}

function toggleFullscreen(){
  sound('click');
  try{
    const root = document.documentElement;
    if(!document.fullscreenElement){
      root.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }catch(e){}
}
function syncFullscreenButton(){
  const btn = $('fullscreenBtn');
  if(btn) btn.textContent = document.fullscreenElement ? '↙' : '⛶';
}
function syncHeaderScores(){
  // Score pills now live directly in the integrated header.
}
function showRules(){
  sound('click');

  if(isKentucky()){
    showModal(`
      <section class="rules-panel">
        <div class="rules-hero">
          <div class="rules-hero-icon">📘</div>
          <div>
            <h2>Kentucky Rules</h2>
            <p>This digital ruleset is adapted from the supplied four-player Kentucky Hand & Foot rule sheet for one player versus the AI.</p>
          </div>
        </div>
        <div class="rules-grid">
          <article class="rule-card full">
            <h3>1. Hand, Foot & Decks</h3>
            <p>You and the AI each receive <b>13 cards in the Hand</b> and <b>13 cards in the Foot</b>. The single-player version uses <b>two decks</b>—one deck per player, including Jokers.</p>
          </article>
          <article class="rule-card">
            <h3>2. Start a Turn</h3>
            <ul>
              <li>Draw <b>2 cards</b> from the stock, or legally take from the discard pile.</li>
              <li>A red or black <b>3 freezes the discard pile</b>.</li>
              <li>The top pickup card must be playable immediately.</li>
            </ul>
          </article>
          <article class="rule-card">
            <h3>3. Picking Up</h3>
            <ul>
              <li>Use a natural pair matching the top discard, or one matching natural + one wild.</li>
              <li>You may also play the top card directly on an existing meld/book.</li>
              <li>After qualifying, choose the <b>top card only</b> or the <b>top + next 7</b> (up to 8 cards total).</li>
            </ul>
          </article>
          <article class="rule-card">
            <h3>4. Opening Meld</h3>
            <p>Use at least three of a kind, or two matching natural cards plus a wild. Multiple legal sets may combine to reach the opening requirement.</p>
            <table class="opening-table">
              <tr><th>Hand</th><th>Needed</th></tr>
              <tr><td>1</td><td>50</td></tr><tr><td>2</td><td>90</td></tr>
              <tr><td>3</td><td>120</td></tr><tr><td>4</td><td>150</td></tr>
            </table>
          </article>
          <article class="rule-card">
            <h3>5. Books</h3>
            <ul>
              <li>Seven cards complete a book.</li>
              <li><b>Clean book:</b> no wild cards.</li>
              <li><b>Dirty book:</b> natural + wild cards, with wilds never exceeding naturals.</li>
              <li>You need at least <b>one clean and one dirty book</b> to finish.</li>
              <li>Cards may be added to completed books.</li>
            </ul>
          </article>
          <article class="rule-card">
            <h3>6. Discarding & Floating</h3>
            <ul>
              <li>You may not discard a card that can legally be played.</li>
              <li>To finish, you must discard your final non-playable Foot card.</li>
              <li>If you play all Foot cards and have nothing legal to discard, you are <b>floating</b> and keep drawing 2 on later turns until you can discard.</li>
            </ul>
          </article>
          <article class="rule-card">
            <h3>7. Card Values</h3>
            <ul>
              <li>4–9: 5 points</li><li>10–King: 10 points</li>
              <li>Aces and 2s: 20 points</li><li>Jokers: 50 points</li>
              <li>Black 3 left over: −5</li><li>Red 3 left over: −500</li>
            </ul>
          </article>
          <article class="rule-card">
            <h3>8. Hand Scoring</h3>
            <ul>
              <li>Clean book: <b>500</b></li><li>Dirty book: <b>300</b></li>
              <li>Going out: <b>500</b></li>
              <li>Completed books are scored by their book value rather than also counting every card inside them.</li>
              <li>Cards left in Hand/Foot count against the player.</li>
            </ul>
          </article>
          <article class="rule-card full">
            <h3>Single-Player Adaptation</h3>
            <p>The paper rules describe four players in two teams. Against the AI, partner permission is omitted. The physical bonus for estimating and dealing exactly 52 cards is also omitted because the computer deals automatically.</p>
          </article>
        </div>
      </section>
    `);
    return;
  }

  showModal(`
    <section class="rules-panel">
      <div class="rules-hero">
        <div class="rules-hero-icon">📘</div>
        <div>
          <h2>Standard Rules</h2>
          <p>The familiar Hand Over Foot rules used by the app.</p>
        </div>
      </div>
      <div class="rules-grid">
        <article class="rule-card full">
          <h3>1. The Basic Idea</h3>
          <p>You start with cards in your <b>Hand</b> and a second pile called your <b>Foot</b>. Match cards into sets, complete books, and empty both piles.</p>
        </article>
        <article class="rule-card">
          <h3>2. Start Each Turn</h3>
          <ul><li>Choose <b>Draw 2</b>.</li><li>Or choose <b>Take 7</b> when the discard pile is legal.</li></ul>
        </article>
        <article class="rule-card">
          <h3>3. Make Sets</h3>
          <ul><li>Sets need at least three matching cards.</li><li>2s and Jokers are wild.</li><li>3s cannot be melded.</li></ul>
        </article>
        <article class="rule-card">
          <h3>4. Opening</h3>
          <table class="opening-table">
            <tr><th>Hand</th><th>Needed</th></tr><tr><td>1</td><td>50</td></tr>
            <tr><td>2</td><td>90</td></tr><tr><td>3</td><td>120</td></tr><tr><td>4</td><td>150</td></tr>
          </table>
        </article>
        <article class="rule-card">
          <h3>5. Books</h3>
          <ul><li>Seven cards complete a book.</li><li>A clean/red book has no wilds.</li><li>A dirty/black book contains wild cards.</li></ul>
        </article>
        <article class="rule-card">
          <h3>6. Winning</h3>
          <p>Empty your Hand, play your Foot, meet the book requirement, and go out. Highest total after four hands wins.</p>
        </article>
      </div>
    </section>
  `);
}

function showSettings(){
  sound('click');
  showModal(`
    <section class="settings-grid">
      <div class="rules-hero">
        <div class="rules-hero-icon">⚙️</div>
        <div>
          <h2>Settings</h2>
          <p>Adjust sound and display preferences.</p>
        </div>
      </div>

      <article class="setting-card">
        <h3>🔊 Audio</h3>
        <label class="toggle-pill">
          <input type="checkbox" id="audioToggle" ${state.audioOn ? 'checked' : ''}>
          Sound effects
        </label>
        <div class="audio-row">
          <span>Volume</span>
          <input type="range" id="audioVolume" min="0" max="1" step="0.05" value="${state.audioVolume ?? .55}">
        </div>
      </article>

      <article class="setting-card">
        <h3>💡 Learning Tips</h3>
        <label class="toggle-pill">
          <input type="checkbox" id="learningToggle" ${state.learningMode ? 'checked' : ''}>
          Show coaching prompts in the Your Turn panel
        </label>
        <p>Off by default. Turn this on when someone is learning the flow of the game.</p>
      </article>
    </section>
  `);

  setTimeout(()=>{
    const t = $('audioToggle');
    const v = $('audioVolume');
    const learning = $('learningToggle');
    if(t) t.onchange = () => { setAudio(t.checked); sound('click'); };
    if(v) v.oninput = () => setVolume(v.value);
    if(learning) learning.onchange = () => { state.learningMode = learning.checked; updateLearningCoach(); sound('click'); };
  },0);
}

function showAboutDeveloper(){
  sound('click');
  showModal(`
    <section class="rules-panel about-developer-panel">
      <div class="rules-hero about-hero">
        <img class="developer-avatar" src="assets/developer.png?v=3.6.7" alt="David Fliesen illustration">
        <div>
          <h2>About Developer</h2>
          <p><b>David Fliesen</b></p>
          <p>Veteran multimedia creator, AI developer, animator, and builder of browser-based creative tools.</p>
        </div>
      </div>
      <article class="rule-card full">
        <h3>Links</h3>
        <p><a href="https://github.com/DavidFliesen" target="_blank" rel="noopener">GitHub Profile</a></p>
        <p><a href="https://www.linkedin.com/in/fliesen" target="_blank" rel="noopener">LinkedIn</a></p>
        <p><a href="https://davidfliesen.github.io/" target="_blank" rel="noopener">Portfolio</a></p>
      </article>
    </section>
  `);
}
function showScores(){
  openModal(`<h2>Scores</h2><p><b>${state.teams[0]?.name || 'Your Team'}:</b> ${state.teams[0]?.score || 0}</p><p><b>${state.teams[1]?.name || 'Opponents'}:</b> ${state.teams[1]?.score || 0}</p><p>Scores appear after each completed hand.</p>`);
}
function showFinalScores(){ const t0=state.teams[0], t1=state.teams[1]; openModal(`<h2>Game Complete</h2><p><b>${t0.name}:</b> ${t0.score}</p><p><b>${t1.name}:</b> ${t1.score}</p><h3>${t0.score>=t1.score?'Your team wins!':'Opponents win.'}</h3>`); }
function openModal(html){ $('modalBody').innerHTML=html; $('modal').showModal(); }

function selectedRanksSummary(){
  const counts = {};
  selectedCards().forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
  return Object.entries(counts).map(([r,n]) => `${n} ${rankLabel(r)}`).join(', ');
}
function showHelp(){
  sound('click');
  const phaseText = state.phase === 'draw'
    ? 'Start by drawing 2 cards, or take the discard pile if the game allows it.'
    : 'Now you can make sets, add to existing melds, discard, or sort your hand.';

  showModal(`
    <section class="rules-panel">
      <div class="rules-hero">
        <div class="rules-hero-icon">💡</div>
        <div>
          <h2>Help & Strategy</h2>
          <p>${phaseText}</p>
        </div>
      </div>
      <div class="rules-grid">
        <article class="rule-card">
          <h3>What should I do now?</h3>
          <p>${currentHelpText()}</p>
        </article>
        <article class="rule-card">
          <h3>Strategy tip</h3>
          <p>${strategyTip()}</p>
        </article>
        <article class="rule-card full">
          <h3>Learning Tips</h3>
          <p>Turn on Learning Tips in Settings to show small prompts in the Your Turn panel that point to the next part of the turn.</p>
        </article>
      </div>
    </section>
  `);
}
function currentHelpText(){
  if(state.current !== 0) return 'Wait for the AI opponent to finish thinking and playing.';
  if(state.phase === 'draw'){
    const chk = canTakePile(0);
    if(chk.ok) return isKentucky() ? 'You may Draw 2 or take the discard pile because its top card can be played immediately.' : 'You may draw 2 cards, or take the discard pile if those cards help your next set.';
    return `${isKentucky()?'Take Pile':'Take 7'} is not available right now, so draw 2 cards from the stock pile. ${chk.reason}`;
  }
  const chosen = selectedCards();
  if(chosen.length){
    return `You selected ${selectedRanksSummary()}. Try Set to make a new set, Add to place cards on an existing set, or Discard one card to end your turn.`;
  }
  return 'Select cards in your hand. Use Set for a new group, Add for an existing group, or Discard one card to end your turn.';
}
function strategyTip(){
  const cards = liveCards(state.players[0]);
  const counts = {};
  cards.forEach(c => { if(!isWild(c)) counts[c.rank] = (counts[c.rank] || 0) + 1; });
  const triples = Object.entries(counts).filter(([r,n]) => n >= 3 && meldRanks.includes(r)).map(([r])=>rankLabel(r));
  if(triples.length) return `You have enough natural cards to consider a set of ${triples[0]}. You usually cannot start a second set of the same rank later, so think before playing it.`;
  if(cards.some(isThree)) return '3s cannot be melded and can hurt your score if left in your hand or foot, so they are often good discard choices.';
  if(cards.some(isWild)) return 'Wild cards are powerful. Save them to complete sets, but remember you usually need enough natural cards first.';
  return 'Keeping three matching cards can be useful, but playing them may help you open the required meld sooner.';
}
function learningTipText(){
  if(!state.learningMode || state.view !== 'game' || state.handEnded) return '';
  if(state.current !== 0) return 'AI opponent is thinking. Watch which melds it builds.';
  if(state.phase === 'draw') return `Choose Draw 2 or ${isKentucky()?'Take Pile':'Take 7'} below. Your cards unlock after you draw.`;
  if(state.selected.size) return 'Use Set, Add, or Discard based on the selected cards.';
  return state.requireBooks ? 'Select cards to play. You need one clean and one dirty book before going out.' : 'Select cards in your hand, then choose Set, Add, or Discard.';
}

function updateLearningCoach(){
  const coach = $('learningCoach');
  if(!coach) return;
  const tip = learningTipText();
  coach.innerHTML = tip ? `<b>💡 Hint:</b> ${tip}` : '';
  coach.classList.toggle('hidden', !tip);
}


function hint(){
  if(state.current!==0){ message('Wait for the AI opponent to finish.'); return; }
  if(state.phase==='draw'){
    const chk=canTakePile(0);
    message(chk.ok ? 'You can draw 2, or take the discard pile if it helps your sets.' : 'Draw 2 is the best move right now. ' + chk.reason);
    return;
  }
  const chosen = selectedCards();
  if(chosen.length){
    message(currentHelpText());
    return;
  }
  message(strategyTip());
}


let audioCtx = null;
function ensureAudio(){
  if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(audioCtx.state === 'suspended') audioCtx.resume();
}
function tone(freq=440, duration=.08, type='sine', gain=.08){
  if(!state.audioOn) return;
  try{
    ensureAudio();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const vol = Math.max(0, Math.min(1, state.audioVolume ?? .55));
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(gain * vol, audioCtx.currentTime + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(g).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration + .02);
  }catch(e){}
}

function sound(name){
  if(!state.audioOn) return;
  try{
    ensureAudio();
    const now = audioCtx.currentTime;
    const vol = Math.max(0, Math.min(1, state.audioVolume ?? .55));

    const play = (freq, dur, type='triangle', gain=.055, delay=0) => {
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.exponentialRampToValueAtTime(gain * vol, now + delay + .015);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + dur + .03);
    };

    if(name === 'click'){
      play(700,.025,'sine',.018);
    }

    if(name === 'draw'){
      play(180,.05,'triangle',.025);
      play(240,.045,'triangle',.02,.045);
    }

    if(name === 'meld'){
      play(392,.08,'sine',.025);
      play(523,.11,'sine',.03,.07);
      play(659,.13,'sine',.03,.14);
    }

    if(name === 'discard'){
      play(160,.045,'triangle',.022);
    }

    if(name === 'error'){
      play(140,.08,'sawtooth',.018);
    }

    if(name === 'win'){
      play(392,.12,'sine',.03);
      play(523,.16,'sine',.035,.12);
      play(659,.22,'sine',.04,.26);
      play(784,.28,'sine',.045,.46);
    }
  }catch(e){}
}

function setAudio(on){
  state.audioOn = !!on;
  try{ localStorage.setItem('hofAudioOn', state.audioOn ? '1':'0'); }catch(e){}
}
function cardMoveSound(count=1){
  if(!state.audioOn) return;
  const n = Math.min(6, Math.max(1, count || 1));
  for(let i=0;i<n;i++){
    setTimeout(()=>sound('move'), i*55);
  }
}
function setVolume(v){
  state.audioVolume = Math.max(0, Math.min(1, Number(v)));
  try{ localStorage.setItem('hofAudioVolume', String(state.audioVolume)); }catch(e){}
}
function loadAudioPrefs(){
  try{
    const on = localStorage.getItem('hofAudioOn');
    const vol = localStorage.getItem('hofAudioVolume');
    if(on !== null) state.audioOn = on === '1';
    if(vol !== null && !Number.isNaN(Number(vol))) state.audioVolume = Number(vol);
  }catch(e){}
}

function applyZoom(){
  const clamped = Math.max(.7, Math.min(1.45, state.zoom || 1));
  state.zoom = clamped;
  document.documentElement.style.setProperty('--zoom', clamped.toFixed(2));
  const zl = $('zoomLevel');
  if(zl) zl.textContent = Math.round(clamped*100) + '%';
}
function zoomBy(delta){
  state.zoom = Math.max(.7, Math.min(1.45, (state.zoom || 1) + delta));
  applyZoom();
}


let menuCloseTimer = null;
function closeMenu(){
  const panel = $('menuPanel');
  if(panel) panel.classList.add('hidden');
  if(menuCloseTimer){
    clearTimeout(menuCloseTimer);
    menuCloseTimer = null;
  }
}
function armMenuAutoClose(){
  if(menuCloseTimer) clearTimeout(menuCloseTimer);
  menuCloseTimer = setTimeout(closeMenu, 10000);
}
function toggleMenu(){
  const panel = $('menuPanel');
  if(!panel) return;
  sound('click');
  panel.classList.toggle('hidden');
  if(!panel.classList.contains('hidden')) armMenuAutoClose();
}

function syncGameStyleSetup(){
  const selected = document.querySelector('input[name="gameStyle"]:checked')?.value || 'standard';
  const kentucky = selected === 'kentucky';
  const add = $('allowBookAdds');
  const confirm = $('confirmGoOut');
  const addRow = $('allowBookAddsRow');
  const confirmRow = $('confirmGoOutRow');

  if(kentucky){
    if(add){ add.checked=true; add.disabled=true; }
    if(confirm){ confirm.checked=false; confirm.disabled=true; }
    addRow?.classList.add('fixed-option');
    confirmRow?.classList.add('fixed-option');
    if(addRow) addRow.title='Kentucky Rules always allow adding cards to completed books.';
    if(confirmRow) confirmRow.title='Kentucky single-player mode ends through the required final discard.';
  }else{
    if(add) add.disabled=false;
    if(confirm){ confirm.disabled=false; if(!confirm.checked) confirm.checked=true; }
    addRow?.classList.remove('fixed-option');
    confirmRow?.classList.remove('fixed-option');
    if(addRow) addRow.title='';
    if(confirmRow) confirmRow.title='';
  }
}

function init(){
  loadAudioPrefs();

  const playAiBtn = $('playAiBtn');
    const playBtn = $('playBtn');
  const settingsBtn = $('settingsBtn');
  const rulesBtn = $('rulesBtn');
  const scoresBtn = $('scoresBtn');
  const menuToggle = $('menuToggle');
  const menuPanel = $('menuPanel');
  const menuPlayAi = $('menuPlayAi');
  const menuRules = $('menuRules');
  const menuScores = $('menuScores');
  const menuSettings = $('menuSettings');
  const menuAbout = $('menuAbout');
  const fullscreenBtn = $('fullscreenBtn');
  const homeWordmark = $('homeWordmark');
  const dealBtn = $('dealBtn');
  const rulesIndicator = $('rulesIndicator');
  const drawActionBtn = $('drawActionBtn');
  const takeActionBtn = $('takeActionBtn');
  
  if(playAiBtn) playAiBtn.onclick = () => { sound('click'); startSetup('ai'); };
  if(playBtn) playBtn.onclick = () => { sound('click'); startSetup('ai'); };
  if(settingsBtn) settingsBtn.onclick = showSettings;
  if(rulesBtn) rulesBtn.onclick = showRules;
  if(scoresBtn) scoresBtn.onclick = showScores;
  if(menuToggle) menuToggle.onclick = toggleMenu;
  if(menuPanel){
    menuPanel.addEventListener('pointerdown', armMenuAutoClose);
    menuPanel.addEventListener('keydown', armMenuAutoClose);
  }
  if(menuRules) menuRules.onclick = () => { closeMenu(); showRules(); };
  if(menuScores) menuScores.onclick = () => { closeMenu(); showScores(); };
  if(menuSettings) menuSettings.onclick = () => { closeMenu(); showSettings(); };
  if(menuAbout) menuAbout.onclick = () => { closeMenu(); showAboutDeveloper(); };
  if(fullscreenBtn) fullscreenBtn.onclick = toggleFullscreen;
  if(rulesIndicator) rulesIndicator.onclick = showActiveRules;
  if(homeWordmark) homeWordmark.onclick = returnHomeWithWarning;
  if(dealBtn) dealBtn.onclick = startGame;

  document.querySelectorAll('[data-nav="home"]').forEach(b=>b.onclick=returnHomeWithWarning);
  document.querySelectorAll('input[name="ai"]').forEach(i=>i.onchange=()=>document.querySelectorAll('.choice').forEach(l=>l.classList.toggle('checked', l.querySelector('input').checked)));
  document.querySelectorAll('input[name="gameStyle"]').forEach(i=>i.onchange=()=>{
    document.querySelectorAll('.style-choice').forEach(l=>l.classList.toggle('checked', !!l.querySelector('input')?.checked));
    syncGameStyleSetup();
  });
  syncGameStyleSetup();

  if($('drawBtn')) $('drawBtn').onclick=drawTwo;
  if(drawActionBtn) drawActionBtn.onclick=drawTwo;
  if(takeActionBtn) takeActionBtn.onclick=takePile;
  if($('discardPileBtn')) $('discardPileBtn').onclick=takePile;
  if($('setBtn')) $('setBtn').onclick=makeSet;
  if($('addBtn')) $('addBtn').onclick=addToMeld;
  if($('discardBtn')) $('discardBtn').onclick=discardSelected;
  if($('goOutBtn')) $('goOutBtn').onclick=goOutClick;
  if($('sortBtn')) $('sortBtn').onclick=sortHuman;
  if($('clearBtn')) $('clearBtn').onclick=clearSelection;
  if($('helpBtn')) $('helpBtn').onclick=showHelp;
  if($('nextHandBtn')) $('nextHandBtn').onclick=nextHand;
  if($('zoomOutBtn')) $('zoomOutBtn').onclick=()=>zoomBy(-.1);
  if($('zoomInBtn')) $('zoomInBtn').onclick=()=>zoomBy(.1);
  applyZoom();

  if($('closeModal')) $('closeModal').onclick=()=>$('modal').close();
  document.addEventListener('fullscreenchange', syncFullscreenButton);
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && $('modal')?.open) $('modal').close();
  });
}
document.addEventListener('DOMContentLoaded', init);
})();
