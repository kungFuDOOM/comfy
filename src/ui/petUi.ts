// Pet companion UI: adopt (kitten or puppy, coat, name), the pet panel (look, rename, dress), the boutique's Pet rack,
// and the little "pet card" that pops up after a pat. All pet-only: nothing here touches the player's wardrobe.
import { petPortrait } from '../art/petArt';
import { bus } from '../bus';
import { adoptPet, buyPetItem, getPetPose, hasPet, petNear, petOwns, petThePet, renamePet, takeOffPetItem, wearPetItem } from '../pet';
import { cleanPetName, PET_COATS, PET_ITEMS, PET_KINDS, PET_NAME_MAX, petItemById, type PetKind, type PetSlot } from '../petData';
import { state } from '../state';
import { CURRENCY } from '../data';
import { btn, closePanel, h, isPanelOpen, openPanel, type PanelApi } from './dom';
import { sceneActive } from '../render/stage';
import './pet.css';

/** The boutique's try-on: an item previewed on the portrait (not owned, not saved). */
let trial: string | null = null;
export const clearPetTrial = () => { trial = null; };

const SLOT_LABEL: Record<PetSlot, string> = { head: 'Head', body: 'Cozy wear' };

/** A big, phone-friendly text field. Enter confirms; the game's hotkeys ignore it while it has focus. */
function nameField(initial: string, onInput: (v: string) => void, onEnter: () => void): { wrap: HTMLElement; input: HTMLInputElement } {
  const input = h('input', 'pet-input');
  input.type = 'text';
  input.value = initial;
  input.maxLength = PET_NAME_MAX; // what she types is what she gets (cleanPetName also caps it)
  input.placeholder = 'Type a name…';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.enterKeyHint = 'done';
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('aria-label', 'Pet name');
  // deliberately NOT in the panel focus ring (no tabindex): auto-focusing it on open would pop the phone keyboard
  // and swallow hotkeys. Gamepad players get the "Suggest a name" button instead.
  input.addEventListener('input', () => onInput(input.value));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); onEnter(); } });
  const wrap = h('div', 'pet-field', h('label', '', `Name (up to ${PET_NAME_MAX} letters)`), input);
  return { wrap, input };
}

// A few original suggestions, so a gamepad-only player (no keyboard) can still name her friend.
const NAME_IDEAS = ['Mochi', 'Biscuit', 'Peaches', 'Dumpling', 'Clover', 'Sprinkle', 'Puffin', 'Marshmallow', 'Tofu', 'Pudding', 'Bean', 'Truffle'];

// ---------- adoption ----------
export function openAdopt() {
  if (state.pet) { openPetPanel(); return; }
  let kind: PetKind = 'kitten', coat = PET_COATS[0].id, name = '';
  openPanel('Pet Nook', (body, api) => {
    const err = h('div', 'pet-err');
    const go = h('button', 'btn') as HTMLButtonElement;
    const check = (showErr: boolean) => {
      const ok = cleanPetName(name).length > 0;
      go.disabled = !ok;
      err.textContent = !ok && showErr ? 'Every friend needs a name first ♡' : '';
      return ok;
    };
    const submit = () => {
      if (!check(true)) return;
      if (adoptPet(kind, name, coat)) closePanel();
    };
    body.append(
      h('div', 'muted', 'A basket of warm blankets is waiting by the wardrobe. Who will curl up in it?'),
      h('div', 'pet-hero', petPortrait(kind, coat, null, null, 140), h('div', 'pet-sub', PET_KINDS.find((k) => k.id === kind)!.blurb)),
      h('div', 'pet-choices', ...PET_KINDS.map((k) => btn(k.label, () => { kind = k.id; api.rerender(); }, 'pet-pick' + (kind === k.id ? ' on' : '')))),
      h('div', 'pet-coats', ...PET_COATS.map((c) => {
        const b = h('button', 'pet-coat' + (coat === c.id ? ' on' : ''));
        b.style.background = `linear-gradient(135deg, ${c.body} 60%, ${c.accent})`;
        b.title = c.label; b.setAttribute('aria-label', c.label);
        b.addEventListener('click', () => { coat = c.id; api.rerender(); });
        return b;
      })),
    );
    const f = nameField(name, (v) => { name = v; check(false); }, submit);
    const idea = btn('✿ Suggest a name', () => {
      const pool = NAME_IDEAS.filter((n) => n !== name);
      name = pool[Math.floor(Math.random() * pool.length)];
      f.input.value = name; check(false);
    }, 'small ghost');
    body.append(f.wrap, idea, err);
    go.className = 'btn';
    go.append('Adopt ♡');
    go.addEventListener('click', (e) => { e.stopPropagation(); submit(); });
    body.append(h('div', 'pet-actions', btn('Not yet', () => closePanel(), 'ghost'), go));
    check(false);
  });
}

