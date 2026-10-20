import { SKINS, HOME_MAPS, MOVES } from '../config.js';

export function skinCarousel(save, previewId, pose) {
  const item=SKINS.find(s=>s.id===previewId),owned=save.ownedSkinIds.includes(item.id),equipped=save.equippedSkinId===item.id;
  return `<div class="loadout-label">YOUR HAND / ${equipped?'EQUIPPED':owned?'OWNED PREVIEW':'LOCKED PREVIEW'}</div>
    <div class="carousel-heading"><button class="carousel-arrow" data-cycle-skin="-1" aria-label="Previous hand skin">‹</button><h3>${item.name}</h3><button class="carousel-arrow" data-cycle-skin="1" aria-label="Next hand skin">›</button></div>
    <p class="skin-description">${item.description}</p>
    <div class="skin-carousel" role="group" aria-label="Preview hand skins">${SKINS.map(s=>`<button class="skin-thumb ${s.id===previewId?'selected':''}" data-preview-skin="${s.id}" aria-label="Preview ${s.name}${save.ownedSkinIds.includes(s.id)?', owned':', locked'}" aria-pressed="${s.id===previewId}"><canvas data-icon="rock" data-skin="${s.id}" width="42" height="52" aria-hidden="true"></canvas><span>${save.equippedSkinId===s.id?'EQUIPPED':save.ownedSkinIds.includes(s.id)?'OWNED':s.price+' G'}</span></button>`).join('')}</div>
    <div class="pose-picker" role="group" aria-label="Preview hand pose">${MOVES.map(m=>`<button data-pose="${m}" aria-pressed="${m===pose}">${m.toUpperCase()}</button>`).join('')}</div>
    <button class="pixel loadout-equip" ${equipped||!owned&&save.coins<item.price?'disabled':''} data-${owned?'equip':'buy'}="${item.id}">${equipped?'EQUIPPED':owned?'EQUIP HAND':save.coins>=item.price?`UNLOCK · ${item.price} G`:`NEED ${item.price-save.coins} MORE`}</button>
    <p class="cosmetic-note">Cosmetics only. Your moves make the difference.</p>`;
}
export function mapCards(save) {
  return HOME_MAPS.map(map=>{
    const owned=save.ownedMapIds.includes(map.id),equipped=save.equippedMapId===map.id;
    return `<article class="map-card" style="--map-accent:${map.accent}"><canvas data-map-preview="${map.id}" width="640" height="360" role="img" aria-label="${map.name} environment preview"></canvas><h3>${map.name}</h3><p>${map.description}</p><span class="map-price">${owned?'OWNED':map.price.toLocaleString()+' GO COINS'}</span><button class="pixel" data-${owned?'equip-map':'buy-map'}="${map.id}" ${equipped||!owned&&save.coins<map.price?'disabled':''}>${equipped?'EQUIPPED':owned?'EQUIP MAP':save.coins>=map.price?'UNLOCK MAP':`NEED ${(map.price-save.coins).toLocaleString()} MORE`}</button></article>`;
  }).join('');
}
