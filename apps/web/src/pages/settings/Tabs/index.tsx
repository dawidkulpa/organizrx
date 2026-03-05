import { Loader2 } from 'lucide-react'
import TabForm from '../../../components/tab-form'
import { useTabs } from './use-tabs'
import { TabsToolbar } from './TabsToolbar'
import { TabsList } from './TabsList'

export default function TabsSettings() {
  const {

    categories,
    groups,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTabs,
    isFormOpen,
    setIsFormOpen,
    editingTab,
    setEditingTab,
    filteredTabs,
    fetchData,
    handleDragEnd,
    handleEdit,
    handleDelete,
    handleBulkDelete,
    toggleSelection,
    toggleSelectAll,
    getCategoryName,
    getGroupName,
  } = useTabs()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <TabsToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        selectedTabsCount={selectedTabs.length}
        handleBulkDelete={handleBulkDelete}
        onAddTab={() => {
          setEditingTab(null)
          setIsFormOpen(true)
        }}
      />

      <TabsList
        filteredTabs={filteredTabs}
        selectedTabs={selectedTabs}
        handleDragEnd={handleDragEnd}
        toggleSelectAll={toggleSelectAll}
        toggleSelection={toggleSelection}
        getCategoryName={getCategoryName}
        getGroupName={getGroupName}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
        searchQuery={searchQuery}
        selectedCategory={selectedCategory}
      />

      <TabForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSaved={fetchData}
        categories={categories}
        groups={groups}
        tab={editingTab}
      />
    </div>
  )
}
