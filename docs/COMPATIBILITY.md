# Compatibilidade — sistema CPR e Foundry

Alvo: Foundry 12.343 + `cyberpunk-red-core` v0.92.4 (instalados em
`%LOCALAPPDATA%\FoundryVTT\Data`). Mesmo alvo do Character Panel e do Netrunner HUD.

Legenda: **Lido** = conferido no código do sistema em 2026-11-17, ainda sem execução;
**Testado** = conferido em execução no Foundry; **A verificar** = prova pendente.
Fatos já testados pelo Character Panel estão em
`D:\Desenvolvimento\cyberpunk-character-panel\docs\COMPATIBILITY.md` (rolagens por
`sheet._onRoll` com evento sintético, hooks de ator e item, Death Save).

Provas da E0-04 (2026-11-17): servidor 12.343 local, mundo `cyberdeck-hud`, edição pública
0.0.1, usuários Gamemaster e Runner Teste em abas separadas do navegador embutido, código
executado no console de cada cliente. Documentos de prova no mundo: cena "CCK Teste —
Provas" (grade 100 px = 2 m) e atores "CCK Teste — Atirador" (personagem do Runner Teste,
Very Heavy Pistol, Handgun 4, REF 6) e "CCK Teste — PdM" (mook só do mestre, Kevlar corpo
SP 7, 40 PV).

## Pipeline de rolagem do sistema

| Fato | Estado | Onde |
|---|---|---|
| Tipos de rolagem: `attack`, `aimed`, `autofire`, `suppressive`, `damage`, `interfaceAbility`, `cyberdeckProgram`, `stat`, `skill` etc. | Lido | `modules/rolls/cpr-rolls.js` (`rollTypes`) |
| Classes `CPRAttackRoll`, `CPRAimedAttackRoll`, `CPRAutofireRoll`, `CPRSuppressiveFireRoll`, `CPRDamageRoll` (local, `isAutofire`, multiplicador) | Lido | `cpr-rolls.js` |
| Ataque nativo sem a ficha: `item.createRoll("attack", actor)` → `roll.handleRollDialog(event, actor, item)` → `item.confirmRoll(roll)` → `roll.roll()` → `roll.entityData = {actor, token, item, tokens}` → `CPRChat.RenderRollCard(roll)` gera o card igual ao da ficha ("Attack 13 = REF 6 + Handgun 4 + d10") | Testado (jogador) | `cpr-actor-sheet.js` (~l. 508–665), `chat/cpr-chat.js` |
| `CPRChat` e `CPRSystemUtils` não estão em `game`; carregam por `import("/systems/cyberpunk-red-core/modules/chat/cpr-chat.js")` e `.../utils/cpr-systemUtils.js` (export default) | Testado | — |
| `handleRollDialog` pula o diálogo com `event.ctrlKey` (invertido pelo ajuste `invertRollCtrlFunction` só quando `event.type === "click"`); sem Ctrl abre `CPRRollDialog` | Testado | `cpr-rolls.js` (~l. 261) |
| `_createAttackRoll` exige o item de perícia da arma (`weaponSkill`) no ator; sem ele lança `TypeError` | Testado | `cpr-attackable.js` (~l. 92) |
| Sem munição o sistema só avisa (`Rules.lawyer`, "out of bullets") e rola assim mesmo; `confirmRoll` desconta sem ficar negativo. O módulo precisa checar munição antes | Testado (pente 0) e Lido | `cpr-attackable.js` (~l. 266), `dischargeItem` |
| O card de **ataque** não mostra os alvos; `entityData.tokens` só aparece no card de **dano** ("Apply damage to the following token(s)") com links `applyDamage` por token (`data-scope="local"`) e um global | Testado | `templates/chat/cpr-damage-rollcard.hbs` |
| Dano: `item.createRoll("damage", actor, {damageType: "attack"})` → `CPRDamageRoll` (fórmula da arma, `location` `body`, `bonusDamage` 5 só aplicado em crítico) | Testado | — |
| Diálogo de modificadores e LUCK é o `cpr-roll-dialog` do sistema | Testado (painel e E0-04) | — |
| A ficha desconta LUCK depois da rolagem (`roll.luck`); quem rola fora da ficha precisa fazer o mesmo (`src/integrations/cpr/attack-adapter.ts`) | Lido e implementado | `cpr-actor-sheet.js` (~l. 640) |
| Defesa: o item de perícia `Evasion` com `createRoll("skill", actor)` gera o card nativo "Evasion Skill = DEX + Evasion + d10" com o diálogo de LUCK | Testado (mestre e jogador) | — |
| `createRoll("damage", …)` preenche `rollCardExtraArgs` (`ablationValue` 1 por padrão ou da munição, `ammoType`, `ammoVariety`, `ignoreArmorPercent` e `ignoreBelowSP` da arma); são os mesmos valores dos links "apply damage" do card | Lido e testado | `cpr-attackable.js` (~l. 318–341) |
| Arma branca do sistema ("Medium Melee") traz `ignoreArmorPercent: 50`; o card nativo leva `data-ignore-armor-percent="50"` | Testado | — |

