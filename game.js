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
  view:'home', difficulty:'club', askPartner:true, requireBooks:false,
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
function startSetup(){ show('setup'); }
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
function makeSet(){
  if(state.current!==0 || state.phase!=='play') return;
  const cards=selectedCards(); const team=currentTeam(); const v=validateSet(cards,team);
  if(!v.ok){ message(v.reason); return; }
  removeCards(currentPlayer(),cards);
  team.melds.push({ rank:v.rank, cards:[...cards], black:v.wilds>0, booked:false });
  team.opened=true; state.selected.clear(); checkFoot(currentPlayer()); render(); message(`Set made: ${v.rank}s for ${v.meldPoints} points.`); checkHumanEmpty();
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
function nextTurn(){
  state.phase='draw'; state.pileIntent=false; state.selected.clear(); state.selectedMeld=null;
  for(let i=1;i<=4;i++){ const n=(state.current+i)%4; if(!state.players[n].out){ state.current=n; break; } }
  render(); message(`${state.players[state.current].name}'s turn. Draw 2 or take the pile.`); maybeRobotTurn();
}
function finishHand(playerIndex){
  state.handEnded=true; state.teams[teamOf(playerIndex)].wentOut=true;
  scoreHand(); render();
  const winner = state.teams[0].handScore >= state.teams[1].handScore ? state.teams[0] : state.teams[1];
  message(`${state.players[playerIndex].name} went out. ${winner.name} won this hand.`);
  $('nextHandBtn').classList.toggle('hidden', state.handNo>=4);
  if(state.handNo>=4) showFinalScores();
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
function showRules(){
  openModal(`<h2>Hand Over Foot Rules</h2>
  <p>This version follows a familiar four-player partner Hand and Foot Canasta style: you and your robot partner play against two robot opponents over four hands.</p>
  <table><tr><th>Hand</th><th>Opening Meld</th></tr><tr><td>1</td><td>50</td></tr><tr><td>2</td><td>90</td></tr><tr><td>3</td><td>120</td></tr><tr><td>4</td><td>150</td></tr></table>
  <h3>Turn</h3><p>Draw 2 cards from stock or take the top 7 cards from the discard pile. To take the pile, you need two natural cards matching the top discard. You cannot take the pile if the top card is a 3 or wild card, or if your team already has that set/book.</p>
  <h3>Sets and Books</h3><p>Sets are 3 or more cards of the same rank from 4 through Ace. 2s and Jokers are wild. You cannot make a wild-only set and you cannot make sets of 3s. A 7-card clean set is a red book worth 500. A book containing wilds is a black book worth 300.</p>
  <h3>Foot and Going Out</h3><p>Each player gets 11 cards in hand and 11 in foot. Empty your hand to pick up your foot. Empty your foot to go out and end the hand.</p>
  <h3>Scoring</h3><p>4-7 are 5 points, 8-K are 10, A/2 are 20, Jokers are 50. Black 3s left in hand or foot are -300. Red 3s left in hand or foot are -500.</p>`);
}
function showSettings(){ show('setup'); }
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
function init(){
  $('playBtn').onclick=startSetup; $('rulesBtn').onclick=showRules; $('settingsBtn').onclick=showSettings; $('scoresBtn').onclick=showScores; $('dealBtn').onclick=startGame;
  document.querySelectorAll('[data-nav="home"]').forEach(b=>b.onclick=()=>show('home'));
  document.querySelectorAll('input[name="ai"]').forEach(i=>i.onchange=()=>document.querySelectorAll('.choice').forEach(l=>l.classList.toggle('checked', l.querySelector('input').checked)));
  $('drawBtn').onclick=drawTwo; $('discardPileBtn').onclick=takePile; $('setBtn').onclick=makeSet; $('addBtn').onclick=addToMeld; $('discardBtn').onclick=discardSelected; $('goOutBtn').onclick=goOutClick; $('sortBtn').onclick=sortHuman; $('clearBtn').onclick=clearSelection; $('nextHandBtn').onclick=nextHand; $('closeModal').onclick=()=>$('modal').close();
}
document.addEventListener('DOMContentLoaded', init);
})();
