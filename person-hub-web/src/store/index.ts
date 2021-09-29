import { createStore } from 'vuex'

import { appModuleStore } from './application/application-store'
import { eventStore } from '@/views/home/events/store/event-store'
import { todoStore } from '@/views/home/todos/store/todo-store'

export default createStore({
  modules: {
    application: appModuleStore,
    events: eventStore,
    todos: todoStore,
  },
})