## Dano e armadura

| Fato | Estado | Onde |
|---|---|---|
| `actor._applyDamage(damage, bonusDamage, location, ablation, ammoVariety, ignoreArmorPercent, ignoreBelowSP, damageLethal, formData)` aplica armadura, ablação, escudo, local (`head`, `body`, `brain`) e reduções; não retorna valor, publica o card "Damage Dealt To" | Testado: 20 contra SP 7 → 13 PV, ablação 1 | `modules/actor/cpr-actor.js` (~l. 1299) |
| `formData` precisa existir (`{damageReductionRole, damageReductionAE, useShield}`) | Testado | — |
| `actor._reverseDamage(hpReduction, location, ablation, shieldAblation)` desfaz PV e ablação | Testado: 27 → 40 PV, ablação 1 → 0 | `cpr-actor.js` (~l. 1544) |
| Jogador chamando `_applyDamage` num ator que não possui: se o dano não passa a armadura, **publica o card** sem alterar nada; se passa, lança `Error: User … lacks permission to update Actor` e mostra notificação de erro | Testado | Por isso o executor do mestre (D04) |
| Card de dano nativo aplica a tokens **selecionados** ou ao ator local (`data-scope="local"`), com prompt de reduções | Lido | `cpr-chat.js` `damageApplication` (~l. 456–600) |
| Criar itens "core" (perícias) num ator por `createEmbeddedDocuments` é filtrado pelo sistema; só passa com `{cprIsMigrating: true}` (usado apenas para montar o ator de prova) | Testado | `cpr-actor.js` (~l. 192) |

## Conteúdo do sistema (compêndios)

