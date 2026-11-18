# Compatibilidade — sistema CPR e Foundry

Alvo: Foundry 12.343 + `cyberpunk-red-core` v0.92.4 (instalados em
`%LOCALAPPDATA%\FoundryVTT\Data`). Mesmo alvo do Character Panel e do Netrunner HUD.

Legenda: **Lido** = conferido no código do sistema em 2026-11-17, ainda sem execução;
**Testado** = conferido em execução no Foundry; **A verificar** = prova pendente (E0-02).
Fatos já testados pelo Character Panel estão em
`D:\Desenvolvimento\cyberpunk-character-panel\docs\COMPATIBILITY.md` (rolagens por
`sheet._onRoll` com evento sintético, hooks de ator e item, Death Save).

## Pipeline de rolagem do sistema

| Fato | Estado | Onde |
|---|---|---|
| Tipos de rolagem: `attack`, `aimed`, `autofire`, `suppressive`, `damage`, `interfaceAbility`, `cyberdeckProgram`, `stat`, `skill` etc. | Lido | `modules/rolls/cpr-rolls.js` (`rollTypes`) |
| Classes `CPRAttackRoll`, `CPRAimedAttackRoll`, `CPRAutofireRoll`, `CPRSuppressiveFireRoll`, `CPRDamageRoll` (local, `isAutofire`, multiplicador) | Lido | `cpr-rolls.js` |
| Arma cria rolagens por `item.createRoll(type, actor, info)` → `_createAttackRoll` / `_createDamageRoll` (mixin `cpr-attackable`); confirma com `item.confirmRoll(roll)` | Lido | `modules/item/mixins/cpr-attackable.js`, `actor/sheet/cpr-actor-sheet.js` (~l. 517–629) |
| A ficha manda ataque pelo `_onRoll` com `data-roll-type` e `data-item-id`; o card leva `entityData.tokens` = tokens **alvo** do usuário | Lido | `cpr-actor-sheet.js`, `chat/cpr-chat.js` (~l. 347) |
| Diálogo de modificadores e LUCK é o `cpr-roll-dialog` do sistema | Testado (painel) | — |

## Dano e armadura

| Fato | Estado | Onde |
|---|---|---|
| `actor._applyDamage(damage, bonusDamage, location, ablation, ammoVariety, ignoreArmorPercent, ignoreBelowSP, damageLethal, formData)` aplica armadura, ablação, escudo, local (`head`, `body`, `brain`) e reduções | Lido | `modules/actor/cpr-actor.js` (~l. 1299) |
| `actor._reverseDamage(hpReduction, location, ablation, shieldAblation)` desfaz | Lido | `cpr-actor.js` (~l. 1544) |
| Card de dano nativo aplica a tokens **selecionados** (`getUserTargetedOrSelected("selected")`) ou ao ator local (`data-scope="local"`), com prompt de reduções | Lido | `cpr-chat.js` `damageApplication` (~l. 456–600) |
| Jogador não pode chamar `_applyDamage` em ator que não possui (permissão de documento) | A verificar | E0-02: executor do mestre |
| Ablação da armadura ao acertar | Lido | `_ablateArmor` em `cpr-actor.js` |

## Conteúdo do sistema (compêndios)

| Fato | Estado |
|---|---|
| Itens do livro base: `core_weapons`, `core_weapons-branded`, `core_armor`, `core_ammo`, `core_cyberware`, `core_gear`, `core_programs`, `core_drugs`, `core_critical-injuries-body`, `core_critical-injuries-head`, roles, skills, upgrades, veículos | Lido (`system.json`) |
| Tabelas: `internal_dv-tables`, `internal_critical-injury-tables`, `internal_net-rolltables` | Lido |
| DLCs oficiais (Black Chrome, Hornet's Pharmacy, Elflines etc.) | Lido |
| Itens do CEMK e Quickhacks **não** estão no sistema | Lido (nenhum pacote com esse conteúdo) |
| Item do tipo `gear` serve de contêiner para Quickhack (técnica do PneumaQuickHack) | Lido em PneumaQuickHack; a verificar aqui |

## Foundry V12

| Fato | Estado |
|---|---|
| Sistema não dispara hooks próprios de combate; não há API pública de ataque (`game.cpr.api` só tem `empableItems`) | Lido |
| Botão direito em token não possuído não abre o Token HUD para jogador; precisamos interceptar o clique direito do token sem quebrar o HUD do dono/mestre | A verificar (E0-02) |
| `game.socket` com `"socket": true` no manifesto; mudança de `module.json` exige relançar o mundo | Conhecido do Netrunner HUD |
| `MeasuredTemplate` para áreas (cone, círculo, quadrado) e `canvas.grid.measurePath` para distância | A verificar |
| `foundry.audio.AudioHelper.play` para sons por cliente | A verificar |
| Sequencer (módulo opcional) detectável por `game.modules.get("sequencer")?.active` | A verificar; não instalado no Foundry local |
| Compêndio próprio do módulo em LevelDB gerado por `@foundryvtt/foundryvtt-cli` | A verificar (P-03) |

## Character Panel

| Fato | Estado |
|---|---|
| API v1 planejada (`ccpReady`, `getSubject`, `registerSlot`, `getPalette`, hooks) | Proposta no painel (D12); **não implementada** — tarefa E6-01 do painel |
