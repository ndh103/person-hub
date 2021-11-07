import EventModel from '../api-services/models/EventModel'

export default class MonthEventViewModel {
  month!: number
  events!: Array<EventModel>
}
