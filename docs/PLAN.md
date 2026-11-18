# Plano de etapas

Uma tarefa por vez, na ordem, salvo pedido do usuário. Cada tarefa termina com evidência
registrada no STATUS (testes, `npm run check`, teste manual no Foundry quando houver UI).
Requisitos R01–R14 em [SPEC.md](../SPEC.md). Tarefas `P-*` mexem só em `private/` e nunca
geram commit de conteúdo. Apagar este arquivo quando o plano acabar.

## E0 — Fundação

| ID | Entrega | Arquivos | Aceite |
|---|---|---|---|
| E0-01 | Confirmar com o usuário as decisões D01–D12 e as pendências do STATUS | `docs/DECISIONS.md`, `STATUS.md` | Cada decisão Confirmada ou alterada |
| E0-02 | Ferramentas e módulo vazio carregando | `package.json`, lockfile, `tsconfig*.json`, `vite.config.ts`, `eslint.config.js`, `src/main.ts`, `src/constants.ts`, `src/types/foundry.d.ts`, `module.json`, `lang/*.json`, junção em `Data/modules` | `npm ci && npm run check` exit 0; módulo ativo no mundo de teste sem erros |
| E0-03 | Guardas da edição pessoal | `scripts/check-private.mjs`, `private.example/`, `.gitignore`, script `check` | Arquivo de teste posto em `private/` e referenciado em `src/` faz o `check` falhar; removido, passa |
| E0-04 | Provas de API em execução | `docs/COMPATIBILITY.md` | Cada "a verificar" vira testado ou alternativa decidida: clique direito em token não possuído, socket + executor do mestre chamando `_applyDamage` em PdM, ataque nativo com alvo, leitura da tabela de DV, `MeasuredTemplate`, distância, `AudioHelper`, sprite/PIXI simples, compêndio LevelDB do módulo |

## E1 — Núcleo de ataque à distância e corpo a corpo simples

| ID | Entrega | Arquivos | Aceite |
|---|---|---|---|
| E1-01 | Regras puras: DV por distância, quem pode esquivar, resolução, metade da armadura, lesão crítica por dois 6 | `src/domain/attack-rules.ts`, `src/domain/range.ts`, testes | Testes com casos citando a página de docs/RULES.md; pendências de leitura de lá resolvidas |
| E1-02 | Snapshot de arma e ator; ataque nativo com alvo | `src/integrations/cpr/weapon-adapter.ts`, `attack-adapter.ts`, testes com fixtures | Card nativo idêntico ao da ficha, com o alvo; munição gasta como na ficha |
| E1-03 | Executor do mestre | `src/integrations/foundry/gm-executor.ts`, `src/domain/gm-request.ts`, testes | Jogador acerta PdM e o HP/armadura do PdM mudam via mestre; sem mestre ativo, aviso |
| E1-04 | Workflow ataque → defesa → resolução → dano | `src/workflows/attack.ts`, `src/ui/resolution-card.ts`, `templates/resolution-card.hbs` | Fluxo completo com esquiva e sem; desfazer dano funciona; roteamento padrão (R13) |

## E2 — Menu rápido

| ID | Entrega | Aceite |
|---|---|---|
| E2-01 | Menu no clique direito (D10) com armas equipadas e modos disponíveis | Jogador abre em inimigo; dono/mestre mantém o HUD e abre com Alt; teclado completo |
| E2-02 | Medir DV, marcar alvo, mirar (escolha de local) | Valores iguais aos do domínio; foco volta ao canvas |

## E3 — Modos e áreas

| ID | Entrega | Aceite |
|---|---|---|
| E3-01 | Tiro mirado (cabeça, item, perna) | Multiplicador e lesões conforme sistema |
| E3-02 | Fogo automático | Multiplicador limitado pela arma; esquiva por alvo |
| E3-03 | Áreas: template, alvos dentro, respostas individuais | Espingarda e explosivos; dispersão de granada errada |
| E3-04 | Fogo supressivo | Teste de WILL + Concentration por alvo; aviso de buscar cobertura |
| E3-05 | Arremesso, Brawling, Martial Arts básico | Dano pelo BODY; armas brancas com metade da armadura |
| E3-06 | Agarrão (agarrar, estrangular, arremessar, escapar) | Estado no token; −2 aplicado como efeito; fim do agarrão limpa |

## E4 — Efeitos audiovisuais

| ID | Entrega | Aceite |
|---|---|---|
| E4-01 | Motor de cues e eventos | Eventos emitidos por E1–E3 chegam ao motor em todos os clientes que veem a cena |
| E4-02 | Efeitos próprios: traço, clarão, impacto, explosão, erro, crítico | Sem rAF parado; movimento reduzido vira efeito estático |
| E4-03 | Sons e ajustes de cliente | Volume e liga/desliga por cliente; desbloqueio após interação |
| E4-04 | Sequencer opcional | Com Sequencer ativo, sprites vão por ele; sem ele, backend próprio |

## E5 — Pacotes de conteúdo

| ID | Entrega | Aceite |
|---|---|---|
| E5-01 | Manifesto e validação | Testes: caminhos maliciosos, tipos proibidos, chaves inválidas |
| E5-02 | Importador (mestre) e ativação | Pasta escolhida no FilePicker vira pacote ativo; persiste após F5 |
| E5-03 | Editor de associação evento → cue | Mestre troca o som de um evento sem editar arquivo |

## E6 — Quickhacks (desligado por padrão)

| ID | Entrega | Aceite |
|---|---|---|
| E6-01 | Regras puras (docs/RULES.md §8) | Testes de alcance, Neuroport, Breach, limite por turno, bloqueio de 60 min, alerta |
| E6-02 | Jack In, Breach, Jack Out, Force Out | Estado por flag; mensagens pelo roteamento |
| E6-03 | Quickhack a partir de definições de pacote | Sem pacote: menu explica; com pacote fictício de teste: dano, status e lesão funcionam |

## E7 — Integração com o Character Panel

| ID | Entrega | Condição | Aceite |
|---|---|---|---|
| E7-01 | Ponte: detectar API, assinatura, paleta | Depois da E6-01 do painel | Com painel: cores coerentes; sem painel: nada quebra |
| E7-02 | Slots `bar-end`, `quick`, `drawer` | Idem | Atacar pela aba Combate do painel; recolher o painel não perde atalhos |

## E8 — API pública e entrega

| ID | Entrega | Aceite |
|---|---|---|
| E8-01 | API v1 (docs/ARCHITECTURE.md) e `docs/INTEGRATION.md` | Macro de exemplo ataca e aplica dano |
| E8-02 | Beta pública | Checklist de docs/LEGAL.md completo; release de `dist/` |

## P — Edição pessoal (somente `private/`)

| ID | Entrega | Condição | Aceite |
|---|---|---|---|
| P-01 | `private/` criado de `private.example/`; `build:personal` | Depois de E0-03 | `dist-personal/` carrega no Foundry com versão `-personal` |
| P-02 | Pacote pessoal com o conteúdo do PneumaQuickHack | Depois de E5-01 e E6-03 | 11 Quickhacks com ícones e efeitos do Pneuma funcionando; aviso MIT em `private/NOTICES.md` |
| P-03 | Compêndio pessoal (CEMK) | Depois de E0-04 (LevelDB) | Itens do Edgerunners Armory e Quickhacks no compêndio com dados mecânicos e arquivo de texto por item (D14); texto colado pelo usuário aparece como descrição; nenhum duplicado do sistema |
| P-04 | Assets do Combat/Visual Tools (D13) | Depois de E4-01 e P-01 | Cues pessoais com os sons e imagens deles; nada fora de `private/` |
