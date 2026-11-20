# Combat Kit — for Cyberpunk RED

Módulo de Foundry VTT V12 para o sistema Cyberpunk RED – CORE: ataque com alvo e DV
automática, defesa, dano aplicado com armadura e ablação, modos de fogo e áreas, menu de
combate no clique direito, efeitos audiovisuais configuráveis e pacotes de conteúdo
importáveis. Integra-se ao Character Panel quando os dois estão ativos.

**Estado:** beta (0.1.1). Ataques à distância e corpo a corpo, modos de fogo, áreas,
agarrão, dano aplicado pelo mestre com desfazer, efeitos audiovisuais, menu de combate no
clique direito, pacotes de conteúdo importáveis com editor de efeitos por evento e motor de
Quickhacks desligado por padrão, com definições só vindas de pacotes, e aba "Combate" no
Character Panel quando ele está ativo. Macros e outros módulos usam a API v1
([docs/INTEGRATION.md](docs/INTEGRATION.md)). Veja [STATUS.md](STATUS.md) e [SPEC.md](SPEC.md).

## Instalação

Foundry VTT V12 com o sistema Cyberpunk RED – CORE. Em "Instalar módulo", cole o manifesto:
`https://github.com/agnasci/cyberpunk-combat-kit/releases/latest/download/module.json`.

A aba "Combate" e os atalhos no painel precisam do Character Panel 0.2.0 ou mais novo (API v1).
Com versão anterior ou sem o painel, o Combat Kit funciona sozinho pelo clique direito.

## Atalhos

- Clique direito num token alheio (Alt + clique direito num token seu, ou sendo mestre):
  menu de combate com armas, modos, recarga e agarrão.
- Alt + clique esquerdo num token: torna-o o único alvo, ou o desmarca, sem selecioná-lo.
  Vários alvos de uma vez só nos ataques de área, pelo template.
- O alvo aparece com cantos no estilo do HUD, na cor do painel; alvos de outros jogadores,
  como losangos na cor de cada um. O ajuste "Marcador de alvo do Combat Kit" volta às setas
  do Foundry.
- Ferramenta "Tiro rápido" (ícone de pistola nos controles de token): selecione seu token e
  clique com o botão esquerdo num alvo para atacá-lo na hora com a arma equipada.
- Sem token selecionado, o menu e o painel usam o token do seu personagem na cena.
- Ajustes: "Pular diálogos de rolagem" (cliente) e "Defesa dos PdMs" (mundo, mestre).
- As duas teclas mudam nos ajustes do módulo (ajustes de cliente).

## Unofficial content

Combat Kit is unofficial content provided under the Homebrew Content Policy of R. Talsorian
Games and is not approved or endorsed by RTG. This content references materials that are
the property of R. Talsorian Games and its licensees.

## Licença

MIT ([LICENSE](LICENSE)).
