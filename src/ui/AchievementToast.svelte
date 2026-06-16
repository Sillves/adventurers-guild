<script lang="ts">
  import { onMount } from "svelte";
  import { ACHIEVEMENTS } from "../content/achievements";

  let { id, ondismiss }: { id: string; ondismiss: () => void } = $props();

  const achievement = $derived(ACHIEVEMENTS.find((a) => a.id === id));

  // verdwijnt vanzelf na een paar seconden; klikken dismist meteen
  onMount(() => {
    const timer = setTimeout(ondismiss, 4500);
    return () => clearTimeout(timer);
  });
</script>

{#if achievement !== undefined}
  <button class="toast" onclick={ondismiss}>
    <span class="icon">{achievement.icon}</span>
    <span class="text">
      <span class="label">Achievement unlocked!</span>
      <strong>{achievement.name}</strong>
    </span>
  </button>
{/if}

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 18px;
    background: var(--panel-raised);
    border: 1px solid var(--gold);
    border-radius: 999px;
    box-shadow: 0 4px 20px rgb(0 0 0 / 0.4);
    color: var(--text);
    text-align: left;
    animation: toast-in 0.25s ease-out;
  }
  .icon { font-size: 26px; line-height: 1; flex: none; }
  .text { display: grid; }
  .label { color: var(--gold); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
  @keyframes toast-in {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .toast { animation: none; }
  }
</style>
