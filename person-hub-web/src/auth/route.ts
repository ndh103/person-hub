import { RouteConfig } from "vue-router";
import Callback from "./Callback.vue";
import SilentRenew from "./SilentRenew.vue";

const authRoutes: Array<RouteConfig> = [
    {
        path: "/auth/callback",
        name: "Callback",
        component: Callback,
        meta: {
            requiresAuth: false
        }
    },
    {
        path: "/auth/silent-renew",
        name: "SilentRenew",
        component: SilentRenew,
        meta: {
            requiresAuth: false
        }
    },
];

export default authRoutes;