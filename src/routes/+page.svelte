<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  onMount(() => {
    goto('/projects');
  });
</script>

<div class="flex-1 flex items-center justify-center text-primary">
  Carregando...
</div>
