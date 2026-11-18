# Estudo dos módulos de referência

Conferido em 2026-11-17 por clone em pasta temporária (nada executado). Fatos de licença
pelo `gh repo list GMPneuma`.

## Suíte GMPneuma

| Repositório | Versão | Licença | Conteúdo relevante |
|---|---|---|---|
| PneumaQuickHack | 0.9.2 | **MIT** | Só Quickhacks do CEMK (detalhe abaixo); 12 ícones PNG; sem animações nem sons |
| PneumaCombatTools | 0.9.42 | Sem licença | Fluxo de combate completo; exige libWrapper e mestre ativo |
| PneumaVisualTools | 0.10.15 | Sem licença | Animações de ataque, luzes, efeitos de tela, skins de chat, áudio sintetizado |
| PneumaSceneTools, CrewTools, MookMaker, ChatDice, Payouts, NetArchScanner, GreenTheme | — | Sem licença | Fora do escopo |

O usuário pediu "versão melhorada do PneumaQuickHack" descrevendo combate e efeitos
visuais: esse conjunto está no Combat Tools + Visual Tools; o QuickHack é só a parte de
Quickhacks. O plano cobre os três como referência de ideias (pendência registrada no STATUS).

## PneumaQuickHack (MIT)

- JavaScript sem build tipado; `scripts/src/*` com ~15 arquivos de 1–13 KB.
- Cria, como mestre, uma pasta de itens `gear` (lançador + 11 Quickhacks com flag
  `quickhackId`); o lançador equipado aparece na aba de luta da ficha.
- Jack In (Interface vs. WILL, alcance 25 quadrados, papel Netrunner obrigatório), Quickhack
  (lista completa ou só os possuídos, diálogo nativo de Interface com LUCK), Force Out.
- Efeitos: dano imediato e dano contínuo por card de dano nativo, sem armadura; uma lesão
  crítica copiada do compêndio do sistema; status só se registrados no sistema.
- Roteamento de mensagens por cenário (PdM/PJ × PdM/PJ), rolagens de PdM ocultas, Dice So
  Nice suprimido para PdM.
- Lacunas frente ao CEMK (docs/RULES.md §8): não trata Breach/Self-ICE, exigência de
  Neuroport, um Quickhack por alvo por turno, bloqueio de 60 min após Force Out, acesso por
  rank aos níveis. Sem timers nem limpeza de efeitos.
- Melhorias planejadas: TypeScript com domínio testado, regras completas, definições por
  pacote (não fixas no código), menu no botão direito, efeitos audiovisuais por evento.

## PneumaCombatTools (sem licença — só ideias)

Inventário (README e `docs/feature-list-for-posting.md`): cards de ataque e defesa cientes
do alvo com Esquivar/Não esquivar e resultado oculto até a resposta; aplicação de dano
nativa com histórico e desfazer; área (granadas, foguetes, espingarda, supressivo) com
respostas individuais e dispersão; agarrão completo; Quickhacks; EMP; barra de combate;
contadores de movimento; biomonitor; mensagens privadas no HUD; rolagens manuais; regras
caseiras opcionais. ~120 arquivos TypeScript, muitos ajustes e regras caseiras.

Lições: o volume de opções e integrações (libWrapper, barra própria, HUD, biomonitor) torna
o módulo pesado. Aqui: núcleo do livro primeiro, regras caseiras só sob pedido, biomonitor
fica no Character Panel, sem libWrapper salvo necessidade provada (E0-02).

## PneumaVisualTools (sem licença — só ideias)

- Efeitos por tipo de arma (pistola, SMG, fuzil, sniper, espingarda, arco, granada,
  foguete, corpo a corpo, agarrão, netrunning); rajadas representativas em automático.
- Pulso de luz nativa no cano, por cliente, com pool de luzes da cena movidas pelo mestre.
- Ajustes por cliente: mostrar efeitos, tocar sons, volume, intensidade; movimento reduzido.
- Efeitos de tela (glitch, em chamas) e skins de chat.
- Áudio sintetizado (WebAudio) e imagens PNG/WebP.

Ideias adotadas no nosso motor de cues (docs/EFFECTS.md): evento → efeito local por cliente;
luz opcional; respeito a visibilidade e movimento reduzido.

## cpr-combat-hud (Vec97, MIT)

Já estudado pelo Character Panel; referência para atalhos de arma na barra.

## Sistema CPR

Pipeline de ataque e dano completo e reutilizável (docs/COMPATIBILITY.md). O que falta no
sistema e justifica o módulo: ligar ataque ao alvo com DV automática, defesa do alvo,
aplicar dano a atores alheios sem selecionar o token manualmente, áreas, Quickhacks,
efeitos audiovisuais e menu no token.
