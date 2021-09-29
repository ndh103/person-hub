import EventList from '../EventList.vue'
import EventDetails from '../EventDetails.vue'

const eventRoutes = [
  {
    path: '/events',
    name: 'events-view',
    component: EventList,
    props: true,
  },
  {
    path: '/events/:eventId',
    name: 'event-details',
    component: EventDetails,
    props: true,
  },
]

export default eventRoutes
