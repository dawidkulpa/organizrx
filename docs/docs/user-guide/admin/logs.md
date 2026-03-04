---
sidebar_position: 5
---

# Logs

OrganizrX includes a robust logging system that allows you to monitor and troubleshoot your dashboard's activity. Our flexible logging model allows you to view logs directly in the interface and configure their verbosity.

## Log Viewer in Settings > Logs

To view logs for your OrganizrX instance, navigate to **Settings > Logs**.

- **Real-Time Log Viewer:** View the latest logs in real-time.
- **Filtering and Searching:** Filter and search logs by log level, date range, and message content.
- **Downloading Log Files:** Download log files to your local machine for further analysis.
- **Clearing Old Logs:** Manually delete old log files.

## Log Levels

OrganizrX supports multiple log levels, allowing you to control the verbosity of your logs.

- **Fatal:** Critical system errors that prevent the application from starting.
- **Error:** Significant errors that impact the functionality of your dashboard.
- **Warn:** Potential issues that should be addressed, but do not impact the functionality of your dashboard.
- **Info:** General information about your dashboard's activity.
- **Debug:** Detailed information about your dashboard's internal state.
- **Trace:** Even more detailed information about your dashboard's internal state.

You can configure the log level for your OrganizrX instance in the **Settings > Logs** page.

## Filtering and Searching Logs

To filter and search logs for your OrganizrX instance, follow these steps:

1. Go to **Settings > Logs**.
2. **Log Level:** Select the log level you want to filter by.
3. **Date Range:** Select the date range you want to search.
4. **Message Content:** Type the message content you want to search for.

OrganizrX will filter and search your logs based on your selection.

## Downloading Log Files

To download log files for your OrganizrX instance, follow these steps:

1. Go to **Settings > Logs**.
2. Click **Download Log Files**.
3. **Select Log File:** Select the log file you want to download.
4. **Confirm:** Confirm that you want to download the log file.

OrganizrX will download the log file to your local machine.

## Clearing Old Logs

To manually delete old log files for your OrganizrX instance, follow these steps:

1. Go to **Settings > Logs**.
2. Click **Clear Old Logs**.
3. **Select Log File:** Select the log file you want to delete.
4. **Confirm:** Confirm that you want to delete the log file.

OrganizrX will delete the log file from your instance.

## Log Rotation

To prevent your log directory from growing too large, OrganizrX includes a built-in log rotation policy.

- **Automatic Rotation:** Older log files are automatically rotated when the total number of log files exceeds the configured limit.
- **Configurable Limit:** You can configure the maximum number of log files to keep in the **Settings > Logs** page.
- **Maximum Log File Size:** You can also configure the maximum size for each log file.

Once the log rotation procedure is complete, your log directory will remain manageable and you only keep the most recent and relevant log files.
