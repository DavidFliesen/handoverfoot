(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const suits = ['♠','♥','♦','♣'];
const redSuits = new Set(['♥','♦']);
const naturalRanks = ['4','5','6','7','8','9','10','J','Q','K','A'];
const rankOrder = ['3','4','5','6','7','8','9','10','J','Q','K','A','2','JK'];
const openMinimums = [50,90,120,150];
const bookBonus = { clean:500, dirty:300, wild:1500 };
const goingOutBonus = 100;
const valueMap = { '3':5,'4':5,'5':5,'6':5,'7':5,'8':10,'9':10,'10':10,'J':10,'Q':10,'K':10,'A':20,'2':20,'JK':50 };
const state = {
  screen:'home', mode:'solo', difficulty:'club', strict:true, allowWildBooks:true,
  round:1, current:0, phase:'draw', selected:new Set(), targetMeld:null, message:'',
  stock:[], discard:[], players:[], gameOver:false, passPlay:false, lastSnapshot:null
};
function newPlayer(name, ai=false){ return { name, ai, hand:[], foot:[], inFoot:false, melds:[], score:0, roundScore:0, opened:false, drew:false, canTakePileBlocked:false }; }
function cardId(){ return Math.random().toString(36).slice(2,9); }
function makeDeck(decks=5){
  const cards=[];
  for(let d=0; d<decks; d++){
    for(const s of suits){ for(const r of ['A','2','3','4','5','6','7','8','9','10','J','Q','K']) cards.push({id:cardId(),rank:r,suit:s}); }
    cards.push({id:cardId(),rank:'JK',suit:'★'}); cards.push({id:cardId(),rank:'JK',suit:'★'});
  }
  return shuffle(cards);
}
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function sortCards(cards){ cards.sort((a,b)=>rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank) || suitSort(a)-suitSort(b)); }
function suitSort(c){ return suits.indexOf(c.suit); }
function isRed(c){ return c.rank==='JK' ? false : redSuits.has(c.suit); }
function isWild(c){ return c.rank==='2' || c.rank==='JK'; }
function isThree(c){ return c.rank==='3'; }
function cardValue(c){ return valueMap[c.rank] || 0; }
function activePlayer(){ return state.players[state.current]; }
function opponentPlayer(){ return state.players[1-state.current]; }
function liveCards(p){ return p.inFoot ? p.foot : p.hand; }
function totalCards(p){ return p.hand.length + p.foot.length; }
function saveSnapshot(){ state.lastSnapshot = JSON.stringify({players:state.players,stock:state.stock,discard:state.discard,current:state.current,phase:state.phase}); }
function restoreSnapshot(){ if(!state.lastSnapshot) return; const x=JSON.parse(state.lastSnapshot); Object.assign(state,x); state.selected.clear(); render(); setMessage('Last action undone.'); }
function startGame(mode='solo'){
  state.mode = mode; state.passPlay = mode==='pass'; state.difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || 'club';
  state.strict = $('strictRules').checked; state.allowWildBooks = $('wildBooks').checked;
  state.round = 1; state.gameOver=false; state.players = [newPlayer('You', false), newPlayer(state.passPlay?'Player 2':'AI Dealer', !state.passPlay)];
  newRound(true); show('game');
}
function newRound(reset=false){
  state.stock = makeDeck(5); state.discard=[]; state.selected.clear(); state.targetMeld=null; state.current = state.round % 2 === 1 ? 0 : 1; state.phase='draw';
  for(const p of state.players){ p.hand=[]; p.foot=[]; p.melds=[]; p.inFoot=false; p.opened=false; p.drew=false; p.canTakePileBlocked=false; p.roundScore=0; }
  for(let i=0;i<11;i++){ for(const p of state.players) p.hand.push(state.stock.pop()); }
  for(let i=0;i<11;i++){ for(const p of state.players) p.foot.push(state.stock.pop()); }
  for(const p of state.players) sortCards(p.hand);
  let up; do { up=state.stock.pop(); state.stock.unshift(...state.discard.splice(0)); } while(isWild(up)); state.discard.push(up);
  $('newRoundBtn').classList.add('hidden');
  setMessage(`${activePlayer().name} starts Round ${state.round}. Draw two or take the pile.`); render(); maybeAiTurn();
}
function show(name){
  $('homeScreen').classList.toggle('hidden', name!=='home'); $('setupScreen').classList.toggle('hidden', name!=='setup'); $('gameScreen').classList.toggle('hidden', name!=='game'); state.screen=name;
}
function setMessage(msg){ state.message=msg; $('message').textContent=msg; }
function cardHtml(c, selected=false, back=false){
  if(back) return `<div class="card back" aria-hidden="true"></div>`;
  const color = isWild(c) ? 'wild' : isRed(c) ? 'red' : 'black';
  const label = c.rank==='JK' ? 'Joker' : `${c.rank}${c.suit}`;
  return `<button class="card ${color}${selected?' selected':''}" data-id="${c.id}" title="${label}"><span class="rank">${c.rank}</span><span class="suit">${c.suit}</span><span class="rank bottom">${c.rank}</span></button>`;
}
function render(){
  const p0=state.players[0], p1=state.players[1], current=activePlayer();
  $('roundInfo').textContent = `Round ${state.round} · Open ${openMinimums[state.round-1]}`;
  $('scoreboard').innerHTML = state.players.map((p,i)=>`<span class="score-chip ${i===state.current?'active':''}">${p.name}: ${p.score}</span>`).join('');
  $('humanName').textContent=p0.name; $('opponentName').textContent=p1.name;
  $('humanStatus').textContent = p0.inFoot?'Foot':'Hand'; $('opponentStatus').textContent = p1.inFoot?'Foot':'Hand';
  $('humanCount').textContent = `${liveCards(p0).length} cards · Foot ${p0.foot.length}`; $('opponentCount').textContent = `${liveCards(p1).length} cards · Foot ${p1.foot.length}`;
  $('humanZone').classList.toggle('active', state.current===0); $('opponentZone').classList.toggle('active', state.current===1);
  $('humanHand').innerHTML = liveCards(p0).map(c=>cardHtml(c,state.selected.has(c.id))).join('');
  $('opponentCards').innerHTML = liveCards(p1).map(()=>cardHtml(null,false,true)).join('');
  renderMelds('humanMelds',p0); renderMelds('opponentMelds',p1);
  const top = state.discard[state.discard.length-1]; $('takePileBtn').innerHTML = top ? cardHtml(top,false,false).replace('<button','<div').replace('</button>','</div>') : ''; $('discardCount').textContent = state.discard.length ? `(${state.discard.length})` : '';
  $('stockCount').textContent = state.stock.length;
  $('turnTitle').textContent = current.ai ? `${current.name}'s Turn` : state.current===0 ? 'Your Turn' : `${current.name}'s Turn`;
  updateButtons(); bindCardClicks(); bindMeldClicks();
}
function renderMelds(id,p){
  $(id).innerHTML = p.melds.map((m,idx)=>{
    const kind = meldKind(m); const book = m.cards.length>=7;
    const colorSuit = m.rank==='JK' ? '★' : m.rank==='2' ? '◆' : '♣';
    return `<button class="meld ${kind} ${book?'book':''}" data-player="${state.players.indexOf(p)}" data-meld="${idx}" data-book="${kind.toUpperCase()}"><span class="meld-count">${m.cards.length}</span><span class="rank">${m.rank}</span><span class="suit">${colorSuit}</span><span class="rank bottom">${m.rank}</span></button>`;
  }).join('');
}
function updateButtons(){
  const p=activePlayer(), humanTurn=!p.ai || state.passPlay; const selected = selectedCards(p);
  const drew = state.phase==='play';
  for(const id of ['drawBtn','takePileBtn','newMeldBtn','addMeldBtn','discardBtn','goOutBtn','sortBtn','hintBtn','undoSelectionBtn']) $(id).disabled = !humanTurn;
  $('drawBtn').disabled = !humanTurn || state.phase!=='draw'; $('takePileBtn').disabled = !humanTurn || state.phase!=='draw' || !canTakePile(p).ok;
  $('newMeldBtn').disabled = !humanTurn || !drew || !canNewMeld(p,selected).ok;
  $('addMeldBtn').disabled = !humanTurn || !drew || !canAddToAnyMeld(p,selected).ok;
  $('discardBtn').disabled = !humanTurn || !drew || selected.length!==1;
  $('goOutBtn').disabled = !humanTurn || !canGoOut(p).ok;
}
function bindCardClicks(){ document.querySelectorAll('#humanHand .card').forEach(el=>el.onclick=()=>{ const id=el.dataset.id; state.selected.has(id)?state.selected.delete(id):state.selected.add(id); render(); }); }
function bindMeldClicks(){ document.querySelectorAll('.meld').forEach(el=>el.onclick=()=>{ state.targetMeld={player:+el.dataset.player,index:+el.dataset.meld}; const p=activePlayer(); const selected=selectedCards(p); if((!p.ai||state.passPlay) && state.phase==='play' && state.targetMeld.player===state.current && canAddToMeld(p,p.melds[state.targetMeld.index],selected).ok) addToTargetMeld(); else render(); }); }
function selectedCards(p){ const ids=state.selected; return liveCards(p).filter(c=>ids.has(c.id)); }
function removeCards(p,cards){ const ids=new Set(cards.map(c=>c.id)); p.hand=p.hand.filter(c=>!ids.has(c.id)); p.foot=p.foot.filter(c=>!ids.has(c.id)); }
function validateMeld(cards, existingRank=null){
  if(cards.length<3) return {ok:false,reason:'A meld needs at least 3 cards.'};
  if(cards.some(isThree)) return {ok:false,reason:'3s cannot be melded.'};
  const naturals=cards.filter(c=>!isWild(c)); const wilds=cards.filter(isWild);
  if(existingRank==='2' || (cards.every(isWild) && state.allowWildBooks)) return cards.length<=7 ? {ok:true,rank:'2',wilds:wilds.length,naturals:0} : {ok:false,reason:'A wild book tops out at 7 cards.'};
  if(naturals.length===0) return {ok:false,reason:'Wild-only melds are only allowed as seven-card wild books.'};
  const rank=naturals[0].rank; if(naturals.some(c=>c.rank!==rank)) return {ok:false,reason:'Natural cards must match rank.'};
  if(existingRank && existingRank!==rank) return {ok:false,reason:'Selected cards do not match this meld.'};
  if(wilds.length>=naturals.length) return {ok:false,reason:'Natural cards must outnumber wilds.'};
  if(cards.length>7) return {ok:false,reason:'Books stop at 7 cards.'};
  return {ok:true,rank,wilds:wilds.length,naturals:naturals.length};
}
function meldKind(m){ if(m.rank==='2' && m.cards.every(isWild)) return 'wild-book'; return m.cards.some(isWild) ? 'dirty' : 'clean'; }
function canNewMeld(p,cards){
  const v=validateMeld(cards); if(!v.ok) return v;
  if(p.melds.some(m=>m.rank===v.rank)) return {ok:false,reason:'You already have a meld for that rank. Add to it instead.'};
  if(!p.opened){ const pts=cards.reduce((s,c)=>s+cardValue(c),0); if(pts<openMinimums[state.round-1]) return {ok:false,reason:`Opening meld needs ${openMinimums[state.round-1]} points. Selected: ${pts}.`}; }
  return {ok:true,rank:v.rank};
}
function canAddToMeld(p,m,cards){ if(!cards.length) return {ok:false,reason:'Select cards to add.'}; if(m.cards.length+cards.length>7) return {ok:false,reason:'A book can only have 7 cards.'}; return validateMeld([...m.cards,...cards],m.rank); }
function canAddToAnyMeld(p,cards){ for(const m of p.melds){ const v=canAddToMeld(p,m,cards); if(v.ok) return {ok:true,m}; } return {ok:false,reason:'Those cards do not fit any meld.'}; }
function canTakePile(p){
  const top=state.discard[state.discard.length-1]; if(!top) return {ok:false,reason:'Discard pile is empty.'}; if(isWild(top)||isThree(top)) return {ok:false,reason:'Cannot take the pile on a wild card or 3.'};
  if(p.canTakePileBlocked) return {ok:false,reason:'Black 3 blocks taking the pile.'};
  const matching=liveCards(p).filter(c=>!isWild(c)&&c.rank===top.rank).length;
  if(matching>=2 || p.melds.some(m=>m.rank===top.rank)) return {ok:true}; return {ok:false,reason:'You need two natural matching cards or an existing meld.'};
}
function canGoOut(p){
  if(state.phase!=='play') return {ok:false,reason:'You must draw or take the pile first.'};
  if(!p.inFoot) return {ok:false,reason:'You must be in your foot pile before going out.'};
  const clean=p.melds.some(m=>m.cards.length>=7 && meldKind(m)==='clean'); const dirty=p.melds.some(m=>m.cards.length>=7 && meldKind(m)==='dirty');
  if(state.strict && (!clean || !dirty)) return {ok:false,reason:'Need one clean and one dirty book.'};
  if(liveCards(p).length>1) return {ok:false,reason:'You must discard your last card or have no cards left.'};
  return {ok:true};
}
function ensureStock(){ if(state.stock.length>1) return; if(state.discard.length<=1) return; const top=state.discard.pop(); state.stock=shuffle(state.discard.splice(0)); state.discard=[top]; }
function drawTwo(){ const p=activePlayer(); if(state.phase!=='draw') return; saveSnapshot(); ensureStock(); for(let i=0;i<2 && state.stock.length;i++) liveCards(p).push(state.stock.pop()); sortCards(liveCards(p)); state.phase='play'; p.drew=true; setMessage(`${p.name} drew two cards.`); render(); }
function takePile(){ const p=activePlayer(); const v=canTakePile(p); if(!v.ok){ setMessage(v.reason); return; } saveSnapshot(); liveCards(p).push(...state.discard.splice(0)); sortCards(liveCards(p)); state.phase='play'; p.drew=true; setMessage(`${p.name} took the discard pile.`); render(); }
function newMeld(){ const p=activePlayer(); const cards=selectedCards(p); const v=canNewMeld(p,cards); if(!v.ok){ setMessage(v.reason); return; } saveSnapshot(); removeCards(p,cards); p.melds.push({rank:v.rank,cards:[...cards]}); p.opened=true; state.selected.clear(); checkFoot(p); setMessage(`New ${v.rank} meld started.`); render(); }
function addToTargetMeld(){ const p=activePlayer(); const cards=selectedCards(p); let idx=state.targetMeld?.index; if(idx==null){ const any=canAddToAnyMeld(p,cards); if(!any.ok){ setMessage(any.reason); return; } idx=p.melds.indexOf(any.m); }
  const m=p.melds[idx], v=canAddToMeld(p,m,cards); if(!v.ok){ setMessage(v.reason); return; } saveSnapshot(); removeCards(p,cards); m.cards.push(...cards); state.selected.clear(); checkFoot(p); setMessage(`Added to ${m.rank} meld.`); render(); }
