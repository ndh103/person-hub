<script setup lang="ts">
  import { PropType, ref, defineEmits } from 'vue'
  import TodoTopicModel from './api-services/models/TodoTopicModel'
  import TopicOverview from './TopicOverview.vue'
  import ItemList from './ItemList.vue'

  const props = defineProps({
    topic: {
      type: Object as PropType<TodoTopicModel>,
      default: null,
    },
  })
  const emit = defineEmits<{
    (event: 'onTopicRemoved')
  }>()


  const state = ref({
    isExpand: true,
  })

  function onTopicRemoved(){
    emit('onTopicRemoved')
  }

  function handleToogleExpand(isExpand: boolean) {
    state.value.isExpand = isExpand
  }
</script>

<template>
  <div class="py-4">
    <TopicOverview :topic="props.topic" @onToogleExpand="handleToogleExpand($event)" @on-topic-removed="onTopicRemoved()" />
    <ItemList class="pl-8 topic-item-list" :topic-id="topic.id" :items="topic.todoItems" :isExpand="state.isExpand" />
  </div>
</template>


<style lang="postcss" scoped>
  /* Not show the handle icon when dragging */
  .topic-dragging .topic-item-list {
    @apply hidden !important;
  }

  /* Style for the item being drag */
  .sortable-drag .topic-item-list {
    @apply hidden !important;
  }

  /* Style for ghost, the preview item in the drop position */
  .sortable-ghost {
    @apply opacity-50 bg-gray-300;
  }
</style>