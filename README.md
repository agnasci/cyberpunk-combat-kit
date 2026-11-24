# Combat Kit — for Cyberpunk RED

Módulo de Foundry VTT V12 para o sistema Cyberpunk RED – CORE: ataque com alvo e DV
automática, defesa, dano aplicado com armadura e ablação, modos de fogo e áreas, menu de
combate no clique direito, efeitos audiovisuais configuráveis e pacotes de conteúdo
importáveis. Integra-se ao Character Panel quando os dois estão ativos.

**Estado:** beta (0.2.0). Ataques à distância e corpo a corpo, modos de fogo, áreas,
agarrão, dano aplicado pelo mestre com desfazer, efeitos audiovisuais, menu de combate no
clique direito, pacotes de conteúdo importáveis com editor de efeitos por evento e motor de
Quickhacks desligado por padrão, com definições só vindas de pacotes, e aba "Combate" no
Character Panel quando ele está ativo. Macros e outros módulos usam a API v1
([docs/INTEGRATION.md](docs/INTEGRATION.md)). Veja [STATUS.md](STATUS.md) e [SPEC.md](SPEC.md).

## Instalação

Foundry VTT V12 com o sistema Cyberpunk RED – CORE. Em "Instalar módulo", cole o manifesto:
`https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.

Pacotes de efeitos podem usar vídeos de outro módulo instalado, como o JB2A grátis
("Jules and Ben's Animated Assets"): o pacote diz qual módulo usa; sem ele ativo, os vídeos viram
os efeitos próprios do Combat Kit e os sons continuam. Uma configuração do Automated
Animations pode virar pacote pelo conversor `scripts/import-aa.mjs`
([docs/EFFECTS.md](docs/EFFECTS.md)); o Automated Animations não é necessário e, ativo junto,
dobra as animações.

A aba "Combate" e os atalhos no painel precisam do Character Panel 0.2.0 ou mais novo (API v1).
Com versão anterior ou sem o painel, o Combat Kit funciona sozinho pelo clique direito.

## Atalhos

- Clique direito num token alheio (Alt + clique direito num token seu, ou sendo mestre):
  menu de combate com armas, modos, recarga e agarrão.
- Alt + clique esquerdo num token: torna-o o único alvo, ou o desmarca, sem selecioná-lo.
  Vários alvos de uma vez só nos ataques de área, pelo template.
- O alvo marcado ganha uma mira no estilo do HUD: cantos que respiram, setas e a etiqueta
  "ALVO · distância" até o seu token, na cor escolhida no Character Panel (muda
  junto, inclusive na prévia). Alvos de outros jogadores aparecem como losangos na cor de
  cada um. Ajustes de cliente: "Marcador de alvo do Combat Kit" (desligado, volta às setas
  do Foundry) e "Animar o marcador de alvo"; movimento reduzido também deixa a mira parada.
- Ferramenta "Tiro rápido" (ícone de pistola nos controles de token): selecione seu token e
  clique com o botão esquerdo num alvo para atacá-lo na hora com a arma equipada.
- Em combate, quem está no turno ganha uma placa sob o token com o movimento que resta e a
  Ação da rodada (losango cheio, meio ou vazio); o tracker de combate mostra o mesmo para
  todos, e o mestre clica no selo para devolver tudo. Cada personagem anda até MOV
  quadrados por rodada (diagonal conta 1); passar disso pergunta se quer Correr, que gasta a
  Ação. Ataques, agarrão, recarga e levantar-se gastam a Ação (armas de cadência 2 fazem dois
  ataques simples); caído não anda. Ajuste de mundo "Contador de ações e movimento":
  desligado, só contar ou contar e bloquear (padrão); ajuste de cliente "Indicador de turno".
- Com o Character Panel 0.2.1 ou mais novo, a borda do painel pulsa enquanto o personagem
  exibido nele está no turno (ajuste de cliente "Destacar o painel no turno").
- O mestre tem o botão "Death Save dos PdMs" no topo do tracker: rola o Death Save de cada
  PdM mortalmente ferido do combate pelo sistema.
- "Desfazer" no card de resolução devolve PV e armadura e tira os estados que aquele golpe
  ligou (Caído, Inconsciente, estado de Quickhack).
- Sem token selecionado, o menu e o painel usam o token do seu personagem na cena.
- Ajustes: "Pular diálogos de rolagem" (cliente) e "Defesa dos PdMs" (mundo, mestre).
- As duas teclas mudam nos ajustes do módulo (ajustes de cliente).

## Unofficial content

Combat Kit is unofficial content provided under the Homebrew Content Policy of R. Talsorian
Games and is not approved or endorsed by RTG. This content references materials that are
the property of R. Talsorian Games and its licensees.

## Licença

MIT ([LICENSE](LICENSE)).
