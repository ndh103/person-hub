<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import EventApiService from './api-services/EventApiService'

  const emit = defineEmits<{
    (event: 'onFilterByTag', data: string)
  }>()

  const state = ref({
    tags: new Array<string>(),
    selectedTag: '',
  })

  onMounted(async () => {
    await fetchTopTags()
  })

  async function refresh() {
    await fetchTopTags()
    state.value.selectedTag = ''
  }

  async function fetchTopTags() {
    var response = await EventApiService.queryTopTags()

    if (response) {
      state.value.tags = response.data
    }
  }

  function filterByTag(tag: string) {
    if (state.value.selectedTag == tag) {
      state.value.selectedTag = ''
    } else {
      state.value.selectedTag = tag
    }

    emit('onFilterByTag', state.value.selectedTag)
  }

  defineExpose({
    refresh,
  })
</script>

<template>
  <div class="mb-5 mt-2">
    <span class="mr-5">Top Tags</span>
    <span
      v-for="(tag, tagIndex) in state.tags"
      :key="tagIndex"
      class="mt-1 cursor-pointer"
      :class="[state.selectedTag == tag ? 'app-chip-primary' : 'app-chip-simple']"
      @click="filterByTag(tag)"
    >
      {{ tag }}
    </span>
  </div>
</template>