function discard(){ const p=activePlayer(); const cards=selectedCards(p); if(cards.length!==1){ setMessage('Select one card to discard.'); return; } saveSnapshot(); removeCards(p,cards); state.discard.push(cards[0]); opponentPlayer().canTakePileBlocked = cards[0].rank==='3' && !isRed(cards[0]); state.selected.clear(); checkFoot(p); const go=canGoOut(p); if(go.ok && liveCards(p).length===0){ endRound(p); return; } nextTurn(); }
function checkFoot(p){ if(!p.inFoot && p.hand.length===0){ p.inFoot=true; sortCards(p.foot); setMessage(`${p.name} picked up the foot pile.`); } }
function nextTurn(){ activePlayer().canTakePileBlocked=false; state.current=1-state.current; state.phase='draw'; activePlayer().drew=false; setMessage(`${activePlayer().name}'s turn. Draw two or take the pile.`); render(); maybeAiTurn(); }
function endRound(winner){
  const rows=[]; for(const p of state.players){ const score=scoreRound(p,p===winner); p.roundScore=score; p.score+=score; rows.push({name:p.name,score,total:p.score}); }
  state.gameOver=state.round>=4; render(); showRoundModal(rows,winner); $('newRoundBtn').classList.toggle('hidden',state.gameOver); if(!state.gameOver) $('newRoundBtn').classList.remove('hidden');
}
function scoreRound(p,wentOut){ let score=wentOut?goingOutBonus:0; for(const m of p.melds){ score+=m.cards.reduce((s,c)=>s+cardValue(c),0); if(m.cards.length>=7){ const k=meldKind(m); score += k==='wild-book'?bookBonus.wild:bookBonus[k]; }} for(const c of [...p.hand,...p.foot]) score -= isThree(c) ? (isRed(c)?200:100) : cardValue(c); return score; }
function showRoundModal(rows,winner){
  const body = `<h2>${state.gameOver?'Game Complete':'Round Complete'}</h2><p>${winner.name} went out.</p><table class="end-table"><tr><th>Player</th><th>Round</th><th>Total</th></tr>${rows.map(r=>`<tr><td>${r.name}</td><td>${r.score}</td><td>${r.total}</td></tr>`).join('')}</table>${state.gameOver?`<h3>${state.players[0].score===state.players[1].score?'Tie game!':state.players[0].score>state.players[1].score?state.players[0].name+' wins!':state.players[1].name+' wins!'}</h3>`:'<p>Press Next Round to continue.</p>'}`;
  openModal(body);
}
function maybeAiTurn(){ const p=activePlayer(); if(!p.ai || state.passPlay) return; setTimeout(aiTurn,550); }
function aiTurn(){ const p=activePlayer(); if(!p.ai || state.phase!=='draw') return;
  const take = aiShouldTakePile(p); take ? takePile() : drawTwo(); setTimeout(()=>{ aiPlayMelds(p); aiDiscard(p); },600);
}
function aiShouldTakePile(p){ const v=canTakePile(p); if(!v.ok) return false; const top=state.discard[state.discard.length-1]; const count=liveCards(p).filter(c=>c.rank===top.rank && !isWild(c)).length; if(state.difficulty==='easy') return false; if(state.difficulty==='club') return count>=2 && state.discard.length<=6; return count>=2 || p.melds.some(m=>m.rank===top.rank); }
function aiPlayMelds(p){
  let changed=true, guard=0; while(changed && guard++<20){ changed=false; const hand=liveCards(p);
    for(const m of p.melds){ const add=hand.filter(c=>c.rank===m.rank || isWild(c)).slice(0,7-m.cards.length); if(add.length){ const v=canAddToMeld(p,m,add); if(v.ok){ removeCards(p,add); m.cards.push(...add); changed=true; break; }} }
    if(changed) continue;
    for(const r of [...naturalRanks,'JK']){ const cards=hand.filter(c=>c.rank===r); const wilds=state.difficulty==='easy'?[]:hand.filter(isWild).slice(0,Math.max(0,cards.length-1)); const group=[...cards,...wilds].slice(0,7); if(group.length>=3){ const v=canNewMeld(p,group); if(v.ok){ removeCards(p,group); p.melds.push({rank:v.rank,cards:group}); p.opened=true; changed=true; break; }} }
  } checkFoot(p); render(); }