// ---------- pet panel (look, rename, dress) ----------
export function openPetPanel() {
  const p = state.pet;
  if (!p) { openAdopt(); return; }
  openPanel(`${p.name}'s Corner`, (body, api) => {
    renderPetBody(body, api, false);
    // keep the window title in step with a rename
    const t = body.parentElement?.querySelector('.panel-title');
    if (t && state.pet) t.textContent = `${state.pet.name}'s Corner`;
  });
}

/** The pet's dressing list. `shop` = the boutique rack (everything for sale, try-on, buy); otherwise just what she owns. */
export function renderPetBody(body: HTMLElement, api: PanelApi, shop: boolean) {
  const p = state.pet;
  if (!p) {
    body.append(h('div', 'muted', 'You have not met your little friend yet. Visit the Pet Nook beside your wardrobe at home to adopt a kitten or a puppy ♡'));
    return;
  }
  const tried = shop ? petItemById(trial) : undefined;
  const headId = tried?.slot === 'head' ? tried.id : p.worn.head;
  const bodyId = tried?.slot === 'body' ? tried.id : p.worn.body;
  const kindLabel = PET_KINDS.find((k) => k.id === p.kind)!.label;
  body.append(h('div', 'pet-hero', petPortrait(p.kind, p.coat, headId, bodyId, 140), h('div', 'pet-title', p.name), h('div', 'pet-sub', `${kindLabel} · ${PET_COATS.find((c) => c.id === p.coat)?.label ?? ''}`)));

  if (!shop) {
    // rename
    const err = h('div', 'pet-err');
    let draft = p.name;
    const save = () => {
      if (!cleanPetName(draft)) { err.textContent = 'A name cannot be empty ♡'; return; }
      if (renamePet(draft)) api.rerender();
    };
    const f = nameField(p.name, (v) => { draft = v; err.textContent = ''; }, save);
    body.append(f.wrap, err, h('div', 'pet-actions', btn('Save name', save)));
  }

  // what is worn now
  for (const slot of ['head', 'body'] as PetSlot[]) {
    const worn = petItemById(p.worn[slot]);
    body.append(h('div', 'pet-row', h('div', 'txt', h('b', '', SLOT_LABEL[slot]), h('span', '', worn ? worn.name : 'Nothing yet')),
      worn ? btn('Take off', () => { takeOffPetItem(slot); api.rerender(); }, 'small ghost') : null));
  }

  const list = shop ? PET_ITEMS : PET_ITEMS.filter((i) => petOwns(i.id));
  body.append(h('div', 'muted', shop ? 'Pet accessories — only for your little friend. Tap Try to preview.' : list.length ? 'Tap to put something on, or take it off.' : 'No pet clothes yet. The Pet rack at Spot & Bow Boutique has bows, hats and sweaters.'));
  for (const it of list) {
    const owned = petOwns(it.id), on = p.worn[it.slot] === it.id;
    const sw = h('div', 'swatch');
    sw.style.background = `linear-gradient(135deg, ${it.c1} 60%, ${it.c2})`;
    const act = owned
      ? btn(on ? 'Take off' : 'Wear', () => { wearPetItem(it.id); api.rerender(); }, on ? 'ghost' : '')
      : btn(`${it.price} ${CURRENCY}`, () => { trial = null; if (buyPetItem(it.id)) api.rerender(); });
    body.append(h('div', 'pet-row' + (on ? ' on' : ''), sw,
      h('div', 'txt', h('b', '', it.name), h('span', '', `${SLOT_LABEL[it.slot]} · ${it.blurb}`)),
      shop && !owned ? btn('Try', () => { trial = trial === it.id ? null : it.id; api.rerender(); }, 'small ghost') : null,
      act));
  }
}

// ---------- the pet card (after a pat) ----------
let card: HTMLElement | null = null, cardTimer = 0;
export function showPetCard() {
  const p = state.pet;
  if (!p || !hasPet()) return;
  hidePetCard();
  const c = h('div', 'pet-card', petPortrait(p.kind, p.coat, p.worn.head, p.worn.body, 44), h('b', '', p.name),
    btn('Pet ♡', () => {
      if (isPanelOpen() || sceneActive()) { hidePetCard(); return; } // never pat through a window or a cutscene
      if (petNear(60)) petThePet(); else bus.emit('toast', `${p.name} is a little too far away.`);
    }, 'small'),
    btn('Dress up', () => { hidePetCard(); if (!isPanelOpen()) openPetPanel(); }, 'small ghost'));
  document.getElementById('ui')!.append(c);
  card = c;
  cardTimer = window.setTimeout(hidePetCard, 7000);
}
export function hidePetCard() {
  window.clearTimeout(cardTimer);
  card?.remove();
  card = null;
}

/** Wire the pat -> card flow. Called once from game.ts. */
export function initPetUi() {
  bus.on('petPetted', () => { if (getPetPose()) showPetCard(); });
  bus.on('petAdopted', () => hidePetCard());
}
