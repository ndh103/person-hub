import { RouteConfig } from "vue-router";
import Home from "./Home.vue";

const homeRoutes: RouteConfig[] = [
    {
        path: "/",
        name: "home",
        component: Home
    }
];

export default homeRoutes;