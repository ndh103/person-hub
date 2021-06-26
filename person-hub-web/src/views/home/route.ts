import { RouteConfig } from "vue-router";
import Home from "./Home.vue";
import ChallengeList from "./components/ChallengeList.vue";
import ChallengeDetail from "./components/ChallengeDetail.vue";

const homeRoutes: RouteConfig[] = [
    {
        path: "/",
        name: "home",
        component: Home,
        meta: {
            requiresAuth: true
        },
        children: [
            {
                path: "",
                redirect: "/challenges/started"
            },
            {
                path: "/challenges/:challengeStatus",
                name: "list-by-status", 
                component: ChallengeList,
                props: true
            },
            {
                path: "/challenge/:challengeId",
                name: "view-challenge-detail",
                component: ChallengeDetail,
                props: true
            },

        ]
    }
];

export default homeRoutes;