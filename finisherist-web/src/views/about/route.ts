import { RouteConfig } from "vue-router";
import About from "./About.vue";

const aboutRoutes: Array<RouteConfig> = [
    {
        path: "/about",
        name: "about",
        component: About
    }
];

export default aboutRoutes;