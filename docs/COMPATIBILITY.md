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
| Tiro mirado: `createRoll("aimed")` → `CPRAimedAttackRoll` com −8 e `roll.location` (`head`, `heldItem`, `leg`) ajustável antes do diálogo; dano `createRoll("damage", actor, {damageType: "aimed"})` com o mesmo `location`; o `_applyDamage` dobra só `head` | Testado (cabeça 14 → 28 PV; perna no corpo) | `cpr-attackable.js`, `cpr-rolls.js` |
| Fogo automático: `createRoll("autofire")` usa a perícia Autofire e gasta 10 balas; dano `damageType: "autofire"` vira 2d6 e multiplica por `roll.autofireMultiplier` (preenchido antes do diálogo), limitado por `autofireMultiplierMax` (da arma; padrão 3 SMG, 4 fuzil quando a ficha traz 0; munição pode alterar) | Testado (×4 com tabela "DV Assault Rifle (Autofire)") | `cpr-rolls.js` `configureAutofire` |
| Supressivo: `createRoll("suppressive")` usa Autofire e gasta 10 balas; `fireModes.suppressiveFire` diz se a arma permite | Testado | `cpr-loadable.js` `bulletConsumption` |
| Munição carregada: `item._getLoadedAmmoProp("variety")` (`shotgunShell`, `grenade`, `rocket`…); granadas são munição da arma "Thrown Weapon" (Athletics, "DV Thrown Weapon") ou do lança-granadas; o cartucho de espingarda troca o dano para 3d6 pela própria munição. Carregar por código: `weapon.installItems([ammo])` + `weapon.reload()` | Testado | `cpr-loadable.js` |
| Armas "Unarmed" (Brawling, `ignoreArmorPercent` 0) e "Martial Arts" (50) existem no compêndio; o dano vem do BODY pelo próprio sistema | Testado (Briga 2d6 com BODY 6; Artes Marciais com "Armor Ignored: 50%") | `getWeaponDamage` |
| Diálogo de dano nativo: título "Rolling damage for '…'"; o de perícia/ataque: "Rolling for '…'" | Testado | — |

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
| Interceptar sem tocar no Foundry: ouvinte `pointerdown` em captura em `canvas.app.view`, `button === 2`, `canvas.canvasCoordinatesFromClient` e `token.bounds.contains(x, y)` identifica o token e `altKey`. Jogador e mestre testados | Testado |
| O HUD abre já no `pointerdown` do botão direito (`MouseInteractionManager#handleRightDown` → `Token#_onClickRight`, que também seleciona o token). Ouvinte `pointerdown` em captura no `document` com `stopImmediatePropagation` quando `event.target === canvas.app.view` impede HUD, seleção e arrasto do mapa. `token.setTarget(bool, {releaseOthers, groupSelection})` e `token.isTargeted` funcionam para jogador em token alheio. `token.document.displayName` 30/50 = nome visível a todos | Testado (E2, mestre com mouse real; jogador com evento sintético) |
| `game.socket` com `"socket": true`: `game.socket.on("module.cyberpunk-combat-kit", (data, senderId) => …)` recebe o id do usuário que enviou como segundo argumento; ida e volta jogador → mestre → jogador funcionou e o card de dano saiu como autor Gamemaster | Testado |
| Mudança de `module.json` exige reiniciar o mundo | Testado |
| `canvas.grid.measurePath([a, b])` → `{distance, spaces, cost}` em unidades da cena (10 quadrados = 20 m); `measureDistance` também existe | Testado |
| `token.center` acompanha a animação de movimento: medir logo depois de mover deu 7,5 m em vez de 6 m. Usar `document.x/y/width/height` × `canvas.grid.size` | Testado (E1) |
| `foundry.applications.api.DialogV2.wait({window, content, buttons, rejectClose: false})` devolve a `action` do botão ou `null` ao fechar | Testado (E1) |
| Efeito ativo com modificador do CPR precisa de `flags["cyberpunk-red-core"].changes = {cats: [categoria], situational: [{isSituational, onByDefault}]}` por mudança; sem isso `CPRMod` lança `TypeError` em qualquer rolagem do ator. `bonuses.allActions` (categoria `misc`) aparece como "Total Mods: −2" | Testado (E3) |
| `actor.toggleStatusEffect("prone" \| "unconscious", {active})` funciona com os status do Foundry no CPR | Testado (E3) |
| Template `rect` com `distance` = diagonal e `direction` 45 desenha o quadrado de 10 m; jogador cria template sem pedir ao mestre | Testado (E3, jogador) |
| `MeasuredTemplate` (`circle`, `cone`, `rect`) criado pelo jogador ou mestre (`TEMPLATE_CREATE` liberado a todos os papéis no mundo de teste); quem está dentro: `template.object._computeShape().contains(cx - doc.x, cy - doc.y)`. `object.shape` só existe depois do próximo quadro de render. O cone inclui o token no vértice: o atacante precisa ser excluído. Na E3 a explosão usa conta própria do quadrado (`src/domain/area.ts`), sem depender do render | Testado (mestre; jogador na E3) |
| Pré-visualização local de área: `new CONFIG.MeasuredTemplate.documentClass(data, {parent: scene})` + `new CONFIG.MeasuredTemplate.objectClass(doc)` em `canvas.templates.preview`, `await draw()`, depois `doc.updateSource(data)` + `renderFlags.set({refresh: true})`; ouvintes em captura no `canvas.app.view` (`pointermove`, `pointerdown`, `contextmenu`) e Esc no `window`; ponto do mundo por `canvas.stage.worldTransform.applyInverse`. Não cria documento na cena | Testado (E3, jogador e mestre) |
| Template `ray` com `width` desenha a faixa do cartucho; `circle` com `distance` = raio | Testado (E3) |
| Linha de visão por paredes: `CONFIG.Canvas.polygonBackends.sight.testCollision(a, b, {type: "sight", mode: "any"})` devolve `true` quando uma parede bloqueia | Testado (E3: parede entre dois alvos tirou o de trás do supressivo e do cartucho) |
| `canvas.grid.getCenterPoint(point)` dá o centro do quadrado (V12) | Testado (E3) |
| `foundry.audio.AudioHelper.play({src, volume, autoplay, loop}, false)` toca localmente (`Sound`); antes do primeiro gesto do usuário `game.audio.locked` é `true` e a promessa espera o desbloqueio | Testado |
| Sprite PIXI: `loadTexture(src)` + `new PIXI.Sprite(tex)` em `canvas.interface`; remover com `removeChild` + `destroy`. `canvas.interface` ordena os filhos por `zIndex` (camadas de 0 a 1100): com `zIndex` 0 o efeito fica **escondido atrás da arte do token**; com 950 fica por cima (contagem de pixels na E4) | Testado (E4) |
| `game.audio.interface` (V12) só existe depois do primeiro gesto do usuário: é um `AudioContext` com `gainNode` que aplica o volume de interface; antes disso `game.audio.locked` é `true` | Testado (E4) |
| `canvas.visibility.testVisibility(ponto)` devolve `false` para jogador em cena **sem** visão de token (`tokenVision` falso), mesmo com o token visível; checar `tokenVision` antes | Testado (E4, Runner) |
| `canvas.app.ticker.add/remove` anima PIXI; ticker com `maxFPS` só chama ouvintes quando o tempo avança | Testado (E4) |
| Compêndio do módulo: pacote declarado em `packs` sem pasta no disco **não** é criado pelo Foundry (erro "Failed to connect to database" e pacote ausente de `game.packs`); uma pasta LevelDB com chave `!items!<id>` gravada por `classic-level` carrega como compêndio travado e o documento vira `CPRGearItem`. O build pessoal precisa gerar o LevelDB (P-03) | Testado |
| Sequencer (módulo opcional) detectável por `game.modules.get("sequencer")?.active` | Testado: `undefined` quando não instalado (não instalado no Foundry local) |
| Aba do navegador oculta não pinta quadros: animações e fechamento de diálogos do CPR não terminam (igual ao Netrunner HUD) | Testado |

