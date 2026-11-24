# Efeitos audiovisuais e pacotes de conteúdo

Status: motor de cues, efeitos próprios, sons e ajustes de cliente implementados na E4
(R07); pacotes, importador e editor de efeitos por evento na E5 (R08); Quickhacks a partir
de pacotes na E6 (R09). Eventos `quickhack.*` têm efeito padrão próprio; `quickhack.success`
e `quickhack.fail` usam o id do Quickhack como qualificador.

## Eventos de combate

Lista fechada e versionada, emitida pelos workflows. Contexto sempre com `sourceToken`,
`targetToken` (quando houver), `weapon` (tipo, categoria, munição) e `outcome`.

| Evento | Quando |
|---|---|
| `attack.fire` | Cada disparo/golpe (ROF, rajada) |
| `attack.hit` / `attack.miss` / `attack.dodged` | Resolução |
| `attack.critical` | Lesão crítica |
| `area.place` / `area.detonate` | Template de área e detonação |
| `damage.applied` | Depois do `_applyDamage` |
| `actor.mortallyWounded` / `actor.dead` | Mudança de estado do alvo |
| `quickhack.jackIn` / `quickhack.success` / `quickhack.fail` / `quickhack.forceOut` | Quickhacks |
| `grapple.start` / `grapple.end` | Agarrão |

## Motor de cues

- Recebe `(evento, contexto)`, escolhe o cue: associação do mestre → pacote ativo → padrão
  próprio → nada.
- Cue = lista de passos: `sound`, `sprite` (imagem/vídeo webm de origem a destino ou no alvo),
  `procedural` (efeitos próprios desenhados em PIXI: clarão, traço de projétil, anel de
  impacto, glitch), `light` (pulso de luz local), `screen` (efeito de tela só para o alvo).
- Toca em cada cliente que vê a cena; só o evento e o contexto trafegam (pelo chat/socket).
- Respeita ajustes do cliente, `prefers-reduced-motion`, aba oculta e visibilidade do token.
- Backend próprio é o padrão; com o módulo Sequencer ativo, passos `sprite` podem ir por ele.

## Como ficou na E4

- Código: `src/domain/cues.ts` (lista de eventos, cues padrão, resolução, validação),
  `src/effects/engine.ts` (motor), `src/integrations/foundry/fx-canvas.ts` (efeitos PIXI e
  sprites), `fx-audio.ts` (sons sintetizados e arquivos), `fx-sequencer.ts`, `settings.ts`;
  emissão pelos workflows em `src/workflows/combat-cues.ts`.
- Trânsito: quem roda o ataque toca localmente e manda `{name, sceneId, source, targets,
  point, qualifiers}` pelo socket do módulo; cada cliente valida o evento e toca se estiver
  na mesma cena. Tokens vão por id; nada de ator ou ficha trafega.
- Eventos emitidos hoje: `attack.fire` (depois da rolagem de ataque), `attack.hit`,
  `attack.miss`, `attack.dodged`, `attack.critical`, `damage.applied` e
  `actor.mortallyWounded` (depois do card), `area.place`, `area.detonate`, `grapple.start`,
  `grapple.end`. `actor.dead` não é emitido: o CPR não decide a morte sozinho (testes de
  morte). Quickhacks ficam para a E6.
- Qualificadores de ataque, do mais específico ao mais geral: tipo da arma do CPR
  (`assaultRifle`, `shotgun`…), forma (`shell`, `explosion`, `autofire`, `suppressive`,
  `thrown`, `single`, `aimed`) e `melee`/`ranged`. Procura chave por chave e, em cada uma,
  registrado por código antes do padrão (D25). Antes das chaves simples vêm as combinadas do
  primeiro qualificador com cada um dos outros (`attack.fire:assaultRifle+autofire`, depois
  `attack.fire:assaultRifle+ranged`), para um pacote mudar um tipo de arma sem perder a forma
  do disparo (D38).
- Efeitos próprios (PIXI, `canvas.interface` com `zIndex` 950): `flash`, `tracer`, `impact`,
  `explosion`, `miss`, `critical`, `flatline`. Animação pelo ticker do canvas; cada efeito sai
  do ticker e é destruído ao terminar ou ao desmontar a cena.
- Sons próprios sintetizados com WebAudio no contexto de interface do Foundry (`shot`,
  `burst`, `launch`, `swing`, `whoosh`, `impact`, `ricochet`, `explosion`, `alarm`,
  `flatline`, `grab`): nenhum arquivo de áudio.