| Fato | Estado |
|---|---|
| Itens do livro base: `core_weapons`, `core_weapons-branded`, `core_armor`, `core_ammo`, `core_cyberware`, `core_gear`, `core_programs`, `core_drugs`, `core_critical-injuries-body`, `core_critical-injuries-head`, roles, skills, upgrades, veículos | Lido (`system.json`) |
| Tabelas de DV: compêndio do ajuste `cyberpunk-red-core.dvRollTableCompendium` (padrão `internal_dv-tables`, 13 `RollTable` como "DV Pistol", "DV SMG (Autofire)"); a arma guarda o nome em `system.dvTable`; resultados de texto com `range` em metros e texto `"13"`…`"30"` ou `"N/A"`; `table.getResultsForRoll(metros)` devolve a faixa | Testado: 20 m com pistola → DV 20 |
| Tabelas `internal_critical-injury-tables`, `internal_net-rolltables` | Lido |
| DLCs oficiais (Black Chrome, Hornet's Pharmacy, Elflines etc.) | Lido |
| Itens do CEMK e Quickhacks **não** estão no sistema | Lido (nenhum pacote com esse conteúdo) |
| Item do tipo `gear` serve de contêiner para Quickhack (técnica do PneumaQuickHack) | Lido em PneumaQuickHack; documento `gear` lido de compêndio do módulo como `CPRGearItem` (abaixo); flag a verificar em E5 |

## Foundry V12

| Fato | Estado |
|---|---|
| Sistema não dispara hooks próprios de combate; não há API pública de ataque (`game.cpr.api` só tem `empableItems`) | Lido |
| Clique direito em token: o `MouseInteractionManager` só chama `Token#_onClickRight` se `_canHUD(user)` (dono ou mestre). Jogador em token alheio: nada acontece (sem HUD). Mestre: HUD abre também com Alt | Testado |
| Interceptar sem tocar no Foundry: ouvinte `pointerdown` em captura em `canvas.app.view`, `button === 2`, `canvas.canvasCoordinatesFromClient` e `token.bounds.contains(x, y)` identifica o token e `altKey`. Jogador e mestre testados; impedir o HUD no Alt fica para a tarefa do menu | Testado |
| `game.socket` com `"socket": true`: `game.socket.on("module.cyberpunk-combat-kit", (data, senderId) => …)` recebe o id do usuário que enviou como segundo argumento; ida e volta jogador → mestre → jogador funcionou e o card de dano saiu como autor Gamemaster | Testado |
| Mudança de `module.json` exige reiniciar o mundo | Testado |
| `canvas.grid.measurePath([a, b])` → `{distance, spaces, cost}` em unidades da cena (10 quadrados = 20 m); `measureDistance` também existe | Testado |
| `token.center` acompanha a animação de movimento: medir logo depois de mover deu 7,5 m em vez de 6 m. Usar `document.x/y/width/height` × `canvas.grid.size` | Testado (E1) |
| `foundry.applications.api.DialogV2.wait({window, content, buttons, rejectClose: false})` devolve a `action` do botão ou `null` ao fechar | Testado (E1) |
| `MeasuredTemplate` (`circle`, `cone`, `rect`) criado pelo jogador ou mestre (`TEMPLATE_CREATE` liberado a todos os papéis no mundo de teste); quem está dentro: `template.object._computeShape().contains(cx - doc.x, cy - doc.y)`. `object.shape` só existe depois do próximo quadro de render. O cone inclui o token no vértice: o atacante precisa ser excluído | Testado (mestre) |
| `foundry.audio.AudioHelper.play({src, volume, autoplay, loop}, false)` toca localmente (`Sound`); antes do primeiro gesto do usuário `game.audio.locked` é `true` e a promessa espera o desbloqueio | Testado |
| Sprite PIXI: `loadTexture(src)` + `new PIXI.Sprite(tex)` em `canvas.interface` aparece sobre o token; remover com `removeChild` + `destroy` | Testado |
| Compêndio do módulo: pacote declarado em `packs` sem pasta no disco **não** é criado pelo Foundry (erro "Failed to connect to database" e pacote ausente de `game.packs`); uma pasta LevelDB com chave `!items!<id>` gravada por `classic-level` carrega como compêndio travado e o documento vira `CPRGearItem`. O build pessoal precisa gerar o LevelDB (P-03) | Testado |
| Sequencer (módulo opcional) detectável por `game.modules.get("sequencer")?.active` | Testado: `undefined` quando não instalado (não instalado no Foundry local) |
| Aba do navegador oculta não pinta quadros: animações e fechamento de diálogos do CPR não terminam (igual ao Netrunner HUD) | Testado |

## Character Panel

| Fato | Estado |
|---|---|
| API v1 planejada (`ccpReady`, `getSubject`, `registerSlot`, `getPalette`, hooks) | Proposta no painel (D12); **não implementada** — tarefa E6-01 do painel |