function aiDiscard(p){ const hand=liveCards(p); if(!hand.length){ if(canGoOut(p).ok){ endRound(p); return; } nextTurn(); return; } let candidates=[...hand].sort((a,b)=>aiDiscardValue(a,p)-aiDiscardValue(b,p)); const card=candidates[0]; state.selected=new Set([card.id]); discard(); }
function aiDiscardValue(c,p){ if(isThree(c)) return -1000; if(isWild(c)) return 900; if(p.melds.some(m=>m.rank===c.rank)) return 600; if(state.difficulty==='shark' && opponentPlayer().melds.some(m=>m.rank===c.rank)) return 500; return cardValue(c); }
function hint(){ const p=activePlayer(); const hand=liveCards(p); for(const r of naturalRanks){ const group=hand.filter(c=>c.rank===r); if(group.length>=3){ state.selected=new Set(group.slice(0,3).map(c=>c.id)); setMessage(`Try starting a ${r} meld.`); render(); return; }} setMessage('Hint: dump 3s, protect wilds, and build toward clean and dirty books.'); }
function openModal(html){ $('modalBody').innerHTML=html; $('modal').showModal(); }
function rulesHtml(){ return `<h2>How to Play Hand Over Foot</h2><ul class="rules-list"><li>Each player gets an 11-card Hand and an 11-card Foot.</li><li>Start your turn by drawing 2 cards or taking the discard pile.</li><li>To take the pile, you need two natural cards matching the top discard, or an existing meld of that rank.</li><li>Melds need 3 to 7 cards of the same rank. Natural cards must outnumber wilds.</li><li>2s and Jokers are wild cards in this classic-style rule set.</li><li>3s cannot be melded. Red 3s are heavy penalties, black 3s can block the pile.</li><li>A 7-card meld becomes a book. Clean books have no wilds. Dirty books include wilds. Wild books are seven wild cards.</li><li>To go out, you normally need to be in your Foot and have at least one clean and one dirty book.</li><li>Opening meld minimums are 50, 90, 120, and 150 points across four rounds.</li></ul>`; }
function settingsHtml(){ return `<h2>Settings</h2><p>These options are available before dealing a new game.</p><p><strong>Recommendation:</strong> keep strict go-out and wild books enabled for a more familiar Hand and Foot experience.</p>`; }
function setupChoiceBindings(){ document.querySelectorAll('.choice-card').forEach(label=>label.addEventListener('click',()=>{ document.querySelectorAll('.choice-card').forEach(x=>x.classList.remove('selected')); label.classList.add('selected'); })); }
function init(){
  $('soloBtn').onclick=()=>{ state.mode='solo'; show('setup'); }; $('passBtn').onclick=()=>{ state.mode='pass'; show('setup'); }; $('startGameBtn').onclick=()=>startGame(state.mode==='pass'?'pass':'solo');
  $('rulesBtn').onclick=()=>openModal(rulesHtml()); $('settingsBtn').onclick=()=>openModal(settingsHtml()); $('closeModal').onclick=()=> $('modal').close();
  document.querySelectorAll('[data-view="home"]').forEach(b=>b.onclick=()=>show('home'));
  $('drawBtn').onclick=drawTwo; $('takePileBtn').onclick=takePile; $('newMeldBtn').onclick=newMeld; $('addMeldBtn').onclick=addToTargetMeld; $('discardBtn').onclick=discard; $('goOutBtn').onclick=()=>{ const p=activePlayer(); const v=canGoOut(p); if(v.ok) endRound(p); else setMessage(v.reason); };
  $('sortBtn').onclick=()=>{ sortCards(liveCards(activePlayer())); render(); }; $('hintBtn').onclick=hint; $('undoSelectionBtn').onclick=()=>{ state.selected.clear(); render(); }; $('newRoundBtn').onclick=()=>{ if(state.round<4){ state.round++; newRound(); } };
  setupChoiceBindings(); show('home');
}
init();
})();
