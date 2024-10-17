// ./src/api/exp-tables/routes/exp-tables.ts

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::exp-table.exp-table', {
  config: {
    find: {
      policies: ['global::permissions'],
    },
    findOne: {
      policies: ['global::permissions'],
    },
    create: {
      policies: ['global::permissions'],
    },
    update: {
      policies: ['global::permissions'],
    },
    delete: {
      policies: ['global::permissions'],
    },
  },
});