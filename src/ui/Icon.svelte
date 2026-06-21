<script lang="ts">
  let { icon, size = 24 }: { icon: string; size?: number } = $props();

  // Een icon is ofwel een emoji, ofwel een pad naar een afbeelding.
  const isImage = $derived(icon.includes('/'));
  // Helden-sprites zijn pixel-art (scherp opschalen); de UI-iconen uit
  // public/icons/ zijn vlakke vector-PNG's en moeten juist glad blijven.
  const pixelated = $derived(icon.includes('sprites/'));
</script>

{#if isImage}
  <img class="img" class:pixel={pixelated} src={icon} width={size} height={size} alt="" aria-hidden="true" />
{:else}
  <span style="font-size: {size}px; line-height: 1;" aria-hidden="true">{icon}</span>
{/if}

<style>
  /* inline-block + vertical-align zodat een icoon zowel los (flex) als náást
     tekst netjes uitlijnt, zonder de regel te breken of een baseline-gat */
  .img { display: inline-block; vertical-align: middle; }
  .pixel { image-rendering: pixelated; }
</style>
