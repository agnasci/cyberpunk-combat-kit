# Integração: API v1 para macros e outros módulos

Contrato público do Combat Kit (R11, D30). Tudo o que não está aqui é interno e pode mudar
sem aviso. Mudança incompatível neste contrato sobe `version`.

## Onde fica

```js
const cck = game.modules.get("cyberpunk-combat-kit")?.api;
if (cck?.version !== 1) return ui.notifications.warn("Combat Kit API v1 indisponível");
```

A API existe a partir do `ready`. Outro módulo que carregue antes pode esperar o hook:

```js
Hooks.once("cckReady", (api) => {
  if (api.version === 1) minhaIntegracao(api);
});
```

O objeto é congelado; não acrescente nem troque membros.

## Referência a token

Onde a API pede um token (`attacker`, `target`) aceita: o `Token` do canvas, o `TokenDocument`
ou uma string com o UUID do token, o id do token na cena aberta ou o UUID do ator (primeiro
token dele na cena). Só tokens da cena aberta contam.

- `attacker` precisa ser um token que o usuário atual possui. Sem `attacker`: o único token
  controlado.
- `target` sem valor: o único alvo marcado pelo usuário.

## Membros

| Membro | Retorno | O que faz |
|---|---|---|
| `version` | `1` | Versão do contrato |
| `attack(options?)` | `Promise<void>` | Fluxo completo de ataque: rolagem nativa, defesa, dano pelo mestre, card com desfazer, efeitos |
| `applyDamage(options)` | `Promise<{ok, result}>` ou `Promise<{ok: false, error}>` | Dano direto pelo `_applyDamage` do sistema (armadura, ablação, cabeça), com card e desfazer |
| `grapple(options)` | `Promise<void>` | Agarrão: `{action: "grab" \| "choke" \| "throw" \| "escape" \| "release", skipDialog?}` |
| `effects.register(key, steps)` | `boolean` | Registra um cue por código (formato em docs/EFFECTS.md) |
| `effects.unregister(key)` | | Remove um cue registrado por código |
| `effects.play(input)` | | Toca um evento: `{name, source?, targets?, point?, qualifiers?}` |
| `packs.register(manifest, folder)` | `{ok, ...}` | Pacote de conteúdo por código (docs/EFFECTS.md) |
| `packs.unregister(id)` / `packs.active()` | | Remove / lista pacotes ativos |
| `quickhacks.run(options)` / `quickhacks.list()` | | Netrunning (só com o ajuste ligado; docs/ARCHITECTURE.md) |

### `attack(options)`

| Campo | Padrão | Valores |
|---|---|---|
| `attacker` | token controlado | referência a token |
| `target` | alvo marcado | referência a token; ignorado em fogo de supressão, cartucho e explosivo (a área é posicionada no canvas) |
| `weaponId` | arma equipada | id do item de arma no ator |
| `mode` | `"single"` | `"single"`, `"aimed"`, `"autofire"`, `"suppressive"`, `"thrown"` (conforme a arma) |
| `location` | `"head"` | só no mirado: `"head"`, `"heldItem"`, `"leg"` |
| `skipDialog` | `false` | `true` pula os diálogos de rolagem do sistema |

Recusas (sem arma, sem munição, fora de alcance, sem mestre ativo) aparecem como aviso na tela
e a promessa termina sem erro. O resultado sai no hook `cckAttackResolved`.

### `applyDamage(options)`

| Campo | Padrão | Valores |
|---|---|---|
| `attacker` | token controlado | referência a token (quem causa; precisa ser seu) |
| `target` | alvo marcado | referência a token |
| `damage` | obrigatório | inteiro de 0 a 500, já rolado |
| `location` | `"body"` | `"body"` ou `"head"` (o sistema aplica a regra de acerto na cabeça) |
| `ablation` | `1` | 0 a 20; quanto a armadura perde se o dano passar |
| `bonusDamage` | `0` | 0 a 50; dano extra que ignora armadura (como em crítico) |
| `ignoreArmor` | `false` | `true` ignora toda a armadura |
| `lethal` | `true` | `false` para dano não letal |
| `label` | "Macro" | até 60 caracteres; nome no card |
| `card` | `true` | `false` não posta card (sem desfazer) |

Erros devolvidos em `error`: `not-object`, `bad-damage`, `bad-location`, `bad-ablation`,
`bad-bonus`, `bad-label`, `no-canvas`, `no-attacker`, `no-target`, `no-gm`, ou uma chave
`CCK.Gm.*` vinda do executor do mestre (`forbidden`, `timeout`, `not-found`, `failed`).

`result`: `{hpBefore, hpAfter, hpReduction, ablation, location}`.

## Hooks

Disparados com `Hooks.callAll` **só no cliente que executou a ação** (para todos os clientes,
observe `createChatMessage` com a flag `flags["cyberpunk-combat-kit"].resolution`). Os dados
são cópias; alterá-los não muda nada.

| Hook | Dados | Quando |
|---|---|---|
| `cckReady` | a API | No `ready`, depois de a API existir |
| `cckAttackResolved` | estado do card (`attackerUuid`, `attackerName`, `weaponName`, `mode`, `attackTotal`, `damageTotal`, `critical`, `targets[]` com `uuid`, `name`, `outcome`, `defense`, `applied`) | Card de ataque ou agarrão postado |
| `cckQuickhackResolved` | o mesmo formato, `mode` = `jackIn`, `breach`, `quickhack`, `forceOut` ou `ongoing` | Card de Netrunning postado |
| `cckDamageApplied` | `{attackerUuid, targetUuid, source, result}`; `source` = `attack`, `quickhack`, `ongoing` ou `direct` | Dano que tirou PV ou armadura |

## Macro de exemplo

Ataca o alvo marcado com a arma equipada do token selecionado e, se acertar, aplica 2 de dano
extra de "sangramento" sem armadura:

```js
const cck = game.modules.get("cyberpunk-combat-kit")?.api;
if (cck?.version !== 1) return ui.notifications.warn("Combat Kit API v1 indisponível");
const target = [...game.user.targets][0];
if (!target) return ui.notifications.warn("Marque um alvo");

let resolved = null;
const hook = Hooks.once("cckAttackResolved", (state) => (resolved = state));
await cck.attack({ target, mode: "single" });
Hooks.off("cckAttackResolved", hook);
if (resolved?.targets[0]?.outcome === "hit") {
  const outcome = await cck.applyDamage({ target, damage: 2, ignoreArmor: true, label: "Sangramento" });
  if (!outcome.ok) console.warn("Combat Kit:", outcome.error);
}
```

Dano direto sem rolagem de ataque, de um token específico para outro:

```js
const cck = game.modules.get("cyberpunk-combat-kit").api;
await cck.applyDamage({
  attacker: "Scene.abc.Token.def",
  target: "Scene.abc.Token.ghi",
  damage: 9,
  label: "Armadilha",
});
```

## Character Panel

Quando o Character Panel está ativo, o Combat Kit se registra nele pela API do painel (aba
"Combate", fim da barra e dock). Detalhe em docs/ARCHITECTURE.md ("Integração com o Character
Panel"). Outros módulos não precisam fazer nada para isso.
