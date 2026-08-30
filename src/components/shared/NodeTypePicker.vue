<script setup>
defineEmits(['select'])
</script>

<template>
  <div class="node-type-picker" role="menu">
    <p>Select node type</p>
    <button type="button" role="menuitem" @click="$emit('select', 'percentage')">
      <span class="node-type-icon">%</span>
      <span>Percentage</span>
    </button>
    <button type="button" role="menuitem" @click="$emit('select', 'value')">
      <span class="node-type-icon">#</span>
      <span>Value</span>
    </button>
  </div>
</template>

<style scoped>
.node-type-picker {
  position: relative;
  display: grid;
  box-sizing: border-box;
  width: 14rem;
  gap: 0.4rem;
  padding: 0.65rem;
  border: 1px solid #d8d8d8;
  border-radius: 0.9rem;
  background: #ffffff;
  box-shadow: 0 0.8rem 2.25rem rgb(0 0 0 / 16%);
}

.node-type-picker::after {
  position: absolute;
  top: 100%;
  left: 50%;
  width: 0.7rem;
  height: 0.7rem;
  border-right: 1px solid #d8d8d8;
  border-bottom: 1px solid #d8d8d8;
  background: #ffffff;
  content: '';
  transform: translate(-50%, -50%) rotate(45deg);
}

p {
  margin: 0;
  padding: 0.35rem 0.45rem 0.2rem;
  color: #6a6a6a;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

button {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem;
  border: 0;
  border-radius: 0.65rem;
  background: transparent;
  color: #181818;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: left;
}

button:hover {
  background: #f0f0f0;
}

button:focus-visible {
  outline: 3px solid rgb(0 0 0 / 22%);
  outline-offset: 3px;
}

.node-type-icon {
  display: grid;
  width: 2rem;
  height: 2rem;
  border-radius: 0.55rem;
  background: #181818;
  color: #ffffff;
  font-size: 1rem;
  place-items: center;
}
</style>
