import { ACTIONS, MUTATIONS, GETTERS } from "./store-constant"

const applicationStore = {
    namespace: true,
    state: () => ({
        loggedInUser: {}
    }),
    mutations: {
        [MUTATIONS.SetLoggedInUser](state, user) {
            state.loggedInUser = user;
        }
    },
    getters: {
        [GETTERS.LoggedInUser](state) {
            return state.loggedInUser;
        }
    },
    actions: {
        [ACTIONS.SetLoggedInUser](context, user) {
            context.commit(MUTATIONS.SetLoggedInUser, user);
        }
    }

};

export default applicationStore;