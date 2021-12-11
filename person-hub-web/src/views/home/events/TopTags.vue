<template>
  <div class="mb-5 mt-2">
    <span class="mr-5">Top Tags</span>
    <span
      v-for="(tag, tagIndex) in tags"
      :key="tagIndex"
      class="mt-1 cursor-pointer"
      :class="[selectedTag == tag ? 'app-chip-primary' : 'app-chip-simple']"
      @click="filterByTag(tag)"
    >
      {{ tag }}
    </span>
  </div>
</template>

<script lang="ts">
  import { defineComponent } from 'vue'
  import EventApiService from './api-services/EventApiService'
  export default defineComponent({
    emits: ['onFilterByTag'],
    data() {
      return {
        tags: new Array<string>(),
        selectedTag: '',
      }
    },
    async created() {
      await this.fetchTopTags()
    },
    methods: {
      async refresh() {
        await this.fetchTopTags()
        this.selectedTag = ''
      },
      async fetchTopTags() {
        var response = await EventApiService.queryTopTags()

        if (response) {
          this.tags = response.data
        }
      },
      filterByTag(tag: string) {
        if (this.selectedTag == tag) {
          this.selectedTag = ''
        } else {
          this.selectedTag = tag
        }

        this.$emit('onFilterByTag', this.selectedTag)
      },
    },
  })
</script>
