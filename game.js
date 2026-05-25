(() => {
'use strict';

const $ = id => document.getElementById(id);
const suits = ['♠','♥','♦','♣'];
const redSuits = new Set(['♥','♦']);
const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const meldRanks = ['4','5','6','7','8','9','10','J','Q','K','A'];
const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JK'];
const openMinimums = [50,90,120,150];
const cardPoints = { '3':5, '4':5, '5':5, '6':5, '7':5, '8':5, '9':5, '10':10, 'J':10, 'Q':10, 'K':10, 'A':20, '2':20, 'JK':50 };
let UID = 0;
const state = {
  difficulty:'club',
  requireBooks:true,
  handNo:1,
  current:0,
  phase:'draw',
  selected:new Set(),
  selectedMeld:null,
  stock:[],
  discard:[],
  players:[],
  handEnded:false,
  gameOver:false,
  zoom:1,
  audioOn:true,
  audioVolume:.55
};

function id(){ return `c${++UID}`; }
function player(){ return state.players[0]; }
function ai(){ return state.players[1]; }
function currentPlayer(){ return state.players[state.current]; }
function liveCards(p){ return p.inFoot ? p.foot : p.hand; }
function makePlayer(name, isAI=false){ return {name, isAI, score:0, handScore:0, hand:[], foot:[], inFoot:false, melds:[], opened:false, wentOut:false}; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function makeDeck(decks=5){
  const cards=[];
  for(let d=0; d<decks; d++){
    for(const s of suits){ for(const r of ranks) cards.push({id:id(),rank:r,suit:s}); }
    cards.push({id:id(),rank:'JK',suit:'★'});
    cards.push({id:id(),rank:'JK',suit:'★'});
  }
  return shuffle(cards);
}
function isRed(c){ return c.rank!=='JK' && redSuits.has(c.suit); }
function isThree(c){ return c.rank==='3'; }
function isWild(c){ return c.rank==='2' || c.rank==='JK'; }
function points(c){ return cardPoints[c.rank] || 0; }
function sortCards(cards){ cards.sort((a,b)=>rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank)||suits.indexOf(a.suit)-suits.indexOf(b.suit)); }
function show(view){ ['home','setup','game'].forEach(v=>$(v).classList.toggle('hidden', v!==view)); }
function message(txt){ $('message').textContent=txt; }
function selectedCards(){ return liveCards(player()).filter(c=>state.selected.has(c.id)); }
function topDiscard(){ return state.discard[state.discard.length-1]; }
function openingMinimum(){ return openMinimums[state.handNo-1]; }

let audioCtx=null;
function ensureAudio(){ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }
function sound(name){
  if(!state.audioOn) return;
  try{
    ensureAudio();
    const now=audioCtx.currentTime;
    const vol=Math.max(0,Math.min(1,state.audioVolume??.55));
    const play=(freq,dur,type='triangle',gain=.055,delay=0)=>{
      const osc=audioCtx.createOscillator();
      const g=audioCtx.createGain();
      osc.type=type; osc.frequency.value=freq;
      g.gain.setValueAtTime(.0001,now+delay);
      g.gain.exponentialRampToValueAtTime(gain*vol,now+delay+.015);
      g.gain.exponentialRampToValueAtTime(.0001,now+delay+dur);
      osc.connect(g).connect(audioCtx.destination);
      osc.start(now+delay); osc.stop(now+delay+dur+.03);
    };
    if(name==='click') play(700,.025,'sine',.035);
    if(name==='move'){ play(230,.035,'triangle',.038); play(310,.032,'sine',.03,.035); }
    if(name==='draw'){ play(180,.05,'triangle',.045); play(240,.045,'triangle',.04,.045); }
    if(name==='meld'){ play(392,.08,'sine',.055); play(523,.11,'sine',.06,.07); play(659,.13,'sine',.065,.14); }
    if(name==='discard') play(160,.045,'triangle',.05);
    if(name==='error') play(140,.08,'sawtooth',.035);
    if(name==='win'){ play(392,.12,'sine',.055); play(523,.16,'sine',.065,.12); play(659,.22,'sine',.07,.26); play(784,.28,'sine',.075,.46); }
  }catch(e){}
}
function cardMoveSound(count=1){ for(let i=0;i<Math.min(6,Math.max(1,count));i++) setTimeout(()=>sound('move'),i*55); }
function loadAudioPrefs(){ try{ const on=localStorage.getItem('hofAudioOn'), vol=localStorage.getItem('hofAudioVolume'); if(on!==null) state.audioOn=on==='1'; if(vol!==null) state.audioVolume=Number(vol); }catch(e){} }
function setAudio(on){ state.audioOn=!!on; try{localStorage.setItem('hofAudioOn',state.audioOn?'1':'0')}catch(e){} }
function setVolume(v){ state.audioVolume=Math.max(0,Math.min(1,Number(v))); try{localStorage.setItem('hofAudioVolume',String(state.audioVolume))}catch(e){} }

function applyZoom(){ const z=Math.max(.7,Math.min(1.45,state.zoom||1)); state.zoom=z; document.documentElement.style.setProperty('--zoom',z.toFixed(2)); if($('zoomLevel')) $('zoomLevel').textContent=Math.round(z*100)+'%'; }
function zoomBy(delta){ state.zoom=Math.max(.7,Math.min(1.45,(state.zoom||1)+delta)); applyZoom(); }

function startSetup(){ sound('click'); show('setup'); }
function isPhoneLayout(){
  return window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
}

function startGame(){
  document.body.classList.remove('peek-melds');
  const peekBtn = $('peekMeldsBtn'); if(peekBtn) peekBtn.textContent='Peek Melds';
  state.difficulty=document.querySelector('input[name="ai"]:checked')?.value || 'club';
  state.requireBooks=$('requireBooks').checked;
  state.handNo=1; state.gameOver=false;
  state.players=[makePlayer('You'), makePlayer('AI Opponent',true)];
  dealHand();
  show('game');
}


function resetRoundControls(){
  state.handEnded = false;
  state.phase = 'draw';
  state.selected.clear();
  state.selectedMeld = null;
  const next = $('nextHandBtn');
  if(next){
    next.classList.add('hidden');
    next.disabled = true;
  }
}

function dealHand(){
  UID=0;
  resetRoundControls();
  state.stock=makeDeck(5); state.discard=[];
  state.players.forEach(p=>{ p.hand=[]; p.foot=[]; p.inFoot=false; p.melds=[]; p.opened=false; p.wentOut=false; p.handScore=0; });
  for(let i=0;i<11;i++) state.players.forEach(p=>p.hand.push(state.stock.pop()));
  for(let i=0;i<11;i++) state.players.forEach(p=>p.foot.push(state.stock.pop()));
  state.players.forEach(p=>sortCards(p.hand));
  let up;
  do { up=state.stock.pop(); } while(up && isWild(up));
  if(up) state.discard.push(up);
  state.current=(state.handNo-1)%2;
  render();
  if($('nextHandBtn')) { $('nextHandBtn').classList.add('hidden'); $('nextHandBtn').disabled = true; }
  if(state.current===0) message(isPhoneLayout() ? 'Phone mode: Draw 2 or Take 7 first. Swipe your hand sideways to see cards.' : 'Your turn. Draw 2 or Take 7 first. Then Set, Add, and Discard unlock.');
  else beginAiTurn();
}

function drawFor(p,n,sort=false){
  const target=liveCards(p);
  for(let i=0;i<n;i++){
    if(!state.stock.length) recycleDiscard();
    if(state.stock.length) target.push(state.stock.pop());
  }
  if(sort) sortCards(target);
  cardMoveSound(n);
}
function recycleDiscard(){ if(state.discard.length<=1) return; const top=state.discard.pop(); state.stock=shuffle(state.discard.splice(0)); state.discard=[top]; }

function drawTwo(){
  if(state.current!==0 || state.phase!=='draw') return;
  sound('draw');
  drawFor(player(),2,false);
  state.phase='play';
  render();
  message(isPhoneLayout() ? 'You drew 2. Swipe your hand sideways. Use Peek Melds to check your melds.' : 'You drew 2. New cards are at the far right. Make sets, add to melds, then discard.');
}
function canTakePile(idx){
  if(state.phase!=='draw') return {ok:false,reason:'You must draw or take the pile first.'};
  const p=state.players[idx], top=topDiscard();
  if(!top) return {ok:false,reason:'Discard pile is empty.'};
  if(isThree(top) || isWild(top)) return {ok:false,reason:'The pile is frozen because the top card is a 3 or wild.'};
  if(p.melds.some(m=>m.rank===top.rank)) return {ok:false,reason:'You already have a meld or book of that face.'};
  const matches=liveCards(p).filter(c=>c.rank===top.rank && !isWild(c));
  if(matches.length<2) return {ok:false,reason:'You need two natural cards matching the top discard.'};
  return {ok:true};
}
function takePile(){
  if(state.current!==0) return;
  const chk=canTakePile(0);
  if(!chk.ok){ sound('error'); message(chk.reason); return; }
  const take=state.discard.splice(Math.max(0,state.discard.length-7));
  liveCards(player()).push(...take);
  sound('draw'); cardMoveSound(take.length);
  state.phase='play';
  render();
  message(isPhoneLayout() ? `You took ${take.length} cards. Swipe sideways, or tap Peek Melds to check the table.` : `You took ${take.length} cards. New cards are at the far right.`);
}

function analyzeSelectedSets(cards,p){
  if(!cards.length) return {ok:false,reason:'Select cards to meld.'};
  if(cards.some(isThree)) return {ok:false,reason:'3s cannot be melded.'};
  const groups=new Map(), wilds=[];
  for(const c of cards){
    if(isWild(c)) wilds.push(c);
    else {
      if(!meldRanks.includes(c.rank)) return {ok:false,reason:'Sets must be 4 through Ace.'};
      if(!groups.has(c.rank)) groups.set(c.rank,[]);
      groups.get(c.rank).push(c);
    }
  }
  if(!groups.size) return {ok:false,reason:'You may not make a wild-card set.'};
  const sets=[]; let remainingWilds=[...wilds];
  for(const rank of [...groups.keys()].sort((a,b)=>rankOrder.indexOf(a)-rankOrder.indexOf(b))){
    if(p.melds.some(m=>m.rank===rank)) return {ok:false,reason:`You already have ${rank}s on the table.`};
    const naturals=groups.get(rank), needed=Math.max(0,3-naturals.length);
    if(needed>naturals.length) return {ok:false,reason:`${rank}s need more natural cards before wilds can be used.`};
    const setWilds=remainingWilds.splice(0,needed);
    if(setWilds.length<needed) return {ok:false,reason:`${rank}s need at least 3 cards.`};
    const setCards=[...naturals,...setWilds];
    if(setCards.length<3) return {ok:false,reason:`${rank}s need at least 3 cards.`};
    sets.push({rank,cards:setCards,wilds:setWilds.length});
  }
  if(remainingWilds.length){
    if(sets.length!==1) return {ok:false,reason:'Extra wilds can only be added when one new set is selected.'};
    const s=sets[0], naturals=s.cards.length-s.wilds, maxExtra=Math.max(0,naturals-s.wilds);
    if(remainingWilds.length>maxExtra) return {ok:false,reason:'Too many wilds. Naturals must be at least wilds.'};
    s.cards.push(...remainingWilds); s.wilds+=remainingWilds.length;
  }
  const meldPoints=sets.reduce((sum,set)=>sum+set.cards.reduce((s,c)=>s+points(c),0),0);
  if(!p.opened && meldPoints<openingMinimum()) return {ok:false,reason:`You need ${openingMinimum()} points to open. Selected cards total ${meldPoints}.`};
  return {ok:true,sets,meldPoints};
}
function removeCards(p,cards){ const ids=new Set(cards.map(c=>c.id)); p.hand=p.hand.filter(c=>!ids.has(c.id)); p.foot=p.foot.filter(c=>!ids.has(c.id)); }
function makeSet(){
  if(state.current!==0 || state.phase!=='play') return;
  const cards=selectedCards(), p=player(), v=analyzeSelectedSets(cards,p);
  if(!v.ok){ sound('error'); message(v.reason); return; }
  for(const set of v.sets){
    removeCards(p,set.cards);
    p.melds.push({rank:set.rank,cards:[...set.cards],black:set.wilds>0,booked:set.cards.length>=7});
  }
  p.opened=true; state.selected.clear(); cardMoveSound(cards.length); sound('meld'); checkFoot(p);
  render(); message(`Melded ${v.sets.map(s=>s.rank+'s').join(', ')} for ${v.meldPoints} points.`);
  checkHumanEmpty();
}
function canAddToMeld(cards, meld){
  if(!cards.length) return {ok:false,reason:'Select cards to add.'};
  if(cards.some(isThree)) return {ok:false,reason:'3s cannot be melded.'};
  if(cards.some(c=>!isWild(c) && c.rank!==meld.rank)) return {ok:false,reason:`Only ${meld.rank}s or wilds can be added.`};
  const curWild=meld.cards.filter(isWild).length, curNat=meld.cards.length-curWild;
  const addWild=cards.filter(isWild).length, addNat=cards.length-addWild;
  if(!meld.black && meld.booked && addWild>0) return {ok:false,reason:'A red book can only receive natural cards.'};
  if(!meld.booked && curWild+addWild > curNat+addNat) return {ok:false,reason:'Naturals must be at least wilds before booking.'};
  return {ok:true};
}
function addToMeld(){
  if(state.current!==0 || state.phase!=='play') return;
  const p=player();
  if(!p.opened){ sound('error'); message('You must open before adding cards.'); return; }
  const cards=selectedCards();
  let meld=state.selectedMeld!==null ? p.melds[state.selectedMeld] : null;
  if(!meld){ const natural=cards.find(c=>!isWild(c)); if(natural) meld=p.melds.find(m=>m.rank===natural.rank); }
  if(!meld){ sound('error'); message('Tap one of your melds, then press Add.'); return; }
  const v=canAddToMeld(cards,meld);
  if(!v.ok){ sound('error'); message(v.reason); return; }
  removeCards(p,cards); meld.cards.push(...cards); if(cards.some(isWild)) meld.black=true; if(meld.cards.length>=7) meld.booked=true;
  state.selected.clear(); state.selectedMeld=null; cardMoveSound(cards.length); checkFoot(p);
  render(); message(`Added ${cards.length} card${cards.length===1?'':'s'} to ${meld.rank}s.`);
  checkHumanEmpty();
}
function discardSelected(){
  if(state.current!==0 || state.phase!=='play') return;
  const cards=selectedCards();
  if(cards.length!==1){ sound('error'); message('Select exactly one card to discard.'); return; }
  const c=cards[0], p=player();
  removeCards(p,[c]); state.discard.push(c); state.selected.clear(); state.selectedMeld=null; sound('discard'); cardMoveSound(1);
  if(!p.inFoot && p.hand.length===0){ p.inFoot=true; message('You discarded your last hand card. Your foot starts next turn.'); }
  if(p.inFoot && p.foot.length===0){ finishHand(0); return; }
  nextTurn();
}
function checkFoot(p){ if(!p.inFoot && p.hand.length===0){ p.inFoot=true; message(p.isAI ? 'AI picked up its foot.' : 'You picked up your foot and may keep playing.'); } }
function checkHumanEmpty(){ const p=player(); if(p.inFoot && p.foot.length===0) finishHand(0); else render(); }
function manualSortHand(){ sortCards(liveCards(player())); render(); message(state.phase==='draw' ? 'Your cards are sorted. Draw 2 or Take 7 first. Then Set, Add, and Discard unlock.' : 'Your cards are sorted.'); }

function canGoOut(idx){
  const p=state.players[idx];
  if(!p.inFoot) return {ok:false,reason:'You must be in your foot before going out.'};
  if(liveCards(p).length>0) return {ok:false,reason:'Play or discard all foot cards to go out.'};
  if(state.requireBooks){
    const red=p.melds.some(m=>m.booked && !m.black), black=p.melds.some(m=>m.booked && m.black);
    if(!red || !black) return {ok:false,reason:'This table requires one red and one black book to go out.'};
  }
  return {ok:true};
}
function goOutClick(){ const chk=canGoOut(0); if(!chk.ok){ sound('error'); message(chk.reason); return; } finishHand(0); }
function nextTurn(){
  state.phase='draw'; state.selected.clear(); state.selectedMeld=null; state.current=state.current===0?1:0; render();
  if(state.current===0) message('Your turn. Draw 2 or Take 7 first. Then Set, Add, and Discard unlock.');
  else beginAiTurn();
}
function aiDelayByDifficulty(){
  const d=state.difficulty || 'club';
  if(d==='easy') return 9000 + Math.floor(Math.random()*1000);
  if(d==='shark') return 5000 + Math.floor(Math.random()*2000);
  return 7000 + Math.floor(Math.random()*2000);
}
function beginAiTurn(){
  render();
  message(`${ai().name} is thinking...`);
  setTimeout(aiTurn, aiDelayByDifficulty());
}
function aiTurn(){
  if(state.current!==1 || state.handEnded) return;
  const p=ai();
  const take=aiShouldTakePile();
  if(take){
    const cards=state.discard.splice(Math.max(0,state.discard.length-7));
    liveCards(p).push(...cards); cardMoveSound(cards.length); sound('draw');
  } else {
    drawFor(p,2,false); sound('draw');
  }
  state.phase='play';
  aiPlayMelds();
  if(state.handEnded) return;
  aiDiscard();
}
function aiShouldTakePile(){
  const chk=canTakePile(1);
  if(!chk.ok) return false;
  if(state.difficulty==='easy') return Math.random()<.15;
  if(state.difficulty==='club') return Math.random()<.45;
  return true;
}
function aiPlayMelds(){
  const p=ai(); let safety=0, moved=true;
  while(moved && safety++<12){
    moved=false;
    for(const m of p.melds){
      const add=[];
      for(const c of [...liveCards(p)]){
        const wildRoom = m.cards.filter(isWild).length < (m.cards.length - m.cards.filter(isWild).length);
        if(c.rank===m.rank || (isWild(c) && (m.black || (!m.booked && wildRoom)))) add.push(c);
      }
      const use=add.slice(0, state.difficulty==='shark'?3:1);
      if(use.length && canAddToMeld(use,m).ok){ removeCards(p,use); m.cards.push(...use); if(use.some(isWild)) m.black=true; if(m.cards.length>=7) m.booked=true; moved=true; cardMoveSound(use.length); }
    }
    const candidate=bestAiSet();
    if(candidate){
      const v=analyzeSelectedSets(candidate,p);
      if(v.ok){ for(const set of v.sets){ removeCards(p,set.cards); p.melds.push({rank:set.rank,cards:[...set.cards],black:set.wilds>0,booked:set.cards.length>=7}); } p.opened=true; moved=true; sound('meld'); cardMoveSound(candidate.length); }
    }
    checkFoot(p);
    if(p.inFoot && p.foot.length===0){ finishHand(1); return; }
  }
}
function bestAiSet(){
  const p=ai(), cards=liveCards(p);
  const byRank=new Map(), wilds=cards.filter(isWild);
  for(const c of cards){ if(!isWild(c) && !isThree(c) && meldRanks.includes(c.rank)){ if(!byRank.has(c.rank)) byRank.set(c.rank,[]); byRank.get(c.rank).push(c); } }
  let best=null, bestPts=0;
  for(const [rank,nats] of byRank){
    if(p.melds.some(m=>m.rank===rank)) continue;
    let combo=[...nats];
    if(combo.length<3){
      const needed=3-combo.length;
      if(needed<=combo.length && wilds.length>=needed) combo=combo.concat(wilds.slice(0,needed));
    } else if(state.difficulty!=='easy' && wilds.length && combo.length<7 && wilds.length<=combo.length) {
      combo=combo.concat(wilds.slice(0,Math.min(wilds.length,7-combo.length,combo.length)));
    }
    if(combo.length>=3){
      const pts=combo.reduce((s,c)=>s+points(c),0);
      if((p.opened || pts>=openingMinimum()) && pts>bestPts){ best=combo; bestPts=pts; }
    }
  }
  return best;
}
function aiDiscard(){
  const p=ai(), cards=liveCards(p);
  if(!cards.length){ if(p.inFoot) finishHand(1); else nextTurn(); return; }
  let c = cards.find(isThree);
  if(!c){
    const avoidRanks=new Set(p.melds.map(m=>m.rank));
    const candidates=cards.filter(x=>!isWild(x) && !avoidRanks.has(x.rank));
    c=(candidates.length?candidates:cards.filter(x=>!isWild(x)))[0] || cards[0];
  }
  removeCards(p,[c]); state.discard.push(c); sound('discard'); cardMoveSound(1);
  if(!p.inFoot && p.hand.length===0) p.inFoot=true;
  if(p.inFoot && p.foot.length===0){ finishHand(1); return; }
  nextTurn();
}
function finishHand(winnerIdx){
  state.handEnded=true;
  state.players[winnerIdx].wentOut=true;
  scoreHand();
  render();
  showRoundWinner(winnerIdx);
  if(state.handNo>=4) state.gameOver=true;
}
function scoreHand(){
  state.players.forEach(p=>{
    let score=0;
    for(const m of p.melds){
      score+=m.cards.reduce((s,c)=>s+points(c),0);
      if(m.booked) score+=m.black?300:500;
    }
    for(const c of [...p.hand,...p.foot]){
      score += isThree(c) ? (isRed(c)?-500:-300) : -points(c);
    }
    if(p.wentOut) score+=100;
    p.handScore=score; p.score+=score;
  });
}
function nextHand(){ if(state.handNo>=4){ showFinalScores(); return; } state.handNo++; resetRoundControls(); dealHand(); }
function showRoundWinner(winnerIdx){
  const p0=player(), p1=ai(), handWinner=p0.handScore>=p1.handScore?p0:p1, isGameOver=state.handNo>=4;
  sound('win');
  showModal(`
    <section class="winner-card">
      <div class="winner-badge">${handWinner===p0?'🏆':'🤖'}</div>
      <h2>${isGameOver?'Game Complete':`Hand ${state.handNo} Complete`}</h2>
      <p>${state.players[winnerIdx].name} went out. <b>${handWinner.name}</b> won this hand.</p>
      <div class="winner-score">
        <div>You<strong>${p0.handScore}</strong><small>Total: ${p0.score}</small></div>
        <div>AI<strong>${p1.handScore}</strong><small>Total: ${p1.score}</small></div>
      </div>
      <p>${isGameOver ? finalWinnerText() : 'Close this window, then press Next Hand when ready.'}</p>
    </section>
  `);
}
function finalWinnerText(){ const p0=player(), p1=ai(); if(p0.score===p1.score) return `Final score is tied at ${p0.score}.`; const winner=p0.score>p1.score?p0:p1; return `${winner.name} wins the game, ${p0.score} to ${p1.score}.`; }


function togglePeekMelds(){
  document.body.classList.toggle('peek-melds');
  const btn = $('peekMeldsBtn');
  if(btn) btn.textContent = document.body.classList.contains('peek-melds') ? 'Show Hand' : 'Peek Melds';
}

function render(){
  if(!$('game')) return;
  $('roundBadge').textContent=`Hand ${state.handNo} · Open ${openingMinimum()}`;
  $('stockCount').textContent=state.stock.length;
  renderScores(); renderAiStatus(); renderPile(); renderMelds(); renderHand(); renderButtons();
  $('turnName').textContent=state.current===0?'Your Turn':'AI Turn';
}
function renderScores(){
  const p0=state.players[0], p1=state.players[1];
  $('scoreBadges').innerHTML = state.players.length ? `
    <div class="score-chip ${state.current===0?'active':''}">You: ${p0.score}</div>
    <div class="score-chip ${state.current===1?'active':''}">AI: ${p1.score}</div>` : '';
}
function renderAiStatus(){
  const p=ai();
  if(!p){ $('aiStatus').innerHTML=''; return; }
  $('aiStatus').classList.toggle('active',state.current===1);
  $('aiStatus').innerHTML=`<strong>🤖 ${p.name}</strong><span>${p.inFoot?'Foot':'Hand'} · ${liveCards(p).length} cards · ${p.melds.length} melds</span>`;
}
function renderPile(){
  const top=topDiscard(), el=$('discardPileBtn');
  if(!top){ el.innerHTML=''; return; }
  el.innerHTML=cardHTML(top,false);
}
function renderMelds(){
  renderMeldZone('playerMelds',player(),true);
  renderMeldZone('aiMelds',ai(),false);
}
function renderMeldZone(id,p,selectable){
  $(id).innerHTML=p.melds.map((m,i)=>{
    const book=m.cards.length>=7 || m.booked; m.booked=book;
    const cls=book?(m.black?'black-book':'red-book'):(m.black?'dirty':'');
    return `<button class="meld ${cls} ${selectable?'selectable':''}" data-meld="${i}">
      <div>${m.rank}</div><div class="m-suit">${m.black?'★':'◆'}</div><div class="m-count">${m.cards.length}</div><div class="m-tag">${book?(m.black?'BLACK BOOK':'RED BOOK'):(m.black?'BLACK SET':'RED SET')}</div>
    </button>`;
  }).join('');
  if(selectable){
    document.querySelectorAll('#playerMelds .meld').forEach(b=>b.onclick=()=>{ state.selectedMeld=Number(b.dataset.meld); message(`Selected ${player().melds[state.selectedMeld].rank}s. Choose cards and press Add.`); });
  }
}
function renderHand(){
  const p=player(), cards=liveCards(p);
  $('handMode').textContent=p.inFoot?'FOOT':'HAND';
  $('cardsLeft').textContent=`${cards.length} card${cards.length===1?'':'s'}`;
  $('humanCards').innerHTML=cards.map(c=>cardHTML(c,true)).join('');
  document.querySelectorAll('#humanCards .card').forEach(el=>el.onclick=()=>{
    const id=el.dataset.id;
    if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    renderHand();
    if(state.current===0 && state.phase==='draw'){
      message('Cards selected. Draw 2 or Take 7 first. Then Set, Add, and Discard unlock.');
    }
  });
}
function cardHTML(c,clickable){
  const red=isRed(c), wild=isWild(c);
  const cls=red?'red':wild?'wild':'';
  const selected=clickable && state.selected.has(c.id)?'selected':'';
  const r=c.rank==='JK'?'JK':c.rank, s=c.rank==='JK'?'★':c.suit;
  return `<div class="card ${cls} ${selected}" data-id="${c.id}"><div>${r}<br>${s}</div><div class="suit">${s}</div><div class="bottom">${r}<br>${s}</div></div>`;
}
function renderButtons(){
  const humanTurn = state.current===0 && !state.handEnded;
  const canDraw = humanTurn && state.phase==='draw';
  const canPlay = humanTurn && state.phase==='play';

  if($('drawBtn')) $('drawBtn').disabled = !canDraw;
  if($('discardPileBtn')) $('discardPileBtn').disabled = !canDraw;

  ['setBtn','addBtn','discardBtn'].forEach(id=>{
    const b = $(id);
    if(b) b.disabled = !canPlay;
  });

  const next = $('nextHandBtn');
  if(next){
    const showNext = state.handEnded && state.handNo < 4;
    next.classList.toggle('hidden', !showNext);
    next.disabled = !showNext;
  }
}
function clearSelection(){ state.selected.clear(); state.selectedMeld=null; renderHand(); }
function showModal(html){ const modal=$('modal'), body=$('modalBody'); if(!modal||!body) return; body.innerHTML=html; try{ if(modal.open) modal.close(); modal.showModal(); }catch(e){ modal.setAttribute('open',''); } }
function showRules(){
  sound('click');
  showModal(`
    <section class="rules-panel readable-rules">
      <div class="rules-hero">
        <div class="rules-hero-icon">🃏</div>
        <div>
          <h2>How to Play</h2>
          <p>Hand Over Foot is inspired by Hand and Foot Canasta, a Rummy-family card game. This version is a clean Player vs AI game.</p>
        </div>
      </div>

      <div class="rules-grid">
        <article class="rule-card">
          <h3>🎯 Goal</h3>
          <p>Make melds, build books, empty your Hand, then empty your Foot. Highest score after four hands wins.</p>
        </article>

        <article class="rule-card">
          <h3>🔄 Your Turn</h3>
          <ol>
            <li>Draw 2 cards or Take 7 from the discard pile.</li>
            <li>Set new melds or add to existing melds.</li>
            <li>Discard 1 card to end your turn.</li>
          </ol>
        </article>

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
          <h3>📚 Sets & Books</h3>
          <ul>
            <li>Sets need 3 or more cards of the same rank, 4 through Ace.</li>
            <li>2s and Jokers are wild.</li>
            <li>3s cannot be melded.</li>
            <li>7 cards completes a book.</li>
          </ul>
        </article>

        <article class="rule-card">
          <h3>💰 Scoring</h3>
          <ul>
            <li>3 through 9 = 5 points</li>
            <li>10, Jack, Queen, King = 10 points</li>
            <li>Aces and 2s = 20 points</li>
            <li>Jokers = 50 points</li>
          </ul>
        </article>

        <article class="rule-card">
          <h3>⚠️ Penalties</h3>
          <ul>
            <li>Black 3 left in Hand or Foot = -300</li>
            <li>Red 3 left in Hand or Foot = -500</li>
          </ul>
        </article>

        <article class="rule-card full">
          <h3>📜 Open Source</h3>
          <p>This project is open source under the MIT “as is” license. You may use it freely to study, remix, or develop your own creations.</p>
          <p><a class="github-link" href="https://github.com/DavidFliesen/handoverfoot" target="_blank" rel="noopener">View the Hand Over Foot GitHub repository</a></p>
        </article>
      </div>

      <div class="rules-tip"><b>Tip:</b> New cards from Draw 2 or Take 7 appear at the far right of your hand so you can see what you just received before using Sort.</div>
    </section>
  `);
}

function showScores(){
  sound('click');
  const p0=state.players[0]||{score:0,handScore:0,name:'You'}, p1=state.players[1]||{score:0,handScore:0,name:'AI'};
  showModal(`<section class="rules-panel"><div class="rules-hero"><div class="rules-hero-icon">🏆</div><div><h2>Scores</h2><p>Current hand and game totals.</p></div></div><article class="rule-card full"><table class="opening-table"><tr><th>Player</th><th>Hand</th><th>Total</th></tr><tr><td>You</td><td>${p0.handScore}</td><td>${p0.score}</td></tr><tr><td>AI</td><td>${p1.handScore}</td><td>${p1.score}</td></tr></table></article></section>`);
}
function showSettings(){
  sound('click');
  showModal(`
    <section class="settings-grid">
      <div class="rules-hero"><div class="rules-hero-icon">⚙️</div><div><h2>Settings</h2><p>Adjust subtle game sounds.</p></div></div>
      <article class="setting-card"><h3>🔊 Audio</h3><label class="toggle-pill"><input type="checkbox" id="audioToggle" ${state.audioOn?'checked':''}> Subtle sound effects</label><div class="audio-row"><span>Volume</span><input type="range" id="audioVolume" min="0" max="1" step="0.05" value="${state.audioVolume??.55}"></div></article>
    </section>`);
  setTimeout(()=>{ const t=$('audioToggle'), v=$('audioVolume'); if(t) t.onchange=()=>{setAudio(t.checked); sound('click');}; if(v) v.oninput=()=>{setVolume(v.value); sound('click');}; },0);
}
function showFinalScores(){ showScores(); }

function init(){
  loadAudioPrefs(); applyZoom();
  $('playAiBtn').onclick=startSetup;
  $('rulesBtn').onclick=showRules;
  $('scoresBtn').onclick=showScores;
  $('settingsBtn').onclick=showSettings;
  $('dealBtn').onclick=startGame;
  document.querySelectorAll('[data-nav="home"]').forEach(b=>b.onclick=()=>show('home'));
  document.querySelectorAll('input[name="ai"]').forEach(i=>i.onchange=()=>document.querySelectorAll('.choice').forEach(l=>l.classList.toggle('checked', l.querySelector('input').checked)));
  $('drawBtn').onclick=drawTwo;
  $('discardPileBtn').onclick=takePile;
  $('setBtn').onclick=makeSet;
  $('addBtn').onclick=addToMeld;
  $('discardBtn').onclick=discardSelected;
  $('sortBtn').onclick=manualSortHand;
  $('clearBtn').onclick=clearSelection;
  $('nextHandBtn').onclick=nextHand;
  $('zoomOutBtn').onclick=()=>zoomBy(-.1);
  $('zoomInBtn').onclick=()=>zoomBy(.1);
  if($('peekMeldsBtn')) $('peekMeldsBtn').onclick=togglePeekMelds;
  $('closeModal').onclick=()=>$('modal').close();
}
document.addEventListener('DOMContentLoaded', init);
})();
