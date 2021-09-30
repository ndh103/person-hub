import store from '@/store/index'
import EventModel from '../api-services/models/EventModel'
import { EventModuleStoreState, eventStore } from './event-store'

const state = store.state['events'] as EventModuleStoreState

class EventStoreService {
  updateEventList(events: Array<EventModel>) {
    store.commit(`events/${eventStore.mutations.updateEventList.name}`, events)
  }

  state = state
}

export default new EventStoreService()