- Ajustes por cliente (Configurar ajustes → Combat Kit): efeitos visuais, sons, volume
  (multiplica o volume de interface do Foundry), intensidade (tamanho) e movimento reduzido
  (seguir o sistema, sempre reduzido, sempre animado). Movimento reduzido mostra o quadro
  parado do efeito por um instante; vídeos ficam no primeiro quadro.
- Visibilidade: efeito visual só nas âncoras que o cliente vê (`token.isVisible`; ponto por
  `canvas.visibility.testVisibility` quando a cena usa visão). Som só se alguma âncora estiver
  visível. Aba oculta não toca nada. Antes do primeiro clique o áudio está travado e o som é
  descartado, não guardado para depois.
- Sequencer: com o módulo ativo, passos `sprite` vão por ele (`.locally()`); sem ele, sprite
  PIXI próprio. Com movimento reduzido usa sempre o backend próprio.
- API: `api.effects.register(chave, passos)`, `api.effects.unregister(chave)` e
  `api.effects.play({name, source?, targets?, point?, qualifiers?})`. Passos aceitos:
  `procedural`, `synth`, `sound` (`ogg`, `mp3`, `wav`) e `sprite` (`webm`, `webp`, `png`,
  `svg`), com caminho relativo do Foundry, sem `..` nem URL.

## Como ficou na E5

- Código: `src/domain/pack.ts` (manifesto, validação, lista salva), `src/domain/overrides.ts`
  (associações do mestre), `src/effects/packs.ts` (carrega e ativa), `src/integrations/
  foundry/pack-store.ts` (ajustes de mundo, leitura do manifesto, FilePicker),
  `src/ui/pack-manager.ts` e `src/ui/cue-editor.ts` (janelas do mestre).
- Ordem de procura de cada chave (D27): associação do mestre → pacotes ativos (na ordem da
  lista; depois os registrados por código) → cues de `api.effects.register` → padrão próprio.
  Continua valendo "chave mais específica primeiro" (D25).
- Ajustes de mundo (só o mestre grava; todos recarregam pelo `onChange`):
  `packs` = `[{folder, enabled}]` e `cueOverrides` = `{chave: {choice, sound, volume}}`.
  O manifesto é lido de novo a cada carga (`fetch` sem cache) e validado de novo; o mundo
  guarda só a pasta.
- Importador (Configurar ajustes → Combat Kit → "Gerenciar pacotes"): "Adicionar pasta…" abre
  o FilePicker em modo pasta (dados do usuário ou do núcleo), valida, mostra título, id,
  versão e contagens ou cada erro; pacote inválido fica na lista desligado e não pode ser
  ligado. Subir na lista muda a prioridade; validar de novo relê o arquivo.
- Editor ("Editar efeitos"): uma linha por evento e por chave que algum efeito ativo
  define. Efeito: Automático, Silenciar ou qualquer cue do mesmo evento de qualquer fonte
  (pacote, código, módulo). Som: arquivo de áudio escolhido no FilePicker substitui os
  passos de som do efeito e mantém os visuais; volume 0–1,5. "Restaurar tudo" apaga as
  associações. Associação que aponta para pacote desligado é ignorada.
- Edição pessoal: `build:personal` grava `flags["cyberpunk-combat-kit"].personalPack =
  "personal"` no `module.json` quando `private/pack/` existe; no `ready` o módulo lê
  `modules/cyberpunk-combat-kit/personal/cck-pack.json` e registra como pacote de código.
  A edição pública não tem a flag e não faz requisição nenhuma.
- API: `api.packs.register(manifesto, pasta)` devolve `{ok, pack}` ou `{ok: false, errors}`;
  `api.packs.unregister(id)`; `api.packs.active()`.
