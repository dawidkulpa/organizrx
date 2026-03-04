---
sidebar_position: 8
---

# Troubleshooting

While we strive to make OrganizrX as reliable as possible, you may occasionally encounter issues. This guide provides solutions to common problems and answers to frequently asked questions.

## Common Issues

### Blank Page after Login
- **Check CORS:** Ensure your `CORS` configuration is correct in the **Settings > Security** page.
- **Check Browser Console:** Open your browser's developer tools and check the console for errors.
- **Clear Browser Cache:** Sometimes old cached data can cause issues after an upgrade.

### Can't Connect to Service
- **Check URL:** Verify the service URL is correct in the **Settings > Tabs** page.
- **Check Network:** Ensure your OrganizrX instance can reach the service over the network.
- **Check SSRF Rules:** If you are accessing a service on a private IP address, ensure it is allowed in the **Settings > Security** page.

### Plugin Not Loading
- **Check Settings > Plugins:** Ensure the plugin is enabled and correctly configured.
- **Check Logs:** View the logs in **Settings > Logs** for any plugin-related errors.

### Database Errors
- **Check DATABASE_URL:** Verify the database connection string is correct.
- **Check Permissions:** Ensure the user OrganizrX is running as has the necessary permissions to access the database.

### Docker Permission Issues
- **Check Volume Mounts:** Verify that your volume mounts are correct in your `docker-compose.yml`.
- **Check User:** Ensure the user inside the Docker container has the necessary permissions to access the mounted volumes.

### Port Already in Use
- **Check for Other Services:** Ensure that no other service is running on port `3001` on your host machine.

## Debug Mode

If you are still having trouble, you can enable debug mode to get more detailed information about your dashboard's activity.

- **LOG_LEVEL=debug:** Set the `LOG_LEVEL` environment variable to `debug` when starting OrganizrX.
- **View Logs:** View the debug logs in the **Settings > Logs** page.

## Reading Logs

The logs in **Settings > Logs** are your best source of information when troubleshooting issues.

- **Filter by Level:** Use the log level filter to find the most relevant logs.
- **Search Content:** Use the search bar to find logs related to a specific service or error.

## FAQ

### Browser Support
OrganizrX supports all modern web browsers, including Google Chrome, Mozilla Firefox, Apple Safari, and Microsoft Edge.

### Mobile Support
OrganizrX is designed with a responsive UI that works great on tablets and mobile devices.

### Multi-Instance
You can run multiple instances of OrganizrX on the same host machine by using different ports and database URLs.

### API Access
All OrganizrX functionality is available through our REST API. You can find all API endpoints under the `/api/` path.

If you are still having trouble, please visit our community forums or GitHub repository for further assistance.
