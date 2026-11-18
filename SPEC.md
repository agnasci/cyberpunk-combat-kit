# Especificação — Cyberpunk Combat Kit

Status: requisitos do usuário (2026-11-17) organizados para implementação. O que é proposta
técnica está marcado; decisões em [docs/DECISIONS.md](docs/DECISIONS.md).

## Objetivo

Módulo de combate para Foundry VTT V12 + Cyberpunk RED – CORE (sistema `cyberpunk-red-core`)
que automatiza rolagens e consequências de combate, toca efeitos audiovisuais e conversa com
o Character Panel. Versão melhorada e mais enxuta das ideias do PneumaQuickHack e da suíte
Pneuma (Combat Tools / Visual Tools), escrita do zero (docs/RESEARCH.md, docs/LEGAL.md).

Público: mestre e jogadores numa mesa online. Prioridade: menos cliques, regras corretas do
livro base, nada de conteúdo protegido na edição pública.

## Requisitos

| ID | Requisito | Origem |
|---|---|---|
| R01 | Atacar um token alvo com a arma equipada pelo pipeline nativo do CPR (diálogo, LUCK, card), com DV calculada pela distância e pela tabela de DV da arma | Usuário: "automatizar rolagens" |
| R02 | Defesa: o dono do alvo (ou o mestre) escolhe esquivar quando a regra permite; resultado de acerto/erro registrado num card de resolução | Regra (docs/RULES.md §3–4) |
| R03 | Dano: rolar o dano nativo e aplicá-lo ao alvo pelo `_applyDamage` do sistema (armadura, ablação, local, metade da armadura no corpo a corpo, lesão crítica em dois 6), mesmo sem o jogador possuir o alvo | Regra §6–7; sistema |
| R04 | Modos: tiro mirado, fogo automático, fogo supressivo, cartucho de espingarda, explosivos com área e arremesso | Regra §4 |
| R05 | Corpo a corpo: armas brancas, Brawling, Martial Arts e Agarrão (agarrar, estrangular, arremessar, escapar) | Regra §5 |
| R06 | Menu de acesso rápido ao clicar com o botão direito num token inimigo: atacar (arma e modo), mirar, medir DV, Quickhack (se ligado), marcar alvo | Usuário |
| R07 | Efeitos audiovisuais de combate (tiro, impacto, explosão, erro, crítico, morte, Quickhack) com efeitos próprios genéricos e ajustes por cliente (ligar, volume, intensidade, movimento reduzido) | Usuário: "efeitos visuais de combate" |
| R08 | Importar pacotes de áudio, imagens, vídeos e definições de efeito, e associá-los a eventos de combate, sem editar código | Usuário: "jeito de importar áudios, efeitos visuais" |
| R09 | Menu e motor de Quickhacks (Jack In, Breach, Quickhack, Force Out, Jack Out) **desligado por padrão**; definições de Quickhack só vêm de pacotes | Usuário; CEMK é conteúdo da RTG |
| R10 | Integração com o Character Panel quando os dois estiverem ativos (slots e hooks da API dele); sem ele, o módulo funciona com interface própria mínima | Usuário |
| R11 | API pública própria: eventos de combate, registro de efeitos e de pacotes, ações (atacar, aplicar dano) para macros e outros módulos | Proposta (D05) |
| R12 | Edição pessoal fora do Git: todo o conteúdo do PneumaQuickHack (ícones, catálogo, mensagens), demais efeitos que o usuário escolher e um compêndio pessoal com itens e Quickhacks oficiais | Usuário (docs/PERSONAL.md) |
| R13 | Privacidade de rolagens: rolagens e resultados de PdM podem ser ocultos dos jogadores conforme cenário (PdM→PdM, PdM→PJ, PJ→PdM, PJ→PJ) | Ideia do PneumaQuickHack |
| R14 | Mudanças em documentos que o usuário não possui passam por um único mestre ativo; sem mestre ativo, a ação é recusada com aviso | Proposta (D04) |

## Fora do escopo (por ora)

- Painel de personagem, biomonitor, ficha rápida: são do Character Panel.
- Arquitetura NET, ICE de arquitetura, programas no ciberespaço: Netrunner HUD.
- Barra de turnos própria e contadores de movimento: o tracker do Foundry basta (rever depois).
- EMP, medicina/tratamento, fogo contínuo, veneno, drogas: candidatos a etapas futuras.
- Veículos e combate de veículos.

## Critérios gerais de aceite

- Toda regra automatizada tem teste unitário com o caso do livro citado por página.
- Toda rolagem passa pelo pipeline nativo (diálogo de modificadores e LUCK do sistema).
- Nenhum arquivo versionado contém conteúdo de `private/` (check automatizado).
- Funciona com o painel ativo e sem ele (teste manual nos dois casos).
