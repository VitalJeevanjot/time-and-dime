<script setup>
import { ref } from 'vue'
import PercentageCard from './components/PercentageCard.vue'
import ValueCard from './components/ValueCard.vue'

const valueCardName = ref('')
const valueCardDescription = ref('')
const valueCardValue = ref(0)
const valueCardTime = ref(0)
const valueCardTimeUnit = ref('Seconds')
const valueCardOperation = ref('+')
const valueCardTimeLimitEnabled = ref(false)
const valueCardTimeLimit = ref({
  mode: 'duration',
  from: {
    value: 0,
    unit: 'Seconds',
    date: '',
    hours: '00',
    minutes: '00',
    seconds: '00',
  },
  until: {
    value: 0,
    unit: 'Seconds',
    date: '',
    hours: '00',
    minutes: '00',
    seconds: '00',
  },
})

const percentageCardName = ref('')
const percentageCardDescription = ref('')
const percentageCardPercentage = ref(0)
const percentageCardValueSource = ref('Original')
const percentageCardTime = ref(0)
const percentageCardTimeUnit = ref('Second')
const percentageCardOperation = ref('+')
</script>

<template>
  <main class="page">
    <div class="content">
      <ValueCard
        v-model:operation="valueCardOperation"
        v-model:name="valueCardName"
        v-model:description="valueCardDescription"
        v-model:value="valueCardValue"
        v-model:time="valueCardTime"
        v-model:time-unit="valueCardTimeUnit"
        v-model:time-limit-enabled="valueCardTimeLimitEnabled"
        v-model:time-limit="valueCardTimeLimit"
      />

      <PercentageCard
        v-model:operation="percentageCardOperation"
        v-model:name="percentageCardName"
        v-model:description="percentageCardDescription"
        v-model:percentage="percentageCardPercentage"
        v-model:value-source="percentageCardValueSource"
        v-model:time="percentageCardTime"
        v-model:time-unit="percentageCardTimeUnit"
      />
    </div>
  </main>
</template>

<style scoped>
.page {
  display: grid;
  box-sizing: border-box;
  min-height: 100vh;
  padding: 2rem 1rem;
  place-items: center;
}

.content {
  display: flex;
  width: min(36rem, 100%);
  flex-direction: column;
  gap: 2rem;
}
</style>
