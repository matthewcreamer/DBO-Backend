import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::exp-table.exp-table', ({ strapi }: any) => {
  // Handle CRUD operations dynamically.
  const handleRequest = async (
    method: 'find' | 'create' | 'update' | 'delete',
    filters = {},
    payload?: any
  ) => {
    const contentType = 'api::exp-table.exp-table';

    switch (method) {
      case 'find':
        return strapi.entityService.findMany(contentType, { filters, populate: ['owner'] });

      case 'create':
        if (!payload || !payload.data) {
          throw new Error('Invalid payload: "data" property is required.');
        }
        return strapi.entityService.create(contentType, { data: payload.data });

      case 'update':
        return strapi.entityService.update(contentType, { where: filters, data: payload });

      case 'delete':
        return strapi.entityService.delete(contentType, { where: filters });

      default:
        throw new Error('Invalid operation');
    }
  };

  // Fetch user information and their role dynamically.
  const getUserInfo = async (user: any) => {
    if (!user.owner) {
      user = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['owner', 'role', 'user_permission'],
      });
    }

    const userId = user.id;
    const userRole = user.role?.name || '';
    const ownerId = userRole === 'Owner' ? userId : user.owner?.id;

    return { userId, userRole, ownerId, ownerFilter: { owner: { id: ownerId } } };
  };

  // Verify user permissions dynamically.
  const checkPermissions = async (userId: number, tableName: string, permissionType: string) => {
    const permissions = await strapi.entityService.findMany('api::table-permission.table-permission', {
      filters: { user: userId, table_name: tableName },
    });

    if (!permissions.length || !permissions[0][permissionType]) {
      throw new Error('Forbidden: You do not have permission to perform this action.');
    }
  };

  // Controller methods: Find, Create, Update, Delete.
  return {
    async find(ctx) {
      const user = ctx.state.user;
      const { userId, userRole, ownerFilter } = await getUserInfo(user);

      if (userRole === 'Owner') {
        const results = await handleRequest('find', ownerFilter);
        if (!results.length) {
          ctx.throw(403, 'Forbidden: No access to resources.');
        }
        ctx.body = results;
      } else {
        await checkPermissions(userId, 'exp-table', 'can_get');
        const filters: Object = ctx.query.filters || {};
        const results = await handleRequest('find', { ...filters, ...ownerFilter });
        ctx.body = results;
      }
    },

    async create(ctx) {
      const user = ctx.state.user;
      const payload = ctx.request.body; // Ensure payload is received as { data: {...} }
      const { userRole, ownerId } = await getUserInfo(user);

      // Add the correct owner to the payload data.
      payload.data.owner = ownerId;

      if (userRole === 'Owner') {
        const result = await handleRequest('create', {}, payload);
        ctx.body = result;
      } else {
        await checkPermissions(user.id, 'exp-table', 'can_post');
        const result = await handleRequest('create', {}, payload);
        ctx.body = result;
      }
    },

    async update(ctx) {
      const user = ctx.state.user;
      const filters: Object = ctx.query.filters || {};
      const payload = ctx.request.body;
      const { userId, userRole, ownerFilter } = await getUserInfo(user);

      if (userRole === 'Owner') {
        const result = await handleRequest('update', { ...filters, ...ownerFilter }, payload);
        ctx.body = result;
      } else {
        await checkPermissions(userId, 'exp-table', 'can_update');
        const result = await handleRequest('update', { ...filters, ...ownerFilter }, payload);
        ctx.body = result;
      }
    },

    async delete(ctx) {
      const user = ctx.state.user;
      const filters: Object = ctx.query.filters || {};
      const { userId, userRole, ownerFilter } = await getUserInfo(user);

      if (userRole === 'Owner') {
        const result = await handleRequest('delete', { ...filters, ...ownerFilter });
        ctx.body = result;
      } else {
        await checkPermissions(userId, 'exp-table', 'can_delete');
        const result = await handleRequest('delete', { ...filters, ...ownerFilter });
        ctx.body = result;
      }
    },
  };
});