- Validação (testes em `tests/unit/pack.test.ts`): id `[a-z0-9-]` (sem `default`/`code`,
  reservados), versão `1.0.0[-tag]`, título até 80, `kinds` em `cues`/`quickhacks`
  (ausente = `cues`), pasta sem `..`, `.`, barra inicial, `\` nem esquema; assets só com
  extensão da lista e caminho relativo seguro; passo com `asset` precisa de asset declarado
  e do tipo certo para o passo; limites de 200 assets, 200 cues, 100 Quickhacks e 256 KB.
  Quickhack: `id`, `name`, `tier` (1–10), `dv` (1–40), `icon` opcional, `alerts`
  (padrão verdadeiro), `requiresUnaware` (padrão falso) e `effect`: `{type: "damage",
  formula: "2d6", ongoing?}` (fórmula `NdX` ou número, com `+/-` opcional), `{type:
  "status", status: "<id de condição do Foundry>", rounds?}`, `{type: "criticalInjury",
  injury: "<nome no compêndio do sistema>", rounds?}` ou `{type: "guided"}`; `rounds` de 1
  a 1200. Uso no motor: docs/ARCHITECTURE.md ("Quickhacks (R09)").

## Como ficou na E11 (animações de módulos instalados)

- **Assets de outro módulo (D45)**: o manifesto ganha `requires` (ids de módulo, até 10) e
  `external` (`{chave: "modules/<id>/caminho"}`, mesmas regras de caminho seguro; o `<id>`
  tem de estar em `requires`). As chaves de `external` dividem o espaço de nomes com
  `assets`. Qualquer valor de `assets` ou `external` pode ser uma lista de até 8 arquivos.
  Módulo exigido inativo: o pacote carrega, os passos com arquivos dele saem e, se o passo de
  sprite tiver `fallback`, vira o efeito procedural; o gerenciador avisa qual módulo falta.
  Com o Automated Animations ativo, o gerenciador avisa que pode haver animação dobrada.
- **Sprite (D46, D47)**: `src` aceita lista. Em `at: "path"` o motor escolhe pela
  distância a menor variante com `_NNft_` no nome que cobre o alvo (metros × 3,28; acima da
  maior, a maior); fora de `path`, sorteia. `template: [grade, início, fim]` em pixels do
  vídeo diz onde o projétil começa e termina: o motor estica só o trecho útil até o alvo e
  mantém a proporção (convenção dos vídeos de distância: `[200, 200, 200]`; golpes:
  `[200, 300, 300]`). Opções: `duration` (sem ela, a duração do vídeo; imagem 1 s),
  `opacity`, `playbackRate` (0,25–4), `randomOffset`, `delay`, `repeat` (até 10) com
  `repeatDelay`, `fallback` (efeito procedural se o arquivo não carregar) e `scale` até 10.
  Passo com essas opções vai sempre pelo backend próprio; o Sequencer só recebe o passo simples.
- **Som (D47)**: `src` aceita lista (sorteia), `startTime` (ms, começa no meio do arquivo),
  `delay`, `repeat`, `repeatDelay`; FLAC aceito.
- **Qualificadores (D48)**: antes dos que já existiam vêm `item-<slug do nome da arma>`,
  `ammo-<variedade>-<tipo>` e `ammo-<variedade>` (munição carregada, ids do sistema, como
  `ammo-rifle-armorPiercing`). Ordem das chaves: cada identidade (item, munição, tipo de
  arma) combinada com cada forma, depois sozinha; depois as formas; depois o evento. Sem item
  nem munição fica igual à D38. Eventos de área (`area.place`, `area.detonate`) também
  recebem os qualificadores da arma.
- **Efeitos persistentes (D49)**: evento `status.active:<id do estado ou slug do nome do
  efeito ativo>`; só passos `sprite` com `persist: true`, até 4 por token, presos ao token
  (seguem o movimento, escondem com ele). Cada cliente reconcilia o que deve aparecer a partir
  do estado dos tokens da cena (`canvasReady`, efeitos ativos, tokens, atores e mudança de
  pacotes); nada trafega nem é gravado. Ajuste de cliente "Efeitos persistentes de estado".
- **Pré-carga**: 1,5 s depois de abrir a cena, carrega os vídeos de `attack.fire`,
  `attack.hit` e `area.detonate` das armas dos tokens da cena (até 60 arquivos).
- **Conversor (D50)**: `scripts/import-aa.mjs` transforma uma exportação "autorec" do
  Automated Animations num pacote. Detalhe na seção abaixo.

## Conversor de exportação do Automated Animations

```text
node scripts/import-aa.mjs --export <autorec.json> --sounds <pasta dos sons>
  --animations <arquivo de banco de animações no formato do AA> --modules <Data/modules>
  --system <pasta do sistema CPR> --out <pasta do pacote> [--module JB2A_DnD5e]
  [--id aa-import] [--title "..."] [--overrides <ajustes.json>]
