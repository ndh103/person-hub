import FinisherList from '../FinisherList.vue'
import ItemDetails from '../ItemDetails.vue'

const finisherListRoutes = [
  {
    path: '/finisher-list',
    name: 'finisher-list-view',
    component: FinisherList,
    props: true,
  },
  {
    path: '/finisher-list/:itemId',
    name: 'finisher-item-details',
    component: ItemDetails,
    props: true,
  },
]

export default finisherListRoutes
