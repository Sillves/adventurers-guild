<script lang="ts">
  import { HEROES } from '../content/heroes';
  import { game } from './game.svelte';
  import Icon from './Icon.svelte';

  // Max zichtbare figuurtjes per heldtype, anders wordt de tuin een mensenzee.
  const VISIBLE_PER_HERO = 8;

  // Deterministische pseudo-random uit een string-seed, zodat elke held altijd
  // op dezelfde plek staat en re-renders niets verschuiven. FNV-1a plus een
  // murmur-finalizer: zonder die laatste klitten bijna-gelijke seeds samen.
  function rand(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
      h ^= seed.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  interface Sprite {
    readonly key: string;
    readonly icon: string;
    readonly left: number;
    readonly top: number;
    readonly delay: number;
  }

  const sprites = $derived.by(() => {
    const list: Sprite[] = [];
    for (const hero of HEROES) {
      const count = game.state.heroes[hero.id] ?? 0;
      for (let i = 0; i < Math.min(count, VISIBLE_PER_HERO); i++) {
        const key = `${hero.id}:${i}`;
        list.push({
          key,
          icon: hero.icon,
          left: 6 + rand(`${key}x`) * 88,
          top: 12 + rand(`${key}y`) * 72,
          delay: rand(`${key}d`) * 2.6,
        });
      }
    }
    // lager in beeld = dichterbij, dus later in de DOM (overlapt wat erboven staat)
    return list.sort((a, b) => a.top - b.top);
  });
</script>

{#if sprites.length > 0}
  <div class="yard" aria-hidden="true">
    {#each sprites as sprite (sprite.key)}
      <span class="sprite" style="left: {sprite.left}%; top: {sprite.top}%;">
        <span class="bob" style="animation-delay: -{sprite.delay}s">
          <Icon icon={sprite.icon} size={32} />
        </span>
      </span>
    {/each}
  </div>
{/if}

<style>
  .yard {
    position: relative;
    width: min(420px, 100%);
    height: 170px;
    background:
      radial-gradient(ellipse at 50% 110%, rgb(74 222 128 / 0.08), transparent 70%),
      var(--panel);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .sprite {
    position: absolute;
    transform: translate(-50%, -50%);
    animation: pop 0.35s ease-out;
  }
  .bob {
    display: inline-block;
    animation: bob 2.6s ease-in-out infinite alternate;
  }
  @keyframes pop {
    from { scale: 0; }
    60% { scale: 1.25; }
    to { scale: 1; }
  }
  @keyframes bob {
    from { translate: 0 -2px; }
    to { translate: 0 2px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sprite, .bob { animation: none; }
  }
</style>