```

- Lê os menus `melee`, `range`, `preset` (`proToTemp`) e `aefx` (`ontoken`); o resto vai
  para o relatório como não suportado. Ignora partes desligadas, `meleeSwitch`, `levels3d`
  e macros.
- Rótulo → chave: `"<calibre> (<tipo>)"` casa com `CPR.ammoVarieties` e `CPR.ammoTypes`
  (rótulos do `lang/en.json` do sistema, normalizados: sem "Ammo", singular) e vira
  `ammo-<variedade>-<tipo>`; rótulo de tipo de arma vira o tipo; o resto vira `item-<slug>`;
  `aefx` vira `status.active:<slug>`. "... No Template" é coberto pelo preset do cartucho.
- `range` e `melee` → `attack.fire` com sprite em `path` (modelo de distância ou de golpe,
  reserva `tracer`/`impact`) e som; secundário ligado → sprite no alvo. `preset` →
  `attack.fire` (projétil até o ponto) e `area.detonate` (explosão no ponto, tamanho 5
  quadrados × escala do AA, reserva `explosion`); em cartucho, o impacto vai para
  `attack.hit`. `aefx` → sprite persistente no token.
- Vídeo: chave do AA (`seção.tipo.animação.variante.cor`) procurada no banco de animações
  passado em `--animations` (lido como dado, sem executar); só arquivos que existem no
  módulo de `--module` dentro de `--modules`. Sem a cor: outra cor da mesma animação; sem
  variante: outra variante. Caminho próprio de outro módulo: mesmo caminho no módulo alvo ou
  mesmo nome de arquivo. Tudo no relatório.
- Ajustes (`--overrides`): `keys` (`"menu:rótulo": "chave"` ou `null` para tirar; o
  impacto de preset é `"preset-impact:rótulo"`), `videos` (chave do AA ou caminho próprio →
  outra chave do banco ou caminho de arquivo) e `extra` (`"chave nova": {from, sound,
  volume?}`: copia os visuais de outro efeito e troca o som).
- Saída: `cck-pack.json` (com `requires` e `external`), `sounds/` (só os usados, nomes em
  slug) e `import-report.json` (convertidos, ignorados com motivo, nota de cada vídeo,
  rótulos pelo nome do item, munição sem casamento, sons). Mesma entrada, mesmo arquivo.
- Testes: `tests/unit/import-aa.test.ts` com exportação, banco, sistema e módulo fictícios.

## Formato de pacote

Pasta com `cck-pack.json` na raiz, colocada em `Data/` do Foundry (ex.:
`Data/cck-packs/<id>/`) ou dentro de outro módulo. Manifesto:

```json
{
  "id": "meu-pacote",
  "version": "1.0.0",
  "title": "Meu pacote",
  "kinds": ["cues", "quickhacks"],
  "assets": { "shot": "sounds/shot.ogg", "spark": "fx/spark.webm" },
  "cues": {
    "attack.fire:pistol": [{ "type": "sound", "asset": "shot", "volume": 0.8 }],
    "attack.hit": [{ "type": "sprite", "asset": "spark", "at": "target" }]
  },
  "quickhacks": [
    { "id": "exemplo", "name": "Exemplo", "tier": 1, "dv": 6, "icon": "icons/exemplo.webp",
      "effect": { "type": "damage", "formula": "2d6" } },
    { "id": "outro", "name": "Outro", "tier": 3, "dv": 10, "alerts": false,
      "requiresUnaware": true, "effect": { "type": "guided" } }
  ]
}
```

- Chave de cue: `evento[:qualificador]` (tipo de arma, modo, id de Quickhack) ou
  `evento:qualificador+qualificador` (no máximo dois; o primeiro é o tipo de arma).
- Passo `sprite` parado (`at` diferente de `path`) usa `scale` × grade como largura e mantém
  a proporção da imagem.
- Caminhos relativos ao manifesto; validação no domínio rejeita `..`, URLs externas e tipos
  fora da lista (`ogg`, `mp3`, `wav`, `webm`, `webp`, `png`, `svg`, `json`).
- Passos dos cues como na E4 (`procedural`, `synth`, `sound`, `sprite`); em `sound` e
  `sprite`, `asset` (chave de `assets`) no lugar de `src`.

## Conteúdo padrão da edição pública

Só criação própria: efeitos procedurais em PIXI e sons sintetizados ou gravados por nós
(ou de banco CC0 com registro em `THIRD_PARTY_NOTICES.md`). Nenhum asset dos módulos Pneuma
sem licença. Quickhacks: nenhum (o exemplo acima é fictício).
