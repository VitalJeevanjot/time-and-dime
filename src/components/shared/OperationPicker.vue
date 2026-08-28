<script setup>
defineOptions({ name: 'OperationPicker' })

const operation = defineModel({ type: String, default: '+' })

const operations = [
  { name: 'Addition', symbol: '+' },
  { name: 'Subtraction', symbol: '-' },
  { name: 'Division', symbol: '/' },
  { name: 'Multiplication', symbol: '*' },
  { name: 'Modulus', symbol: '%' },
]
</script>

<template>
  <label class="operation-picker">
    <select v-model="operation" name="operation" aria-label="Operation">
      <option v-for="item in operations" :key="item.symbol" :value="item.symbol">
        {{ item.name }} ({{ item.symbol }})
      </option>
    </select>
  </label>
</template>

<style scoped>
.operation-picker {
  display: flex;
  width: min(18rem, 100%);
  flex-direction: column;
  margin-inline: auto;
  text-align: center;
}

select {
  box-sizing: border-box;
  width: 100%;
  padding: 1.2rem 1.1rem;
  border: 2px solid #464646;
  border-radius: 0.55rem;
  background: #181818;
  color: #f5f5f5;
  font: inherit;
  font-weight: 450;
  text-align: center;
}

select:focus {
  border-color: #737373;
  outline: 2px solid rgb(255 255 255 / 16%);
  outline-offset: 1px;
}
</style>
