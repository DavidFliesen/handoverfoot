(() => {
'use strict';
const $ = id => document.getElementById(id);
const suits = ['♠','♥','♦','♣'];
const redSuits = new Set(['♥','♦']);
const meldRanks = ['4','5','6','7','8','9','10','J','Q','K','A'];
const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JK'];
const openMinimums = [50,90,120,150];
const cardPoints = { '3':5, '4':5, '5':5, '6':5, '7':5, '8':10, '9':10, '10':10, 'J':10, 'Q':10, 'K':10, 'A':20, '2':20, 'JK':50 };
const bookBonus = { red:500, black:300 };
const penalty3 = { red:-500, black:-300 };
let UID=0;
const state = {
  view:'home', mode:'ai', zoom:1, audioOn:true, audioVolume:.35, difficulty:'club', askPartner:true, requireBooks:false,
  handNo:1, current:0, phase:'draw', selected:new Set(), selectedMeld:null,
  stock:[], discard:[], players:[], teams:[], gameEnded:false, handEnded:false, pileIntent:false
};
function id(){ return `c${++UID}`; }
function teamOf(i){ return i%2; }
function makePlayer(name, ai=true){ return { name, ai, hand:[], foot:[], inFoot:false, out:false }; }
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
function points(c){ return cardPoints[c.rank]||0; }
function colorClass(c){ return isWild(c)?'wild':isRed(c)?'red':'black'; }
function liveCards(p){ return p.inFoot ? p.foot : p.hand; }
function currentPlayer(){ return state.players[state.current]; }
function currentTeam(){ return state.teams[teamOf(state.current)]; }
function sortCards(cards){ cards.sort((a,b)=> rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank) || suits.indexOf(a.suit)-suits.indexOf(b.suit)); }
function show(view){ ['home','setup','game'].forEach(v=>$(v).classList.toggle('hidden', v!==view)); state.view=view; }
function message(txt){ $('message').textContent = txt; }
function selectedCards(){ const p=state.players[0]; return liveCards(p).filter(c=>state.selected.has(c.id)); }
function startSetup(mode='ai'){
  state.mode = mode;
  const title = $('setupTitle');
  const intro = $('setupIntro');
  const multi = $('multiplayerPanel');
  const invite = $('inviteLink');

  if(mode === 'pvp'){
    if(title) title.textContent = 'Player vs Player';
    if(intro) intro.textContent = 'Invite another player, or play a local two-player table on this device.';
    if(multi) multi.classList.remove('hidden');
    if(invite) invite.value = location.origin + location.pathname + '?mode=pvp';
  } else {
    if(title) title.textContent = 'Player vs AI';
    if(intro) intro.textContent = 'Choose a robot difficulty level, then deal the cards.';
    if(multi) multi.classList.add('hidden');
  }

  show('setup');
}
function startGame(){
  state.difficulty = document.querySelector('input[name="ai"]:checked')?.value || 'club';
  state.askPartner = $('askPartner').checked;
  state.requireBooks = $('requireBooks').checked;
  state.handNo=1; state.current=0; state.gameEnded=false;
  state.players = [makePlayer('You',false), makePlayer('Robot East'), makePlayer('Robot Partner'), makePlayer('Robot West')];
  state.teams = [makeTeam('Your Team'), makeTeam('Opponents')];
  dealHand(); show('game');
}
function dealHand(){
  UID=0; state.stock=makeDeck(5); state.discard=[]; state.selected.clear(); state.selectedMeld=null; state.phase='draw'; state.handEnded=false; state.pileIntent=false;
  state.teams.forEach(t=>{ t.melds=[]; t.opened=false; t.handScore=0; t.wentOut=false; });
  state.players.forEach(p=>{ p.hand=[]; p.foot=[]; p.inFoot=false; p.out=false; });
  for(let i=0;i<11;i++) state.players.forEach(p=>p.hand.push(state.stock.pop()));
  for(let i=0;i<11;i++) state.players.forEach(p=>p.foot.push(state.stock.pop()));
  state.players.forEach(p=>sortCards(p.hand));
  let up;
  do { up = state.stock.pop(); if(!up) break; } while(isWild(up));
  if(up) state.discard.push(up);
  state.current = (state.handNo-1) % 4;
  render(); message(`${state.players[state.current].name} starts Hand ${state.handNo}. Draw 2 or take the discard pile.`); maybeRobotTurn();
}
function drawTwo(){
  if(state.phase!=='draw' || state.current!==0) return;
  sound('draw');
  drawFor(currentPlayer(),2); state.phase='play'; state.pileIntent=false; render(); message('You drew 2. Make sets, add to books, then discard.');
}
function drawFor(p,n){ for(let i=0;i<n;i++){ if(!state.stock.length) recycleDiscard(); if(state.stock.length) liveCards(p).push(state.stock.pop()); } sortCards(liveCards(p)); }
function recycleDiscard(){ if(state.discard.length<=1) return; const top=state.discard.pop(); state.stock=shuffle(state.discard.splice(0)); state.discard=[top]; }
function topDiscard(){ return state.discard[state.discard.length-1]; }
function canTakePile(playerIndex){
  if(state.phase!=='draw') return {ok:false, reason:'You must draw or take the pile first.'};
  const top=topDiscard(); if(!top) return {ok:false, reason:'Discard pile is empty.'};
  if(isThree(top) || isWild(top)) return {ok:false, reason:'The pile is frozen because the top card is a 3 or wild card.'};
  const team=state.teams[teamOf(playerIndex)];
  if(team.melds.some(m=>m.rank===top.rank)) return {ok:false, reason:'Your team already has a set or book of that face.'};
  const cards=liveCards(state.players[playerIndex]);
  const matches=cards.filter(c=>c.rank===top.rank && !isWild(c));
  if(matches.length<2) return {ok:false, reason:'You need two natural cards matching the top discard.'};
  return {ok:true, matches};
}
function takePile(){
  if(state.current!==0) return;
  sound('draw');
  const chk=canTakePile(0); if(!chk.ok){ message(chk.reason); return; }
  const take = state.discard.splice(Math.max(0,state.discard.length-7));
  liveCards(currentPlayer()).push(...take); sortCards(liveCards(currentPlayer()));
  state.phase='play'; render(); message(`You took ${take.length} cards from the discard pile. Use the top card in a new set.`);
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
    if(team.melds.some(m=>m.rank===rank)) return {ok:false, reason:`Your team already has a set or book of ${rank}s.`};
    const naturals = naturalGroups.get(rank);
    let setWilds = [];
    const needed = Math.max(0, 3 - naturals.length);

    if(needed > 0){
      const maxWilds = naturals.length;
      if(needed > maxWilds) return {ok:false, reason:`${rank}s need more natural cards before wilds can be used.`};
      setWilds = remainingWilds.splice(0, needed);
      if(setWilds.length < needed) return {ok:false, reason:`${rank}s need at least 3 cards to make a set.`};
    }

    const setCards = [...naturals, ...setWilds];
    if(setCards.length < 3) return {ok:false, reason:`${rank}s need at least 3 cards to make a set.`};
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

  team.opened=true;
  state.selected.clear();
  checkFoot(currentPlayer());
  render();

  const label = v.sets.map(s => `${s.rank}s`).join(', ');
  sound('meld'); message(`Melded ${label} for ${v.meldPoints} points.`);
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
  if(!meld.black && addWild>0 && meld.booked) return {ok:false, reason:'A red book can only receive natural cards.'};
  if(!meld.booked && currentWild+addWild > currentNat+addNat) return {ok:false, reason:'Before booking, natural cards must be at least wild cards.'};
  return {ok:true};
}
function addToMeld(){
  if(state.current!==0 || state.phase!=='play') return;
  const team=currentTeam(); if(!team.opened){ message('Your team must open before adding cards.'); return; }
  const cards=selectedCards();
  let meld = state.selectedMeld!==null ? team.melds[state.selectedMeld] : null;
  if(!meld && cards.length){ const natural=cards.find(c=>!isWild(c)); if(natural) meld=team.melds.find(m=>m.rank===natural.rank); }
  if(!meld){ message('Tap one of your team melds, then press Add.'); return; }
  const v=canAddToMeld(cards,meld); if(!v.ok){ message(v.reason); return; }
  removeCards(currentPlayer(),cards); meld.cards.push(...cards); if(cards.some(isWild)) meld.black=true; if(meld.cards.length>=7) meld.booked=true;
  state.selected.clear(); state.selectedMeld=null; checkFoot(currentPlayer()); render(); message(`Added ${cards.length} card${cards.length===1?'':'s'} to ${meld.rank}s.`); checkHumanEmpty();
}
function discardSelected(){
  if(state.current!==0 || state.phase!=='play') return;
  sound('discard');
  const cards=selectedCards(); if(cards.length!==1){ message('Select exactly one card to discard.'); return; }
  const c=cards[0]; removeCards(currentPlayer(),[c]); state.discard.push(c); state.selected.clear(); state.selectedMeld=null;
  const p=currentPlayer();
  if(!p.inFoot && p.hand.length===0){ p.inFoot=true; message('You discarded your last hand card. Your foot starts next turn.'); }
  if(p.inFoot && p.foot.length===0){ finishHand(0); return; }
  nextTurn();
}
function checkFoot(p){ if(!p.inFoot && p.hand.length===0){ p.inFoot=true; message('You picked up your foot and may keep playing.'); } }
function checkHumanEmpty(){ const p=state.players[0]; if(p.inFoot && p.foot.length===0) finishHand(0); else render(); }
function canGoOut(playerIndex){
  const p=state.players[playerIndex], team=state.teams[teamOf(playerIndex)];
  if(!p.inFoot) return {ok:false, reason:'You must be in your foot before going out.'};
  if(liveCards(p).length>0) return {ok:false, reason:'Play or discard all foot cards to go out.'};
  if(state.requireBooks){
    const hasRed=team.melds.some(m=>m.booked && !m.black), hasBlack=team.melds.some(m=>m.booked && m.black);
    if(!hasRed || !hasBlack) return {ok:false, reason:'This table requires one red and one black book to go out.'};
  }
  return {ok:true};
}
function goOutClick(){
  const chk=canGoOut(0); if(!chk.ok){ message(chk.reason); return; }
  if(state.askPartner && !partnerApproves()){ message('Robot Partner says: wait if you can. Build one more book first.'); return; }
  finishHand(0);
}
function partnerApproves(){ const team=state.teams[0]; return team.melds.filter(m=>m.booked).length>=2 || liveCards(state.players[2]).length<8; }

function aiDelay(min=650,max=1500){
  return Math.floor(Math.random() * (max-min+1)) + min;
}

function nextTurn(){
  state.phase='draw'; state.pileIntent=false; state.selected.clear(); state.selectedMeld=null;
  for(let i=1;i<=4;i++){ const n=(state.current+i)%4; if(!state.players[n].out){ state.current=n; break; } }
  render(); message(`${state.players[state.current].name}'s turn. Draw 2 or take the pile.`); maybeRobotTurn();
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
    for(const m of t.melds){ score += m.cards.reduce((s,c)=>s+points(c),0); if(m.booked) score += m.black ? bookBonus.black : bookBonus.red; }
    state.players.forEach((p,pi)=>{ if(teamOf(pi)!==ti) return; for(const c of [...p.hand,...p.foot]) score += isThree(c) ? (isRed(c)?penalty3.red:penalty3.black) : -points(c); });
    if(t.wentOut) score += 100;
    t.handScore=score; t.score+=score;
  });
}
function nextHand(){ if(state.handNo>=4) return; state.handNo++; dealHand(); }
function robotTurn(){
  if(state.current===0 || state.handEnded) return;
  const idx=state.current, p=currentPlayer(), team=currentTeam();
  const take = robotShouldTake(idx);
  if(take){ const cards=state.discard.splice(Math.max(0,state.discard.length-7)); liveCards(p).push(...cards); }
  else drawFor(p,2);
  state.phase='play';
  robotPlay(idx);
  robotDiscard(idx);
}
function robotShouldTake(idx){
  const chk=canTakePile(idx); if(!chk.ok) return false;
  if(state.difficulty==='easy') return false;
  if(state.difficulty==='club') return Math.random()<.55;
  return true;
}
function robotPlay(idx){
  const p=state.players[idx], team=state.teams[teamOf(idx)];
  sortCards(liveCards(p));
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
        const use=add.slice(0, state.difficulty==='shark'?3:1);
        const v=canAddToMeld(use,m);
        if(v.ok){ removeCards(p,use); m.cards.push(...use); if(use.some(isWild)) m.black=true; if(m.cards.length>=7) m.booked=true; played=true; }
      }
    }
    const candidate=bestRobotSet(liveCards(p),team);
    if(candidate){
      const v=validateSet(candidate,team);
      if(v.ok){ removeCards(p,candidate); team.melds.push({rank:v.rank,cards:[...candidate],black:v.wilds>0,booked:candidate.length>=7}); team.opened=true; played=true; }
    }
    checkFoot(p); sortCards(liveCards(p));
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
function robotDiscard(idx){
  const p=state.players[idx], cards=liveCards(p); if(!cards.length){ finishHand(idx); return; }
  let choice = cards.find(isThree);
  if(!choice){
    const team=state.teams[teamOf(idx)], opp=state.teams[1-teamOf(idx)];
    const danger=new Set(opp.melds.map(m=>m.rank));
    choice=[...cards].reverse().find(c=>!isWild(c) && !danger.has(c.rank)) || cards.find(c=>!isWild(c)) || cards[0];
  }
  removeCards(p,[choice]); state.discard.push(choice);
  if(!p.inFoot && p.hand.length===0) p.inFoot=true;
  if(p.inFoot && p.foot.length===0){ finishHand(idx); return; }
  nextTurn();
}
function maybeRobotTurn(){ if(state.current!==0 && !state.handEnded) setTimeout(robotTurn, 550); }
function cardHtml(c, selected=false){
  if(!c) return `<div class="card back"></div>`;
  return `<button class="card ${colorClass(c)}${selected?' selected':''}" data-card="${c.id}" title="${c.rank}${c.suit}"><span>${c.rank}</span><span class="suit">${c.suit}</span><span class="bottom">${c.rank}</span></button>`;
}
function renderMeld(m, i, teamIndex){
  const tag = m.booked ? (m.black?'BLACK BOOK':'RED BOOK') : (m.black?'BLACK SET':'RED SET');
  const cls = m.booked ? (m.black?'black-book':'red-book') : (m.black?'dirty':'');
  const suit = m.black ? '♣' : '♥';
  const selectable = teamIndex===0 && state.current===0 && state.phase==='play';
  return `<button class="meld ${cls}${selectable?' selectable':''}" data-meld="${i}"><div>${m.rank}</div><div class="m-suit">${suit}</div><div class="m-count">${m.cards.length}</div><div class="m-tag">${tag}</div></button>`;
}
function render(){
  $('roundBadge').textContent = `Hand ${state.handNo} · Meld ${openMinimums[state.handNo-1]}`;
  $('scoreBadges').innerHTML = state.teams.map((t,i)=>`<span class="score-chip ${teamOf(state.current)===i?'active':''}">${t.name}: ${t.score}</span>`).join('');
  $('opponentStrip').innerHTML = state.players.slice(1).map((p,offset)=>{
    const idx=offset+1, count=liveCards(p).length;
    return `<div class="mini-player ${idx===state.current?'active':''}"><strong>${p.name}</strong><span>${p.inFoot?'Foot':'Hand'} · ${count}</span><div class="mini-card-stack">${Array.from({length:Math.min(6,count)},()=>'<i class="mini-card"></i>').join('')}</div></div>`;
  }).join('');
  $('team0Melds').innerHTML = state.teams[0].melds.map((m,i)=>renderMeld(m,i,0)).join('') || '<p class="muted">No melds yet.</p>';
  $('team1Melds').innerHTML = state.teams[1].melds.map((m,i)=>renderMeld(m,i,1)).join('') || '<p class="muted">No melds yet.</p>';
  const p=state.players[0]; $('handMode').textContent=p.inFoot?'Foot':'Hand'; $('cardsLeft').textContent=`${liveCards(p).length} cards · foot ${p.foot.length}`;
  $('humanCards').innerHTML = liveCards(p).map(c=>cardHtml(c,state.selected.has(c.id))).join('');
  $('stockCount').textContent=state.stock.length;
  const top=topDiscard(); $('discardPileBtn').innerHTML = top ? `<div class="card ${colorClass(top)}"><span>${top.rank}</span><span class="suit">${top.suit}</span><span class="bottom">${top.rank}</span></div><small>${state.discard.length}</small>` : '';
  $('turnName').textContent = state.handEnded ? 'Hand Complete' : state.current===0 ? 'Your Turn' : `${currentPlayer().name}'s Turn`;
  bindClicks(); updateActions();
}
function updateActions(){
  const humanTurn=state.current===0 && !state.handEnded;
  $('drawBtn').disabled=!(humanTurn && state.phase==='draw'); $('discardPileBtn').disabled=!(humanTurn && state.phase==='draw');
  $('setBtn').disabled=!(humanTurn && state.phase==='play'); $('addBtn').disabled=!(humanTurn && state.phase==='play'); $('discardBtn').disabled=!(humanTurn && state.phase==='play');
  $('goOutBtn').disabled=!(humanTurn && canGoOut(0).ok);
}
function bindClicks(){
  document.querySelectorAll('[data-card]').forEach(btn=>btn.onclick=()=>{ if(state.current!==0 || state.handEnded) return; const id=btn.dataset.card; state.selected.has(id)?state.selected.delete(id):state.selected.add(id); render(); });
  document.querySelectorAll('[data-meld]').forEach(btn=>btn.onclick=()=>{ state.selectedMeld=Number(btn.dataset.meld); message('Meld selected. Choose cards, then press Add.'); render(); });
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
function showRules(){
  sound('click');
  showModal(`
    <section class="rules-panel">
      <div class="rules-hero">
        <div class="rules-hero-icon">🃏</div>
        <div>
          <h2>Hand Over Foot Rules</h2>
          <p>Build team sets, complete red and black books, then empty your hand and foot before the other team.</p>
        </div>
      </div>

      <div class="rules-grid">
        <article class="rule-card">
          <h3>🎯 Opening Meld</h3>
          <table class="opening-table">
            <tr><th>Hand</th><th>Minimum</th></tr>
            <tr><td>1</td><td>50</td></tr>
            <tr><td>2</td><td>90</td></tr>
            <tr><td>3</td><td>120</td></tr>
            <tr><td>4</td><td>150</td></tr>
          </table>
        </article>

        <article class="rule-card">
          <h3>🔄 Your Turn</h3>
          <ul>
            <li>Draw 2 from the stock, or take up to 7 from discard.</li>
            <li>To take discard, you need 2 natural cards matching the top card.</li>
            <li>You cannot take a pile topped by a 3 or wild card.</li>
          </ul>
        </article>

        <article class="rule-card">
          <h3>📚 Sets & Books</h3>
          <ul>
            <li>Sets need 3+ cards of the same rank, 4 through Ace.</li>
            <li>2s and Jokers are wild.</li>
            <li>7 cards completes a book.</li>
            <li>Clean red books score 500. Black books score 300.</li>
          </ul>
        </article>

        <article class="rule-card">
          <h3>👣 Foot & Going Out</h3>
          <ul>
            <li>Each player gets 11 hand cards and 11 foot cards.</li>
            <li>Empty your hand to pick up your foot.</li>
            <li>Empty your foot to end the hand and score the round.</li>
          </ul>
        </article>

        <article class="rule-card full">
          <h3>💰 Scoring</h3>
          <p><b>4–7:</b> 5 points · <b>8–K:</b> 10 · <b>A/2:</b> 20 · <b>Jokers:</b> 50</p>
          <p><b>Penalty:</b> Black 3s left in hand/foot are −300. Red 3s are −500.</p>
        </article>
      </div>

      <div class="rules-tip"><b>Tip:</b> Your first meld can combine multiple legal sets. Four Kings plus four Aces can open a 90-point hand because the total counts together.</div>
    </section>
  `);
}
function showScores(){
  openModal(`<h2>Scores</h2><p><b>${state.teams[0]?.name || 'Your Team'}:</b> ${state.teams[0]?.score || 0}</p><p><b>${state.teams[1]?.name || 'Opponents'}:</b> ${state.teams[1]?.score || 0}</p><p>Scores appear after each completed hand.</p>`);
}
function showFinalScores(){ const t0=state.teams[0], t1=state.teams[1]; openModal(`<h2>Game Complete</h2><p><b>${t0.name}:</b> ${t0.score}</p><p><b>${t1.name}:</b> ${t1.score}</p><h3>${t0.score>=t1.score?'Your team wins!':'Opponents win.'}</h3>`); }
function openModal(html){ $('modalBody').innerHTML=html; $('modal').showModal(); }
function hint(){
  if(state.current!==0){ message('Wait for your turn.'); return; }
  if(state.phase==='draw'){ const chk=canTakePile(0); message(chk.ok ? 'You can take the discard pile if you want those cards.' : 'Best move: draw 2. ' + chk.reason); return; }
  const cards=liveCards(state.players[0]); const team=state.teams[0]; const candidate=bestRobotSet(cards,team); if(candidate){ message(`Hint: you can make a set with ${candidate.map(c=>c.rank+c.suit).join(', ')}.`); } else { message('Hint: add to existing melds if possible, then discard a 3 or a low card.'); }
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
    const vol = Math.max(0, Math.min(1, state.audioVolume ?? .35));
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
    const vol = Math.max(0, Math.min(1, state.audioVolume ?? .35));

    const play = (freq, dur, type='triangle', gain=.03, delay=0) => {
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

function init(){
  loadAudioPrefs();

  const playAiBtn = $('playAiBtn');
  const playHumanBtn = $('playHumanBtn');
  const playBtn = $('playBtn');
  const settingsBtn = $('settingsBtn');
  const rulesBtn = $('rulesBtn');
  const scoresBtn = $('scoresBtn');
  const dealBtn = $('dealBtn');
  const copyInviteBtn = $('copyInviteBtn');
  const inviteLink = $('inviteLink');

  if(playAiBtn) playAiBtn.onclick = () => { sound('click'); startSetup('ai'); };
  if(playHumanBtn) playHumanBtn.onclick = () => { sound('click'); startSetup('pvp'); };
  if(playBtn) playBtn.onclick = () => { sound('click'); startSetup('ai'); };
  if(settingsBtn) settingsBtn.onclick = showSettings;
  if(rulesBtn) rulesBtn.onclick = showRules;
  if(scoresBtn) scoresBtn.onclick = showScores;
  if(dealBtn) dealBtn.onclick = startGame;

  if(copyInviteBtn) copyInviteBtn.onclick = async () => {
    const link = inviteLink?.value || (location.origin + location.pathname + '?mode=pvp');
    try {
      await navigator.clipboard.writeText(link);
      copyInviteBtn.textContent = 'Copied!';
      setTimeout(() => copyInviteBtn.textContent = 'Copy Link', 1200);
    } catch {
      if(inviteLink){
        inviteLink.focus();
        inviteLink.select();
        document.execCommand('copy');
      }
    }
  };

  document.querySelectorAll('[data-nav="home"]').forEach(b=>b.onclick=()=>show('home'));
  document.querySelectorAll('input[name="ai"]').forEach(i=>i.onchange=()=>document.querySelectorAll('.choice').forEach(l=>l.classList.toggle('checked', l.querySelector('input').checked)));

  if($('drawBtn')) $('drawBtn').onclick=drawTwo;
  if($('discardPileBtn')) $('discardPileBtn').onclick=takePile;
  if($('setBtn')) $('setBtn').onclick=makeSet;
  if($('addBtn')) $('addBtn').onclick=addToMeld;
  if($('discardBtn')) $('discardBtn').onclick=discardSelected;
  if($('goOutBtn')) $('goOutBtn').onclick=goOutClick;
  if($('sortBtn')) $('sortBtn').onclick=sortHuman;
  if($('clearBtn')) $('clearBtn').onclick=clearSelection;
  if($('nextHandBtn')) $('nextHandBtn').onclick=nextHand;
  if($('zoomOutBtn')) $('zoomOutBtn').onclick=()=>zoomBy(-.1);
  if($('zoomInBtn')) $('zoomInBtn').onclick=()=>zoomBy(.1);
  applyZoom();

  if($('closeModal')) $('closeModal').onclick=()=>$('modal').close();
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && $('modal')?.open) $('modal').close();
  });
}
document.addEventListener('DOMContentLoaded', init);
})();
