// src/policies/yourPermissionPolicy.js

export default async (ctx) => {
  const user = ctx.state?.user || {};
  const userId = user.id;
  const userRole = user.role?.name || '';
  const ownerId = userRole === 'Owner' ? userId : user.owner;

  const tableName = ctx.params?.model || ctx.request?.path?.split('/')[2];
  const method = ctx.request?.method?.toLowerCase();

  // Helper to fetch records by owner ID
  const getTablesByOwnerId = async (contentType, ownerId) => {
    return await strapi.entityService.findMany(contentType, {
      filters: { owner: { id: ownerId } },
      populate: 'owner',
    });
  };

  // Helper to check user permissions
  const checkUserPermissions = async (userId, tableName, method) => {
    const permissions = await strapi.entityService.findMany(
      'api::table-permission.table-permission',
      {
        filters: {
          user: userId,
          table_name: tableName,
        },
      }
    );

    const permissionField = `can_${method}`;
    return permissions.length > 0 && permissions[0][permissionField];
  };

  try {
    console.log(`User ID: ${userId}, Role: ${userRole}, Action: ${method} on ${tableName}`);

    if (userRole === 'Owner') {
      // Owner access check
      const ownerCheck = await getTablesByOwnerId(`api::${tableName}.${tableName}`, ownerId);

      if (!ownerCheck.length) {
        ctx.status = 403;
        ctx.body = { error: 'Forbidden: You do not have access to this resource.' };
        return;
      }
    } else {
      // Non-owner role permission check
      const hasPermission = await checkUserPermissions(userId, tableName, method);

      if (!hasPermission) {
        ctx.status = 403;
        ctx.body = { error: `Forbidden: You do not have permission to ${method} this resource.` };
        return;
      }
    }
  } catch (error) {
    console.error('Error in permissions policy:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
  }
};