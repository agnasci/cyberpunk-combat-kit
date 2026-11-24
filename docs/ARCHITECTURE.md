# Arquitetura proposta

Status: desenho para implementação. Fatos de API em [COMPATIBILITY.md](COMPATIBILITY.md).
Diferente do Character Panel (D05 de lá: sem socket), aqui há ações sobre atores alheios,
então existe um **executor do mestre** (D04).

## Camadas

| Pasta | Responsabilidade | Restrições |
|---|---|---|
| `src/main.ts` | Hooks `init`/`ready`, ajustes, socket, composição, detecção do painel | Sem regra nem DOM |
| `src/domain/` | Funções puras: DV por alcance, resolução ataque × defesa, multiplicadores, área, regras de Quickhack, roteamento de mensagens, validação de pacotes, mapa evento → efeito | Sem `game`, `Hooks`, `canvas`, DOM, documentos |
| `src/integrations/cpr/` | Ler arma/ator em snapshots; criar rolagens nativas; aplicar dano por `_applyDamage`; tabelas de DV e lesões | Único lugar com `actor.system.*`, `item.createRoll`, `CPR.*` |
| `src/integrations/foundry/` | Tokens, distância, templates, alvo, socket, áudio, canvas/PIXI, Sequencer opcional | Único lugar com `canvas`, `game.socket`, `AudioHelper` |
| `src/integrations/panel/` | Ponte com o Character Panel (slots, hooks, paleta) | Nada de import do código do painel; só a API pública |
| `src/workflows/` | Orquestra um combate: ataque → defesa → resolução → dano → efeitos | Chama domínio e integrações; sem DOM |
| `src/effects/` | Motor de cues: recebe eventos de combate e toca efeitos (backend próprio ou Sequencer) | Respeita ajustes do cliente e movimento reduzido |
| `src/packs/` | Registro de pacotes de conteúdo (manifesto, validação, resolução de caminhos) | Validação no domínio; leitura de arquivo aqui |
| `src/ui/` | Menu rápido (botão direito), cards de resolução, importador de pacotes, configurações | Não calcula regra |
| `src/api/` | API pública (R11) | Contrato versionado |
| `private/` | Edição pessoal (fora do Git) | Nunca importado pelo build público |

## Fluxo de um ataque (R01–R03)

Implementado na E1 (tiro único à distância e arma branca; modos especiais na E3):

1. Entrada: `api.attack({weaponId?, skipDialog?})` usa o token controlado e o único alvo do
   usuário (o menu da E2 vai chamar o mesmo workflow).
2. `workflows/attack` recusa sem mestre ativo (R14) e valida arma, equipamento, munição e
   alcance (DV `N/A` = fora de alcance; corpo a corpo = até um quadrado). Distância medida
   pela posição gravada dos tokens, não pela animada.
3. O atacante rola pelo pipeline nativo (`createRoll` → `handleRollDialog` → `confirmRoll` →
   `roll` → LUCK → `RenderRollCard`, igual à ficha). Cancelar o diálogo encerra o fluxo
   antes de incomodar o defensor.
