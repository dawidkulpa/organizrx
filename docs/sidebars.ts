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
        'user-guide/features',
        'user-guide/admin',
        'user-guide/plugins',
        'user-guide/troubleshooting',
        'user-guide/migration',
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
      ],
    },
  ],
};

export default sidebars;
