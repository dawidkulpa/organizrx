import { z } from 'zod'
import { SettingsForm } from '../../components/SettingsForm'

const INPUT_CLASS = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
const CHECKBOX_CLASS = "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"

const homepageSchema = z.object({
  layout: z.enum(['cards', 'list']),
  itemsPerPage: z.coerce.number().min(1, 'Must be at least 1'),
  showSearch: z.boolean(),
  defaultSort: z.enum(['name', 'date', 'custom']),
})

export default function HomepageSettings() {
  return (
    <SettingsForm
      schema={homepageSchema}
      settingsKey="homepage"
      title="Homepage Settings"
      description="Customize how items appear on your dashboard."
    >
      {(form) => (
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="layout" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Layout Style
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              Choose how items are displayed.
            </p>
            <select
              id="layout"
              {...form.register('layout')}
              className={INPUT_CLASS}
            >
              <option value="cards">Grid (Cards)</option>
              <option value="list">List</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="itemsPerPage" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Items Per Page
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              Number of items to show before pagination.
            </p>
            <input
              id="itemsPerPage"
              type="number"
              {...form.register('itemsPerPage')}
              className={INPUT_CLASS}
            />
            {form.formState.errors.itemsPerPage && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.itemsPerPage.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="defaultSort" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Default Sort Order
            </label>
            <p className="text-[0.8rem] text-muted-foreground">
              How items are ordered by default.
            </p>
            <select
              id="defaultSort"
              {...form.register('defaultSort')}
              className={INPUT_CLASS}
            >
              <option value="name">Name (A-Z)</option>
              <option value="date">Date Added (Newest First)</option>
              <option value="custom">Custom Order</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 rounded-md border p-4">
            <input
              id="showSearch"
              type="checkbox"
              {...form.register('showSearch')}
              className={CHECKBOX_CLASS}
            />
            <div className="flex-1 space-y-1">
              <label htmlFor="showSearch" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Show Search Bar
              </label>
              <p className="text-[0.8rem] text-muted-foreground">
                Display a search input at the top of the homepage.
              </p>
            </div>
          </div>
        </div>
      )}
    </SettingsForm>
  )
}
