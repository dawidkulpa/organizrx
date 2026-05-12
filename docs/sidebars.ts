import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // User Guide and Developer Guide sections
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/installation',
        'user-guide/getting-started',
        {
          type: 'category',
          label: 'Features',
          items: [
            'user-guide/features/tabs-categories',
            'user-guide/features/users-groups',
            'user-guide/features/authentication',
            'user-guide/features/sso',
            'user-guide/features/homepage',
            'user-guide/features/bookmarks',
            'user-guide/features/theming',
          ],
        },
        {
          type: 'category',
          label: 'Admin Guide',
          items: [
            'user-guide/admin/system-settings',
            'user-guide/admin/security',
            'user-guide/admin/backup-restore',
            'user-guide/admin/updates',
            'user-guide/admin/logs',
          ],
        },
        'user-guide/plugins',
        'user-guide/migration',
        'user-guide/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'developer-guide/architecture',
        'developer-guide/api-reference',
        'developer-guide/plugin-development',
        'developer-guide/database',
        'developer-guide/migration-api',
        'developer-guide/frontend',
        'developer-guide/deployment',
        'developer-guide/contributing-core',
      ],
    },
  ],
};

export default sidebars;
