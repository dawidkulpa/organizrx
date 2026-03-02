/**
 * Seed script for default groups.
 * Creates 6 groups with exact IDs matching legacy Organizr schema.
 */

export interface GroupSeed {
  group: string;
  group_id: number;
  default: number;
  image: string;
}

export const defaultGroups: GroupSeed[] = [
  {
    group: 'Admin',
    group_id: 0,
    default: 0,
    image: 'plugins/images/groups/admin.png',
  },
  {
    group: 'Co-Admin',
    group_id: 1,
    default: 0,
    image: 'plugins/images/groups/coadmin.png',
  },
  {
    group: 'Super User',
    group_id: 2,
    default: 0,
    image: 'plugins/images/groups/superuser.png',
  },
  {
    group: 'Power User',
    group_id: 3,
    default: 0,
    image: 'plugins/images/groups/poweruser.png',
  },
  {
    group: 'User',
    group_id: 4,
    default: 1,
    image: 'plugins/images/groups/user.png',
  },
  {
    group: 'Guest',
    group_id: 999,
    default: 0,
    image: 'plugins/images/groups/guest.png',
  },
];

/**
 * Seeds the groups table with default groups.
 * This function will be used by the DB connection manager (T8).
 * 
 * @param db - Drizzle database instance
 * @param schema - Schema containing the groups table
 */
export async function seedDefaultGroups(db: any, schema: any) {
  for (const group of defaultGroups) {
    await db.insert(schema.groups).values(group);
  }
}
