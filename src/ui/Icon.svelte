<script lang="ts">
  let { icon, size = 24 }: { icon: string; size?: number } = $props();

  // Een icon is ofwel een emoji, ofwel een pad naar een pixel-art afbeelding.
  const isImage = $derived(icon.includes('/'));
</script>

{#if isImage}
  <img class="pixel" src={icon} width={size} height={size} alt="" aria-hidden="true" />
{:else}
  <span style="font-size: {size}px; line-height: 1;" aria-hidden="true">{icon}</span>
{/if}

<style>
  .pixel {
    image-rendering: pixelated;
    display: block;
  }
</style>
