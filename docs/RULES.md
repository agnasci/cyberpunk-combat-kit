# Regras de combate — resumo próprio

Fonte conferida em 2026-11-17: edição em português do livro base (páginas do PDF, que podem
diferir da numeração impressa) e o Cyberpunk: Edgerunners Mission Kit (CEMK), em
`D:\Desenvolvimento\docs\Cyberpunk RED` (fora do repositório). Este arquivo **resume em
palavras próprias** o que o código precisa implementar e aponta a página. Não copie
tabelas, textos ou descrições dos livros para cá nem para o código (docs/LEGAL.md): valores
de tabela vêm do sistema em execução (compêndios `internal_dv-tables` e
`internal_critical-injury-tables`) ou de `private/`.

## 1. Tempo e iniciativa — livro base p. 169–170; CEMK p. 7

- Iniciativa = REF + 1d10; o tracker nativo do sistema já rola (`CPRInitiative`).
- Turno = 1 Ação de Movimento + 1 Ação. Ações relevantes: Atacar, Agarrar, Estrangular,
  Arremessar, Esquivar (como reação ao ataque), Recarregar, Levantar-se, Net Action.
- O módulo **não** controla orçamento de ações (decisão D08); só avisa quando a regra exige
  (ex.: um Quickhack por alvo por turno).

## 2. Testes resistidos e DV — livro base p. 169–173

- Sucesso exige superar o valor oposto ou a DV; empate favorece quem defende. Funções do
  domínio usam `attackerTotal > defenseTotal`.
- Crítico/falha crítica no d10 é do pipeline nativo (`CPRRoll`); o módulo só lê o total.

## 3. Ataque à distância — livro base p. 171–174; CEMK p. 8–10

- Atacante: REF + perícia da arma + 1d10 contra DV pela distância e tipo de arma (tabela do
  sistema) **ou**, se o defensor puder e quiser, DEX + Evasão + 1d10.
- Esquivar de ataque à distância exige REF 8 ou mais (nota da p. 173; vale também para fogo
  automático, espingarda e explosivos, p. 174–175). No corpo a corpo qualquer um pode.
- Distância em metros/jardas; 1 quadrado = 2 m/yds (convenção do sistema e do CEMK).
- ROF: número de ataques da arma por Ação; cada ataque é um teste separado.

## 4. Modos especiais — livro base p. 173–175; CEMK p. 9–10

- **Tiro mirado**: penalidade no ataque; escolhe cabeça (dano multiplicado), item segurado
  ou perna (lesões específicas). O sistema já tem `CPRAimedAttackRoll`.
- **Fogo automático**: perícia Autofire, gasta várias balas, DV própria; o multiplicador de
  dano depende de quanto superou a DV, limitado pela arma (`CPRAutofireRoll`,
  `autofireMultiplierMax`). O defensor pode esquivar.
- **Fogo supressivo**: gasta munição; todos a pé no alcance fora de cobertura resistem com
  WILL + Concentration contra o total do atacante; quem falha usa o Movimento para buscar
  cobertura (`CPRSuppressiveFireRoll`). Exige template de área.
- **Cartucho de espingarda (expansivo)**: atinge uma área à frente; cada alvo pode esquivar.
- **Explosivos**: dano a todos na área; quem esquiva sai da área; cobertura protege se o dano
  não a destruir. Granada errada desvia (regra de dispersão p. 175).
- **Arremesso**: usa a tabela de granadas/arremesso; o alvo pode esquivar.

## 5. Corpo a corpo — livro base p. 176–181; CEMK p. 11–12

- Ataque: DEX + perícia + 1d10 contra DEX + Evasão + 1d10 do defensor.
- Armas corpo a corpo ignoram metade da armadura do defensor (arredondamento conforme o
  sistema; o `_applyDamage` recebe `ignoreArmorPercent`).
- Brawling: dano pelo BODY; Martial Arts tem formas e movimentos especiais (p. 179–181).
- Agarrão (p. 178): mão livre; DEX + Brawling resistido; ambos com −2 em ações; agarrado não
  usa Movimento; ações seguintes: Estrangular (dano pelo BODY), Arremessar/Derrubar, Escapar.

## 6. Cobertura — livro base p. 182–184

- Não existe cobertura parcial; cobertura tem HP por material/espessura (tabela do livro).
- Explosivo só atinge quem está atrás de cobertura se destruí-la.
- O módulo marca cobertura de forma manual (flag no token) antes de automatizar HP.

## 7. Armadura, dano, ferimentos e lesões — livro base p. 185–189; CEMK p. 13–15

- Dano que passa do SP fere; a armadura sofre ablação quando é atravessada.
- Cabeça: dano multiplicado. Tudo isso já está em `actor._applyDamage` (docs/COMPATIBILITY.md).
- Lesão crítica quando dois dados de dano mostram 6: dano bônus direto e rolagem na tabela
  de lesões (cabeça ou corpo) do sistema.
- Estados de ferimento e Death Save: lidos do sistema (`currentWoundState`); Death Save fica
  no Character Panel.

## 8. Quickhacks — CEMK p. 16–18, 26–28

