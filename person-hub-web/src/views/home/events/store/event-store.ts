import EventModel from '../api-services/models/EventModel'

export interface EventModuleStoreState {
  events: Array<EventModel>
  eventsUpdatedTime: Date
}

export const eventStore = {
  namespaced: true,
  state(): EventModuleStoreState {
    return {
      events: new Array<EventModel>(),
      eventsUpdatedTime: null,
    }
  },
  mutations: {
    updateEventList(
      state: EventModuleStoreState,
      events: Array<EventModel>
    ): void {
      state.events = [...events]
      state.eventsUpdatedTime = new Date()
    },
  },
  actions: {},
}
