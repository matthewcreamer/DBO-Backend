export default async (ctx, next) => {
  const userId = ctx.state.user?.id;
  const tableName = ctx.params.model || ctx.request.path.split('/')[2]; // Extract table name dynamically
  const method = ctx.request.method.toLowerCase(); // Get the HTTP method (get, post, put, delete)

  console.log(`Checking permissions for User ID: ${userId} on Table: ${tableName} with Method: ${method}`);

  try {
    // Map CRUD operations to permission fields
    const operationMap = {
      get: 'can_get',
      post: 'can_post',
      put: 'can_put',
      delete: 'can_delete',
    };

    const permissionField = operationMap[method];

    if (!permissionField) {
      console.error(`Unsupported method: ${method}`);
      ctx.status = 405;
      ctx.body = { error: 'Method Not Allowed' };
      return false;
    }

    const permissions = await strapi.entityService.findMany(
      'api::table-permission.table-permission',
      {
        filters: {
          user: userId,
          table_name: tableName,
        },
      }
    );

    if (!permissions.length || !permissions[0][permissionField]) {
      console.log(`User does NOT have permission to ${method}`);

      ctx.status = 403;
      ctx.body = { error: `Forbidden: You do not have permission to ${method} this resource.` };
      return false; 
    }

    console.log(`User has permission to ${method}`);
    await next(); // Proceed if the user has permission
  } catch (error) {
    console.error('Error checking permissions:', error);

    // Handle any unexpected errors gracefully
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
  }
};