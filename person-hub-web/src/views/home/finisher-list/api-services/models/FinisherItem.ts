import FinisherItemStatus from './FinisherItemStatus'

export default class FinisherItem {
  id!: number
  title!: string
  description!: string
  startDate!: Date
  finishDate!: Date
  tags!: Array<string>
  status!: FinisherItemStatus
}
