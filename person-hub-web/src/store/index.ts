import { createStore } from 'vuex'

import { appModuleStore } from './application/application-store'
import { eventStore } from '@/views/home/events/store/event-store'
import { todoStore } from '@/views/home/todos/store/todo-store'
import { finisherListStore } from '@/views/home/finisher-list/store/finisher-list-store'

export default createStore({
  modules: {
    application: appModuleStore,
    events: eventStore,
    todos: todoStore,
    finisherList: finisherListStore,
  },
})
