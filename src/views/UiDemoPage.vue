<script setup>
import { ref } from 'vue'
import PercentageCard from '../components/PercentageCard.vue'
import ValueCard from '../components/ValueCard.vue'

const valueCardName = ref('')
const valueCardDescription = ref('')
const valueCardIsStatic = ref(false)
const valueCardValue = ref('0')
const valueCardTime = ref(0)
const valueCardTimeUnit = ref('Seconds')
const valueCardOperation = ref('+')
const valueCardTimeLimitEnabled = ref(false)
const timeLimitType = ref('duration')
const valueCardTimeLimit = ref({
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
const percentageCardIsStatic = ref(true)
const percentageCardReferenceValue = ref('0')
const percentageCardPercentage = ref('0')
const percentageCardTime = ref(0)
const percentageCardTimeUnit = ref('Seconds')
const percentageCardOperation = ref('+')
const percentageCardTimeLimitEnabled = ref(false)
const percentageCardTimeLimit = ref({
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
</script>

<template>
  <main class="demo-page">
    <header class="demo-header">
      <div>
        <p class="eyebrow">Component gallery</p>
        <h1>UI demo</h1>
      </div>
      <RouterLink class="home-link" to="/">Back to start</RouterLink>
    </header>

    <div class="content">
      <ValueCard
        v-model:operation="valueCardOperation"
        v-model:name="valueCardName"
        v-model:description="valueCardDescription"
        v-model:is-static="valueCardIsStatic"
        v-model:value="valueCardValue"
        v-model:time="valueCardTime"
        v-model:time-unit="valueCardTimeUnit"
        v-model:time-limit-enabled="valueCardTimeLimitEnabled"
        v-model:time-limit="valueCardTimeLimit"
        :time-limit-type="timeLimitType"
      />

      <PercentageCard
        v-model:operation="percentageCardOperation"
        v-model:name="percentageCardName"
        v-model:description="percentageCardDescription"
        v-model:is-static="percentageCardIsStatic"
        v-model:reference-value="percentageCardReferenceValue"
        v-model:percentage="percentageCardPercentage"
        v-model:time="percentageCardTime"
        v-model:time-unit="percentageCardTimeUnit"
        v-model:time-limit-enabled="percentageCardTimeLimitEnabled"
        v-model:time-limit="percentageCardTimeLimit"
        :time-limit-type="timeLimitType"
      />
    </div>
  </main>
</template>

<style scoped>
.demo-page {
  display: flex;
  box-sizing: border-box;
  min-height: 100vh;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem 1rem;
}

.demo-header,
.content {
  width: min(36rem, 100%);
}

.demo-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  color: #666666;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: -0.035em;
}

.home-link {
  color: #222222;
  font-weight: 700;
  text-underline-offset: 0.2rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (max-width: 28rem) {
  .demo-header {
    align-items: start;
    flex-direction: column;
  }
}
</style>
