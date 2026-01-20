<script lang="ts">
  import { setDialogOpen } from '$lib/stores/dialogState';
  
  interface Option {
    value: string;
    label: string;
  }
  
  interface Props {
    value: string;
    options: Option[];
    onchange?: (value: string) => void;
    class?: string;
  }
  
  let { value = $bindable(), options, onchange, class: className = '' }: Props = $props();
  
  function handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    value = target.value;
    onchange?.(value);
  }
  
  function handleFocus() {
    setDialogOpen(true);
  }
  
  function handleBlur() {
    // Small delay to ensure the dropdown close completes before allowing window hide
    setTimeout(() => setDialogOpen(false), 100);
  }
</script>

<select 
  {value}
  onchange={handleChange}
  onfocus={handleFocus}
  onblur={handleBlur}
  class="px-2 py-1 bg-[#1c1c1c] border border-[#3d3a34] text-[#d6d6d6] text-sm focus:outline-none focus:border-[#909d63] appearance-none cursor-pointer {className}"
  style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23828282%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.5rem center; background-size: 1em; padding-right: 2rem;"
>
  {#each options as opt}
    <option value={opt.value} class="bg-[#1c1c1c] text-[#d6d6d6]">{opt.label}</option>
  {/each}
</select>