- Só alvos com Neuroport (ou cyberware compatível) podem ser hackeados.
- Net Actions por turno conforme o rank de Interface; Meat Action ou Net Actions.
- **Jack In**: alvo visível a até 50 m/yds (25 quadrados); Interface + 1d10 contra
  WILL + 1d10; falhar alerta o alvo.
- **Force Out** (ação do alvo): WILL + Concentration + 1d10 contra Interface + 1d10;
  expulso não pode reconectar ao mesmo alvo por 60 minutos.
- **Breach**: um Passwall por Self-ICE instalado; DV cresce 2 por Self-ICE (p. 17).
- **Quickhack**: Interface contra a DV do nível (quatro níveis); um Quickhack por alvo por
  turno; sucesso alerta o alvo salvo exceção da própria definição.
- Acesso por rank de Interface aos níveis (CEMK p. 26). Detalhes de cada Quickhack (nome,
  efeito, duração) são conteúdo da RTG: ficam só no pacote pessoal (`private/`).

## 9. Itens oficiais

- O sistema já distribui, com licença da RTG, os itens do livro base e das DLCs nos próprios
  compêndios (lista em docs/COMPATIBILITY.md). O compêndio pessoal **não duplica** esses itens.
- Itens do CEMK (Edgerunners Armory, p. 31–37) e os Quickhacks não estão no sistema: são o
  alvo do compêndio pessoal (docs/PERSONAL.md).

## Leituras conferidas (E1-01, 2026-11-17)

Conferido no texto em português (páginas do PDF) e no comportamento do sistema:

- Esquiva à distância só com REF 8 ou mais (p. 173, nota do ataque à distância); empate
  favorece o defensor (p. 173 e 177). Implementado em `src/domain/attack-rules.ts`.
- Armas brancas (p. 177) e Artes Marciais (p. 179) ignoram metade da armadura, arredondando
  para cima. O `_applyDamage` faz `Math.round(SP − SP × 50%)`, que para SP inteiro dá o
  mesmo resultado (SP 7 → 4; SP 11 → 6). A arma corpo a corpo do sistema já traz
  `ignoreArmorPercent: 50`; testado no Foundry (6 de dano contra SP 7 → 2 PV).
- Lesão crítica com dois ou mais 6 no dano, +5 direto nos PV, sem ablação e sem
  multiplicador de local (p. 188; o livro impresso numera 187). O sistema marca o crítico
  (`wasCritSuccess`) e passa o bônus; a rolagem na tabela de lesões continua no card nativo.
- Dano na cabeça dobrado: feito pelo `_applyDamage`; só entra com tiro mirado (E3-01).
- Distância fracionária: arredondada para cima antes de procurar a faixa da tabela de DV
  (proposta técnica; as faixas do sistema são inteiras).

## Leituras conferidas (E3, 2026-11-17)

Páginas do PDF em português; implementação em `src/domain/modes.ts`, `area.ts` e
`grapple.ts`, com testes que citam a página.

- Tiro mirado (p. 171): um ataque por ação, −8; cabeça dobra o dano que passa da armadura;
  item segurado ou perna exigem que ao menos 1 ponto passe (soltar o item; lesão de perna).
- Fogo automático (p. 173): uma ação e 10 balas, perícia própria e tabela própria; dano 2d6
  multiplicado por quanto superou a DV (ou a esquiva), até o máximo da arma; dois 6 = lesão;
  não combina com tiro mirado; REF 8+ pode esquivar.
- Supressivo (p. 174): 10 balas; quem está a pé, a até 25 m, fora de cobertura e na linha de
  visão resiste com VON + Concentração contra o ataque; quem falha usa o próximo movimento
  (e, se preciso, a ação) para buscar cobertura. Cobertura e linha de visão ficam a cargo de
  quem marca os alvos.
- Cartucho de espingarda (p. 174): um ataque contra DV 13; acertando, cada alvo visível à
  frente a até 6 m leva 3d6 (dano vem da munição no sistema); REF 8+ esquiva individualmente.
  O texto não dá ângulo; a área usada é uma faixa de 3 × 3 quadrados à frente (D18). A
  figura de exemplo da página não foi conferida em imagem.
- Explosivos (p. 174): quadrado de 10 m centrado no alvo pretendido, um dano para todos;
  errando, o mestre decide onde caiu; REF 8+ esquiva superando a rolagem de ataque e sai da
  área; cobertura que o dano não destrói protege (marcação manual por ora).
- Arremesso (p. 178): DES + Atletismo, até 25 m, tabela de DV do lança-granadas; arma branca
  arremessada causa o dano dela sem reduzir a armadura pela metade. O sistema traz a tabela
  "DV Thrown Weapon" e a arma "Thrown Weapon" para granadas.
- Briga (p. 177): dano pelo BODY (sistema), armadura inteira. Artes Marciais (p. 179): dano
  pelo BODY, metade da armadura; movimentos especiais ficam para depois.
- Agarrão (p. 178): mão livre; DES + Briga contra DES + Briga; os dois com −2 em tudo;
  defensor não usa movimento. Estrangular: BODY direto nos PV, sem armadura; de mais de 1 PV
  para menos de 0 fica com 1 e desmaia; 3 rodadas seguidas desmaiam. Derrubar: BODY direto,
  fim do agarrão, alvo caído. Escapar: teste resistido de Briga; quem agarra solta sem ação.