4. Se o alvo pode defender (corpo a corpo sempre; à distância com REF 8+), o jogador dono
   ativo (ou o mestre executor) recebe por socket "Esquivar / Não esquivar" (ou "Rolar
   defesa" no corpo a corpo) e rola Evasão pelo diálogo nativo. Sem resposta em 60 s: à
   distância vale a DV; no corpo a corpo o ataque fica sem resolução, com aviso.
5. Domínio resolve; acerto rola o dano nativo e o **executor do mestre** chama
   `_applyDamage` com os mesmos parâmetros do card de dano do sistema; PV e ablação antes e
   depois voltam no resultado.
6. Card de resolução próprio (flag `resolution`) com ataque, defesa, resultado, dano e
   "Desfazer dano" (mestre ou autor do card), que chama `_reverseDamage` pelo executor.
7. Eventos `cck.attack.*` para efeitos e API: E4/E8.

Modos da E3 (`src/workflows/`): `attack({weaponId?, mode?, location?, skipDialog?})` escolhe o
perfil pelo domínio (`src/domain/modes.ts`): `single`, `aimed` (+ `location`), `autofire`,
`suppressive` e `thrown`; o tipo de área sai da munição carregada (cartucho → `area.ts`
`shellAttack`; granada/foguete → `explosiveAttack`, com `detonatePending` para o mestre no
erro). Áreas (D24): `integrations/foundry/area-placement.ts` faz a pré-visualização com o
mouse, coleta os tokens (geometria pura em `domain/area.ts` + paredes) e mostra/apaga o
template; `ui/placement-hint.ts` mostra a instrução. `grapple({action})` cuida de `grab`, `choke`, `throw`, `release` e `escape`; o
executor do mestre ganhou `choke`, `throwDown`, `grappleStart` e `grappleEnd`. O card de
resolução tem uma lista de alvos, cada um com resultado, dano e "Desfazer".

## Executor do mestre (R14)

- Um único mestre ativo (o de menor id entre os ativos) executa pedidos recebidos por socket.
- Pedidos são objetos mínimos (`{type, actorUuid, args, requestId}`), validados de novo no
  mestre (permissão de quem pediu, alvo existente, valores numéricos).
- Sem mestre ativo: a ação é recusada com aviso. Mestre local executa direto.

## Menu rápido (R06)

- Clique direito sobre token **não possuído**: abre o menu do módulo no lugar do nada atual.
- Dono/mestre: mantém o Token HUD nativo; o menu abre com modificador (Alt+clique direito,
  configurável) ou pela opção "menu em tokens não selecionados" (D26).
- Itens: armas equipadas (com modos disponíveis e a DV até o alvo), mirar (cabeça, item,
  perna), marcar/desmarcar alvo, ações de agarrão quando aplicável. Netrunning (R09, E6):
  Jack In, Breach, Quickhacks, Jack Out e Force Out.
- Teclado: setas, Home/End, Enter/Espaço/→ entram, ←/Backspace/Esc voltam, Esc na raiz
  fecha; foco volta para onde estava (o canvas) ao fechar.
- Arquivos (E2): `src/domain/menu.ts` (monta o menu e decide quando abre, testado),
  `src/integrations/foundry/token-click.ts` (ouvinte em captura no `document`, acha o token,
  marca alvo), `src/ui/quick-menu.ts` (DOM e teclado), `src/workflows/quick-menu.ts` (junta
  ator, armas, DV e agarrão; chama `attack`/`grapple` com o token clicado como único alvo).
  A DV vem do mesmo `dvLookup` do ataque; as tabelas de DV do sistema são lidas uma vez e
  ficam em cache (pré-carregadas no `ready`).

## Efeitos (R07–R08)

E11: efeitos persistentes de estado (`src/workflows/status-fx.ts`) não são eventos: cada
cliente calcula, a partir de `actor.statuses` e dos efeitos ativos dos tokens da cena, quais
sprites presos deveriam existir (`persistentCues` no domínio) e cria ou remove a diferença
(`attachLoop` em `fx-canvas.ts`). Pré-carga das texturas da cena em
`src/workflows/fx-preload.ts`. Assets de outros módulos e o filtro de módulos ausentes em
`domain/pack.ts` (`withActiveModules`), aplicado em `effects/packs.ts`.

Ver [EFFECTS.md](EFFECTS.md) (seção "Como ficou na E4"). Motor de cues desacoplado: workflows emitem eventos; o motor
procura o efeito associado ao evento (pacote ativo → padrão próprio) e toca localmente em
cada cliente, sem tráfego de quadro a quadro pelo servidor.

## Quickhacks (R09)

Como ficou na E6 (decisão D28):

- Ajuste de mundo `quickhacks` (falso por padrão, recarrega o mundo). Desligado: nenhuma
  entrada no menu, nenhum hook (`combatTurnChange`, `updateToken`) e a API só avisa.
- Definições só de pacotes ativos com `kinds` contendo `quickhacks` (docs/EFFECTS.md);
  mesmo id em dois pacotes: vence o primeiro da lista. Sem pacote: o menu explica.
- Domínio `src/domain/quickhack.ts`: alcance, firewall, DV do Breach, ações NET, nível por
  rank, um por alvo por turno (chave `combate:rodada`, só com combate iniciado), alerta,
  bloqueio de 60 min (3600 s de `game.time.worldTime`), duração em rodadas, estado salvo.
- Estado na flag `net` do **token do alvo**: `{intrusions: [{runnerUuid, runnerActorUuid,
  runnerName, aware, breached, lastHack}], locks: [{runnerActorUuid, until}]}`. Só o mestre
  grava (operações `netJackIn`, `netBreach`, `netHack`, `netJackOut`, `netForceOut` do
  executor); o mestre revalida ligação, Passwalls, nível, turno e bloqueio.
- Peças no ator (`src/integrations/cpr/net-adapter.ts`): rank de Interface da função de rede
  ativa (`system.roleInfo.activeNetRole`); Neuroport e Self-ICE são cyberware instalado
  (`isInstalledInActor`) cujo nome contém os termos dos ajustes `neuroportNames` e
  `selfIceNames`, ou com a flag `cyberpunk-combat-kit.net` = `neuroport`/`selfIce`.
- Rolagens nativas: Interface pela rolagem de habilidade da função (`roleAbility`) com o
  rank forçado e título do passo; VON pela rolagem de atributo do ator; Concentração pela
  perícia. O alvo e o Netrunner respondem pelo pedido de defesa já usado no combate.
- Efeitos (no mestre): `damage` rola a fórmula e tira direto dos PV, sem armadura nem
  ablação (desfazer funciona); `ongoing` cria um efeito marcador no alvo e o dano vem no fim
  de cada turno dele até alguém apagar o efeito; `status` usa `toggleStatusEffect`;
  `criticalInjury` copia a lesão do compêndio do sistema pelo nome, sem dano bônus;
  `guided` só registra. `rounds` grava a rodada de expiração e o mestre remove o efeito ou a
  lesão quando o combate chega nela (fora de combate não expira).
- A conexão cai, com bloqueio, quando o Netrunner ou o alvo se move para fora de 25
  quadrados (hook `updateToken` no mestre, posição final da atualização).
- Mensagens: alvo sem saber → card só para o mestre e os donos do Netrunner; alvo sabendo →
  público; PdM contra PdM → só o mestre. As rolagens nativas seguem o modo de rolagem de quem
  rola.
- API: `api.quickhacks.run({action, quickhackId?, runnerUuid?, skipDialog?})` e
  `api.quickhacks.list()`.

## Integração com o Character Panel (R10)

API v1 do painel implementada na E6-01 de lá (D12 e D46 de lá, commit `f6e17c4` no
repositório do painel). Consumida só por `src/integrations/panel/panel-bridge.ts`; os slots
ficam em `src/workflows/panel-slots.ts` (E7, D29):

| Uso | Membro do painel |
|---|---|
| Descobrir o painel | `game.modules.get("cyberpunk-character-panel")?.api` e hook `ccpReady` |
| Saber o ator mostrado | `api.getSubject()` + hook `ccpSubjectChanged` |
| Arma ativa e munição no fim da barra | `registerSlot({id: "cck-weapon", region: "bar-end", ...})` |
| Atalhos de ataque | `registerSlot({id: "cck-quick", region: "quick", ...})` |
| Aba "Combate" (armas, modos, Quickhacks, agarrão) | `registerSlot({id: "cck-drawer", region: "drawer", ...})` |
| Cores coerentes | `api.getPalette()` |

Regras: o combate não lê DOM do painel; se `api.version` for diferente de 1, desliga a
integração com aviso no console. Sem painel, o módulo mostra uma barra mínima própria
(arma ativa + atalhos) opcional. O painel nunca depende deste módulo.

Como ficou na E7:

- Ponte: no `ready` lê `api` do painel ativo e também ouve `ccpReady` (a ordem de carga dos
  módulos não importa). Versão diferente de 1: aviso no console e nenhuma integração.
- Paleta: `getPalette()` na conexão e a cada `ccpRendered` grava `--cck-panel-accent` e
  `--cck-panel-soft` na raiz do documento; o menu do clique direito e os slots usam essas
  variáveis, com o laranja do Foundry como reserva sem painel.
- `cck-weapon` (`bar-end`): arma equipada e munição; clique ataca o alvo marcado no modo
  simples.
- `cck-quick` (`quick`, visível com o painel recolhido): ícones de atacar e de abrir o menu de
  combate do alvo marcado junto ao botão.
- `cck-drawer` (`drawer`, aba "Combate"): as mesmas entradas do menu do clique direito para o
  alvo marcado (`drawerSections` em `src/domain/menu.ts` achata grupos e o mirado), com DV,
  motivo de cada bloqueio e Netrunning quando ligado. Sem um alvo marcado: explica como marcar.
- Antes de agir, o token do personagem do painel é selecionado (o fluxo de ataque usa o token
  controlado). Sem token na cena: aviso.
- Atualiza (debounce de 120 ms) com `targetToken` do próprio usuário, `controlToken`,
  `updateToken` e mudanças no ator/itens do personagem mostrado.
- Sem painel não há barra própria (opcional no R10, não feita).

## API pública (R11)

`game.modules.get("cyberpunk-combat-kit").api` (congelado) + hook `cckReady`. Contrato completo
para quem consome em docs/INTEGRATION.md (E8-01, D30). Código:

- `src/api/index.ts`: monta o objeto; `version` vem de `API_VERSION` em
  `src/domain/api-input.ts`.
- `src/domain/api-input.ts`: valida o pedido de `applyDamage` (`parseDamageInput`) e escolhe o
  hook de cada card pelo `mode` (`resolutionHook`).
- `src/workflows/announce.ts`: `postResolution` posta o card e dispara `cckAttackResolved` ou
  `cckQuickhackResolved`; `announceDamage` dispara `cckDamageApplied`. Todos os fluxos postam
  por ele; `applyTo` (combat-common) e o Netrunning anunciam o dano.
- `src/workflows/direct-damage.ts`: `applyDamage` pelo executor do mestre (mesmo pedido
  `applyDamage` do socket, com a checagem de dono do atacante), card com `mode: "direct"` e
  desfazer, cue `damage.applied` com o qualificador `direct`.
- `attack` aceita `attacker` e `target` (`tokenFromRef`, `ownedToken`, `chosenTarget` em
  `src/integrations/foundry/tokens.ts`); sem eles, segue o token controlado e o alvo marcado.

Hooks só no cliente que executou a ação; os dados são cópias (`structuredClone`).

## Persistência

- Ajustes de mundo: regras opcionais, roteamento, Quickhacks ligado, pacotes ativos e
  mapeamento evento → efeito.
- Ajustes de cliente: efeitos ligados, volume, intensidade, movimento reduzido.
- Flags em mensagens de chat: estado da resolução (para desfazer e para recarregar o card).
- Flags no ator/token: alvo conectado (Jack In), bloqueios de 60 min, agarrão ativo.
