# Efeitos audiovisuais e pacotes de conteúdo

Status: motor de cues, efeitos próprios, sons e ajustes de cliente implementados na E4
(R07); pacotes e importador (R08) ficam para a E5; Quickhacks (R09) para a E6.

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
  registrado por código antes do padrão (D25).
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
- API (até a E5): `api.effects.register(chave, passos)`, `api.effects.unregister(chave)` e
  `api.effects.play({name, source?, targets?, point?, qualifiers?})`. Passos aceitos:
  `procedural`, `synth`, `sound` (`ogg`, `mp3`, `wav`) e `sprite` (`webm`, `webp`, `png`,
  `svg`), com caminho relativo do Foundry, sem `..` nem URL.

## Formato de pacote

Pasta com `cck-pack.json` na raiz, colocada em `Data/` do Foundry (ex.:
`Data/cck-packs/<id>/`) ou dentro de outro módulo. Proposta de manifesto:

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
      "effect": { "type": "guided" } }
  ]
}
```

- Chave de cue: `evento[:qualificador]` (tipo de arma, modo, id de Quickhack).
- Caminhos relativos ao manifesto; validação no domínio rejeita `..`, URLs externas e tipos
  fora da lista (`ogg`, `mp3`, `wav`, `webm`, `webp`, `png`, `svg`, `json`).
- Importador (GM): escolhe a pasta pelo `FilePicker`, valida, mostra o que o pacote traz,
  ativa/desativa e permite reatribuir cada evento.
- Pacotes registrados por código: `api.packs.register(manifest)` (é assim que a edição
  pessoal entra, docs/PERSONAL.md).

## Conteúdo padrão da edição pública

Só criação própria: efeitos procedurais em PIXI e sons sintetizados ou gravados por nós
(ou de banco CC0 com registro em `THIRD_PARTY_NOTICES.md`). Nenhum asset dos módulos Pneuma
sem licença. Quickhacks: nenhum (o exemplo acima é fictício).
