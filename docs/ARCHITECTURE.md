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

1. Menu rápido (ou macro/API) recebe `{attacker, target, weaponId, mode}`.
2. `workflows/attack` valida (alvo visível, arma equipada, munição) e mede distância.
3. Domínio calcula a DV pela tabela da arma e decide se o alvo **pode** esquivar.
4. Se pode, o dono do alvo (ou o mestre) recebe o pedido "Esquivar / Não esquivar"
   (socket); sem resposta em X s ou PdM com opção automática, usa a DV.
5. O atacante rola pelo pipeline nativo (`item.createRoll` + `confirmRoll` + `roll()`), com o
   alvo marcado para o card nativo sair igual ao da ficha.
6. Domínio resolve acerto/erro; card de resolução próprio mostra o resultado conforme o
   roteamento (R13).
7. Acerto: rolagem de dano nativa; lesão crítica se houver dois 6; o **executor do mestre**
   chama `target.actor._applyDamage(...)`; o card guarda o necessário para desfazer.
8. Cada etapa emite um evento (`cck.attack.*`) que o motor de efeitos e a API consomem.

## Executor do mestre (R14)

- Um único mestre ativo (o de menor id entre os ativos) executa pedidos recebidos por socket.
- Pedidos são objetos mínimos (`{type, actorUuid, args, requestId}`), validados de novo no
  mestre (permissão de quem pediu, alvo existente, valores numéricos).
- Sem mestre ativo: a ação é recusada com aviso. Mestre local executa direto.

## Menu rápido (R06)

- Clique direito sobre token **não possuído**: abre o menu do módulo no lugar do nada atual.
- Dono/mestre: mantém o Token HUD nativo; o menu abre com modificador (Alt+clique direito,
  configurável) ou por opção "sempre usar menu de combate".
- Itens: armas equipadas (com modos disponíveis), mirar, medir DV, marcar alvo, Quickhacks
  (só se R09 ligado e o ator for Netrunner), ações de agarrão quando aplicável.
- Teclado: setas, Enter, Esc; foco volta ao canvas ao fechar.

## Efeitos (R07–R08)

Ver [EFFECTS.md](EFFECTS.md). Motor de cues desacoplado: workflows emitem eventos; o motor
procura o efeito associado ao evento (pacote ativo → padrão próprio) e toca localmente em
cada cliente, sem tráfego de quadro a quadro pelo servidor.

## Quickhacks (R09)

- Ajuste de mundo `quickhacks.enabled = false` por padrão. Desligado: nenhum menu, nenhum
  item criado, nenhum hook de Quickhack registrado.
- Ligado: as definições vêm de pacotes (`kind: "quickhack"`) — nome, nível/DV, ícone, efeito
  automatizável (`damage`, `status`, `criticalInjury`, `guided`). Sem pacote: menu vazio com
  explicação.
- Regras no domínio (docs/RULES.md §8): alcance 25 quadrados, Neuroport, Breach por Self-ICE,
  um Quickhack por alvo por turno, bloqueio de 60 min após Force Out, alerta do alvo.

## Integração com o Character Panel (R10)

O painel ainda não expõe a API (tarefa E6-01 de lá). Contrato esperado (proposta do painel,
D12 de lá), consumido só por `src/integrations/panel/`:

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

Pedidos que este projeto fará ao painel (registrar lá quando E6-01 começar): região `quick`
existir mesmo recolhido; `onAction` receber o evento para modificadores (Shift/Ctrl).

## API pública (R11)

`game.modules.get("cyberpunk-combat-kit").api` + hook `cckReady`:

| Membro | Função |
|---|---|
| `version` | `1` |
| `attack({attacker, target, weaponId, mode})` | Inicia o fluxo de ataque |
| `applyDamage({targetUuid, damage, bonus, location, ...})` | Pelo executor do mestre |
| `effects.register(id, definition)` / `effects.play(event, context)` | Efeitos por código |
| `packs.register(manifest)` / `packs.list()` | Pacotes de conteúdo (também usado pelo pacote pessoal) |
| Hooks `cckAttackResolved`, `cckDamageApplied`, `cckQuickhackResolved` | Para outros módulos |

## Persistência

- Ajustes de mundo: regras opcionais, roteamento, Quickhacks ligado, pacotes ativos e
  mapeamento evento → efeito.
- Ajustes de cliente: efeitos ligados, volume, intensidade, movimento reduzido.
- Flags em mensagens de chat: estado da resolução (para desfazer e para recarregar o card).
- Flags no ator/token: alvo conectado (Jack In), bloqueios de 60 min, agarrão ativo.
