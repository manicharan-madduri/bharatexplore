import axiosClient from './axiosClient';
import { normalizeStateSlug, CATEGORY_GROUPS, matchesCategory } from '../data/navigation';

export const destinationApi = {
  getDestinationById: async (id) => {
    return await axiosClient.get(`/destinations/${id}`);
  },

  getDestinationBySlug: async (slug) => {
    return await axiosClient.get(`/destinations/slug/${slug}`);
  },

  getDestinationPhotos: async (id) => {
    return await axiosClient.get(`/destinations/${id}/photos`);
  },

  getDestinationRanking: async (id) => {
    return await axiosClient.get(`/destinations/${id}/ranking`);
  },

  searchDestinations: async (query) => {
    return await axiosClient.get('/destinations/search', {
      params: { query },
    });
  },

  filterDestinations: async ({ state, category, sort, query }) => {
    const normalizedState = state ? normalizeStateSlug(state) : undefined;
    const cleanCategory = category ? category.trim() : '';
    const isGroupCategory = Boolean(
      cleanCategory && CATEGORY_GROUPS[cleanCategory.toLowerCase()]
    );

    // Fetch filtered by state, query, and sort; if an umbrella category is selected,
    // match all mapped subcategories so both live and updated backend instances return full results.
    const response = await axiosClient.get('/destinations', {
      params: {
        state: normalizedState || undefined,
        category: isGroupCategory ? undefined : (cleanCategory || undefined),
        sort: sort || undefined,
        query: query || undefined,
      },
    });

    if (isGroupCategory && response && Array.isArray(response.data)) {
      return {
        ...response,
        data: response.data.filter((dest) => matchesCategory(dest.category, cleanCategory)),
      };
    }

    return response;
  },

  getCategories: async () => {
    return await axiosClient.get('/destinations/categories');
  },

  getHealth: async () => {
    return await axiosClient.get('/health');
  },
};

export default destinationApi;

