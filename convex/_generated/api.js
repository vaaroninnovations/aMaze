/* eslint-disable */
/**
 * Mock `api` utility for standalone frontend.
 */
export const api = {
  users: {
    getCurrentUser: "users:getCurrentUser",
    updateProfile: "users:updateProfile",
  },
  experiments: {
    experiments: {
      get: "experiments:get",
      remove: "experiments:remove",
    },
    trials: {
      listByExperiment: "trials:listByExperiment",
    },
  },
};
export const internal = api;
