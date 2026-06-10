<script lang="ts">
  let { icon, size = 24 }: { icon: string; size?: number } = $props();
</script>

<span style="font-size: {size}px; line-height: 1;" aria-hidden="true">{icon}</span>