## Character Panel

| Fato | Estado |
|---|---|
| API v1 planejada (`ccpReady`, `getSubject`, `registerSlot`, `getPalette`, hooks) | Proposta no painel (D12); **não implementada** — tarefa E6-01 do painel |
| `game.settings.registerMenu` exige `type` subclasse de `FormApplication` ou `ApplicationV2` (uma classe simples lança erro e interrompe o resto do `init`); subclasse de `foundry.applications.api.ApplicationV2` com `render()` próprio abre a janela do módulo | Testado (E5) |
| `DialogV2.wait({render})`: o callback recebe `(event, element)` a cada render; o conteúdo pode ser montado e atualizado por DOM dentro dele. `position.height` fixo esconde os botões quando o conteúdo é longo: limitar a altura do conteúdo por CSS | Testado (E5) |
| `new FilePicker({type: "folder" \| "audio", current, callback(path, app)})`: em modo pasta o botão vira "Select Directory" e devolve a pasta navegada; `app.activeSource` é `"data"` (dados do usuário) ou `"public"` (núcleo, ex.: `sounds/lock.wav`); fechar sem escolher dispara o hook `closeFilePicker` sem chamar o callback. O FilePicker abre por cima do DialogV2 | Testado (E5) |
| Ajuste de mundo `type: Object` com `onChange`: `game.settings.set` pelo mestre dispara o `onChange` no próprio cliente e o valor persiste após F5; `fetch(foundry.utils.getRoute(caminho))` lê arquivos da área de dados | Testado (E5, um cliente) |
