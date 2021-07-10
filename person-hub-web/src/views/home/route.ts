import { RouteConfig } from "vue-router";
import Home from "./Home.vue";
import TodoItemList from "./components/TodoItemList.vue";
import TodoItemDetail from "./components/TodoItemDetail.vue";

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
                redirect: "/todos"
            },
            {
                path: "/todos",
                name: "todos-view", 
                component: TodoItemList,
                props: true
            },
            {
                path: "/todos/:todoItemId",
                name: "todos-view-detail",
                component: TodoItemDetail,
                props: true
            },
        ]
    }
];

export default homeRoutes;