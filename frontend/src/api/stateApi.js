import axiosClient from './axiosClient';
import { normalizeStateSlug } from '../data/navigation';

export const stateApi = {
  getAllStates: async () => {
    return await axiosClient.get('/states');
  },

  getStateBySlug: async (slug) => {
    const resolvedSlug = normalizeStateSlug(slug) || slug;
    return await axiosClient.get(`/states/${resolvedSlug}`);
  },

  getTopDestinationsByState: async (slug) => {
    const resolvedSlug = normalizeStateSlug(slug) || slug;
    return await axiosClient.get(`/states/${resolvedSlug}/destinations`);
  },
};

export default stateApi;

