import AppStoreConstant from './application-store-constant'

const { ACTIONS, MUTATIONS, GETTERS } = AppStoreConstant;

const applicationStore = {
    namespaced: true,
    state: () => ({
        loggedInUser: {},
        overlaySidebarStatus: 'closed'
    }),
    mutations: {
        [MUTATIONS.setLoggedInUser](state, user) {
            state.loggedInUser = user;
        },
        [MUTATIONS.toogleSidebar](state) {
            if (state.overlaySidebarStatus == 'open') {
                state.overlaySidebarStatus = 'closed';
            } else {
                state.overlaySidebarStatus = 'open';
            }
        }
    },
    getters: {
        [GETTERS.loggedInUser](state) {
            return state.loggedInUser;
        },
        [GETTERS.overlaySideBarStatus](state) {
            return state.overlaySidebarStatus;
        }
    },
    actions: {
        [ACTIONS.setLoggedInUser](context, user) {
            context.commit(MUTATIONS.setLoggedInUser, user);
        }
    }

};

export default applicationStore;