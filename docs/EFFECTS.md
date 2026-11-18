# Efeitos audiovisuais e pacotes de conteúdo

Status: proposta (R07, R08, R09, R12). Nada implementado.

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
