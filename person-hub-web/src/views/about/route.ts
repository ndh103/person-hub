import About from "./About.vue";

const aboutRoutes = [
    {
        path: "/about",
        name: "about",
        component: About,
        meta: {
            requiresAuth: false
          }
    }
];

export default aboutRoutes;