import EventModel from '../api-services/models/EventModel'

export interface EventStoreState {
  events: Array<EventModel>
}

export const eventStore = {
  namespaced: true,
  state(): EventStoreState {
    return {
      events: new Array<EventModel>(),
    }
  },
}
