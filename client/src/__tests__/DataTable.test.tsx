import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DataTable from '../components/ui/DataTable'
import type { ColumnDef, DataTableProps } from '../components/ui/DataTable'

// ── Mocks ──

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: Record<string, unknown>) => {
    if (k === 'dataTable.rowsCount' && opts) return `${opts.count} rows`
    if (k === 'dataTable.pageInfo' && opts) return `${opts.start}–${opts.end} of ${opts.total}`
    if (k === 'dataTable.selectedCount' && opts) return `${opts.count} selected`
    if (k === 'dataTable.filterBy' && opts) return `Filter by ${opts.name}`
    return k
  }, i18n: { language: 'en' } }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...safe } = props
      return <div {...safe}>{children}</div>
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, whileHover, whileTap, ...safe } = props
      return <button {...safe}>{children}</button>
    },
  },
  AnimatePresence: ({ children }: any) => children,
}))

// ── Test Types & Fixtures ──

interface TestItem {
  id: string
  name: string
  status: string
  category: string
  priority: string
  score: number
}

const testData: TestItem[] = [
  { id: '1', name: 'Alpha', status: 'Open', category: 'Medical', priority: 'High', score: 85 },
  { id: '2', name: 'Beta', status: 'Resolved', category: 'Food', priority: 'Low', score: 30 },
  { id: '3', name: 'Gamma', status: 'Open', category: 'Shelter', priority: 'Critical', score: 95 },
  { id: '4', name: 'Delta', status: 'In Progress', category: 'Medical', priority: 'Medium', score: 60 },
  { id: '5', name: 'Epsilon', status: 'Resolved', category: 'Food', priority: 'High', score: 72 },
  { id: '6', name: 'Zeta', status: 'Open', category: 'Water', priority: 'Critical', score: 88 },
  { id: '7', name: 'Eta', status: 'In Progress', category: 'Shelter', priority: 'Low', score: 25 },
  { id: '8', name: 'Theta', status: 'Resolved', category: 'Medical', priority: 'Medium', score: 55 },
  { id: '9', name: 'Iota', status: 'Open', category: 'Food', priority: 'High', score: 78 },
  { id: '10', name: 'Kappa', status: 'In Progress', category: 'Water', priority: 'Low', score: 20 },
  { id: '11', name: 'Lambda', status: 'Open', category: 'Shelter', priority: 'Critical', score: 92 },
  { id: '12', name: 'Mu', status: 'Resolved', category: 'Medical', priority: 'Medium', score: 45 },
]

const columns: ColumnDef<TestItem>[] = [
  { id: 'name', header: 'Name', accessor: 'name', sortable: true, filterable: true },
  { id: 'status', header: 'Status', accessor: 'status', sortable: true, filterable: true },
  { id: 'category', header: 'Category', accessor: 'category', sortable: true, filterable: true },
  { id: 'priority', header: 'Priority', accessor: 'priority', sortable: true, filterable: true },
  { id: 'score', header: 'Score', accessor: 'score', sortable: true, filterable: false, render: (v) => <strong>{v as number}</strong> },
]

function renderTable(props?: Partial<DataTableProps<TestItem>>) {
  return render(
    <DataTable
      columns={columns}
      data={testData}
      keyExtractor={(row) => row.id}
      {...props}
    />,
  )
}

// ── Helper: get text content of first body row ──
function firstRowText(): string {
  const row = document.querySelector('.dt-tbody .dt-tr')
  return row?.textContent?.trim() || ''
}

// ── Tests ──

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', () => {
      const { container } = renderTable({ loading: true })
      expect(container.querySelector('.dt-loading')).toBeTruthy()
      expect(container.querySelector('.dt-loading-spinner')).toBeTruthy()
    })
  })

  describe('Empty State', () => {
    it('shows empty state with custom title and description', () => {
      renderTable({ data: [], emptyTitle: 'No items', emptyDescription: 'Nothing to display' })
      expect(screen.getByText('No items')).toBeTruthy()
      expect(screen.getByText('Nothing to display')).toBeTruthy()
    })

    it('shows clear filters button in empty state when search yields no results', () => {
      renderTable({ data: testData })
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'NonExistentItemXYZ' } })
      expect(screen.getByText('dataTable.noData')).toBeTruthy()
      expect(screen.getByText('dataTable.clearFilters')).toBeTruthy()
    })
  })

  describe('Basic Rendering', () => {
    it('renders all column headers', () => {
      renderTable()
      const headers = document.querySelectorAll('.dt-th')
      const headerTexts = Array.from(headers).map(h => h.textContent?.trim())
      expect(headerTexts).toContain('Name')
      expect(headerTexts).toContain('Status')
      expect(headerTexts).toContain('Category')
      expect(headerTexts).toContain('Priority')
      expect(headerTexts).toContain('Score')
    })

    it('renders correct number of rows based on page size', () => {
      const { container } = renderTable({ pageSize: 5 })
      const rows = container.querySelectorAll('.dt-tbody .dt-tr')
      expect(rows.length).toBe(5)
    })

    it('renders custom render function for score column', () => {
      const { container } = renderTable()
      const scoreCells = container.querySelectorAll('.dt-td')
      const scores = Array.from(scoreCells).filter(c => c.textContent === '85')
      expect(scores.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Global Search / Filtering', () => {
    it('filters items by global search', () => {
      renderTable()
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
      expect(firstRowText()).toContain('Alpha')
      // Beta should not appear in the table body (filter options still contain it)
      const tbody = document.querySelector('.dt-tbody')
      expect(tbody?.textContent).not.toContain('Beta')
    })

    it('shows clear search button when search is active', () => {
      renderTable()
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
      expect(screen.getByLabelText('dataTable.clearSearch')).toBeTruthy()
    })

    it('clears search when clear button is clicked', () => {
      renderTable({ pageSize: 5 })
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
      const clearBtn = screen.getByLabelText('dataTable.clearSearch')
      fireEvent.click(clearBtn)
      const rows = document.querySelectorAll('.dt-tbody .dt-tr')
      expect(rows.length).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Column Filters', () => {
    it('shows at least one column filter dropdown for filterable columns', () => {
      renderTable()
      const selects = document.querySelectorAll('.dt-filter-select')
      expect(selects.length).toBeGreaterThanOrEqual(1)
    })

    it('filters by column status value', () => {
      renderTable()
      // Find the status filter select and set it to 'Open'
      const selects = document.querySelectorAll('.dt-filter-select')
      for (const sel of selects) {
        const select = sel as HTMLSelectElement
        const options = Array.from(select.options).map(o => o.value)
        if (options.includes('Open')) {
          fireEvent.change(select, { target: { value: 'Open' } })
          break
        }
      }
      // After filtering by 'Open', all visible rows should have 'Open' status
      const rows = document.querySelectorAll('.dt-tbody .dt-tr')
      expect(rows.length).toBeGreaterThanOrEqual(1)
      // 'Beta' (Resolved) should not appear in the table body
      const tbody = document.querySelector('.dt-tbody')
      expect(tbody?.textContent).not.toContain('Beta')
    })

    it('shows clear all filters button when a filter is active', () => {
      renderTable()
      // Activate a filter by typing in search
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
      // Button has aria-label clearAllFilters, visible text is dataTable.clear
      expect(screen.getByLabelText('dataTable.clearAllFilters')).toBeTruthy()
    })

    it('clears search when clear all filters is clicked', () => {
      renderTable({ pageSize: 3 })
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'alpha' } })
      const clearBtn = screen.getByLabelText('dataTable.clearAllFilters')
      fireEvent.click(clearBtn)
      expect(searchInput).toHaveValue('')
      // After clearing, more items should show
      const rows = document.querySelectorAll('.dt-tbody .dt-tr')
      expect(rows.length).toBeGreaterThan(1)
    })
  })

  describe('Column Visibility', () => {
    it('shows column visibility toggle button', () => {
      renderTable()
      expect(screen.getByLabelText('dataTable.columns')).toBeTruthy()
    })

    it('opens column visibility menu on click', () => {
      renderTable()
      fireEvent.click(screen.getByLabelText('dataTable.columns'))
      const colOptions = document.querySelectorAll('.dt-col-option')
      expect(colOptions.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Sorting', () => {
    function sortByName() {
      const headers = document.querySelectorAll('.dt-th-sortable')
      for (const h of headers) {
        if (h.textContent?.trim().startsWith('Name')) {
          fireEvent.click(h)
          return
        }
      }
    }

    it('sorts ascending on first click', () => {
      renderTable({ pageSize: 12 })
      sortByName()
      expect(firstRowText()).toContain('Alpha')
    })

    it('sorts descending on second click', () => {
      renderTable({ pageSize: 12 })
      sortByName()
      sortByName()
      // After descending sort, 'Zeta' should be first (Z is last alphabetically)
      expect(firstRowText()).toContain('Zeta')
    })

    it('shows sort indicator icon after sort', () => {
      renderTable()
      sortByName()
      const sortIcons = document.querySelectorAll('.dt-sort-icon')
      expect(sortIcons.length).toBeGreaterThanOrEqual(1)
    })

    it('resets page to 0 when sorting changes', () => {
      renderTable({ pageSize: 5 })
      // Go to page 2 first
      const pageBtns = document.querySelectorAll('.dt-page-btn')
      const page2Btn = Array.from(pageBtns).find(b => b.textContent === '2')
      if (page2Btn) fireEvent.click(page2Btn)
      // Now sort
      sortByName()
      const activePage = document.querySelector('.dt-page-active')
      expect(activePage?.textContent).toBe('1')
    })
  })

  describe('Pagination', () => {
    it('shows pagination buttons when data spans multiple pages', () => {
      renderTable({ pageSize: 5 })
      const pageBtns = document.querySelectorAll('.dt-page-btn')
      expect(pageBtns.length).toBeGreaterThan(2)
    })

    it('hides pagination when all items fit on one page', () => {
      renderTable({ pageSize: 50 })
      expect(document.querySelector('.dt-pagination')).toBeNull()
    })

    it('navigates to next page', () => {
      renderTable({ pageSize: 5 })
      fireEvent.click(screen.getByLabelText('dataTable.nextPage'))
      // Page 2 should show Zeta (6th item, 1st on page 2)
      expect(firstRowText()).toContain('Zeta')
    })

    it('navigates back to previous page', () => {
      renderTable({ pageSize: 5 })
      fireEvent.click(screen.getByLabelText('dataTable.nextPage'))
      fireEvent.click(screen.getByLabelText('dataTable.previousPage'))
      // Back on page 1, Alpha should be first
      expect(firstRowText()).toContain('Alpha')
    })

    it('disables previous button on first page', () => {
      renderTable({ pageSize: 5 })
      expect(screen.getByLabelText('dataTable.previousPage')).toBeDisabled()
    })

    it('disables next button on last page', () => {
      renderTable({ pageSize: 5 })
      fireEvent.click(screen.getByLabelText('dataTable.nextPage'))
      fireEvent.click(screen.getByLabelText('dataTable.nextPage'))
      expect(screen.getByLabelText('dataTable.nextPage')).toBeDisabled()
    })

    it('changes page size and hides pagination', () => {
      renderTable()
      const pageSizeSelect = screen.getByLabelText('Rows per page')
      fireEvent.change(pageSizeSelect, { target: { value: '25' } })
      expect(document.querySelector('.dt-pagination')).toBeNull()
    })

    it('resets to first page when page size changes', () => {
      renderTable({ pageSize: 5 })
      fireEvent.click(screen.getByLabelText('dataTable.nextPage'))
      const pageSizeSelect = screen.getByLabelText('Rows per page')
      fireEvent.change(pageSizeSelect, { target: { value: '10' } })
      expect(firstRowText()).toContain('Alpha')
    })
  })

  describe('Bulk Actions', () => {
    it('shows select column header when bulkActions is true', () => {
      renderTable({ bulkActions: true })
      expect(document.querySelector('.dt-th-shrink')).toBeTruthy()
    })

    it('shows bulk action bar when a row is selected', () => {
      renderTable({ bulkActions: true, pageSize: 5 })
      const checkBtns = document.querySelectorAll('.dt-check-btn')
      fireEvent.click(checkBtns[0]!)
      expect(document.querySelector('.dt-bulk-bar')).toBeTruthy()
    })

    it('selects all current page rows when header checkbox is clicked', () => {
      renderTable({ bulkActions: true, pageSize: 5 })
      fireEvent.click(document.querySelector('.dt-th-shrink')!)
      const selectedRows = document.querySelectorAll('.dt-tr-selected')
      expect(selectedRows.length).toBe(5)
    })

    it('calls onBulkAction with selected items', () => {
      const onBulkAction = vi.fn()
      renderTable({ bulkActions: true, onBulkAction, pageSize: 5 })
      const checkBtns = document.querySelectorAll('.dt-check-btn')
      fireEvent.click(checkBtns[0]!)
      const bulkActionBtn = document.querySelector('.dt-bulk-action')
      fireEvent.click(bulkActionBtn!)
      expect(onBulkAction).toHaveBeenCalledTimes(1)
      expect(onBulkAction.mock.calls[0][0]).toHaveLength(1)
      expect(onBulkAction.mock.calls[0][0][0].id).toBe('1')
    })

    it('toggles individual row selection on click', () => {
      renderTable({ bulkActions: true, pageSize: 5 })
      const checkBtns = document.querySelectorAll('.dt-check-btn')
      fireEvent.click(checkBtns[0]!)
      expect(screen.getByText(/1 selected/)).toBeTruthy()
      fireEvent.click(checkBtns[0]!)
      expect(document.querySelector('.dt-bulk-bar')).toBeNull()
    })
  })

  describe('Context Menu', () => {
    it('shows context menu on right-click', () => {
      const actions = [{ label: 'Edit', onClick: vi.fn() }, { label: 'Delete', danger: true, onClick: vi.fn() }]
      renderTable({ contextMenu: actions, pageSize: 5 })
      const row = document.querySelector('.dt-tr-ctx')
      fireEvent.contextMenu(row!)
      expect(document.querySelector('.dt-ctx-menu')).toBeTruthy()
      const items = document.querySelectorAll('.dt-ctx-item')
      expect(items.length).toBe(2)
    })

    it('calls context menu action on click', () => {
      const onEdit = vi.fn()
      renderTable({ contextMenu: [{ label: 'Edit', onClick: onEdit }], pageSize: 5 })
      const row = document.querySelector('.dt-tr-ctx')
      fireEvent.contextMenu(row!)
      const items = document.querySelectorAll('.dt-ctx-item')
      fireEvent.click(items[0]!)
      expect(onEdit).toHaveBeenCalledTimes(1)
      expect(onEdit.mock.calls[0][0].id).toBe('1')
    })
  })

  describe('Row Click', () => {
    it('calls onRowClick when a row is clicked', () => {
      const onRowClick = vi.fn()
      renderTable({ onRowClick, pageSize: 5 })
      const row = document.querySelector('.dt-tr-clickable')
      fireEvent.click(row!)
      expect(onRowClick).toHaveBeenCalledTimes(1)
      expect(onRowClick.mock.calls[0][0].id).toBe('1')
    })
  })

  describe('Custom Styling Callbacks', () => {
    it('applies custom row class via getRowClass', () => {
      const getRowClass = (row: TestItem) => row.priority === 'Critical' ? 'critical-row' : ''
      const { container } = renderTable({ getRowClass, pageSize: 5 })
      expect(container.querySelector('.critical-row')).toBeTruthy()
    })

    it('applies custom cell class via getCellClass', () => {
      const getCellClass = (row: TestItem, col: ColumnDef<TestItem>) =>
        col.id === 'score' && row.score >= 80 ? 'high-score' : ''
      const { container } = renderTable({ getCellClass, pageSize: 5 })
      expect(container.querySelectorAll('.high-score').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Export', () => {
    it('shows export button by default', () => {
      renderTable()
      expect(screen.getByLabelText('dataTable.exportCSV')).toBeTruthy()
    })

    it('hides export button when exportable is false', () => {
      renderTable({ exportable: false })
      expect(screen.queryByLabelText('dataTable.exportCSV')).toBeNull()
    })

    it('generates blob URL on export click', () => {
      const createObjectURL = vi.fn(() => 'blob:test')
      const revokeObjectURL = vi.fn()
      const origCreate = URL.createObjectURL
      const origRevoke = URL.revokeObjectURL
      URL.createObjectURL = createObjectURL
      URL.revokeObjectURL = revokeObjectURL

      renderTable()
      fireEvent.click(screen.getByLabelText('dataTable.exportCSV'))
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const blob = createObjectURL.mock.calls[0][0] as Blob
      expect(blob.type).toBe('text/csv;charset=utf-8;')

      URL.createObjectURL = origCreate
      URL.revokeObjectURL = origRevoke
    })
  })

  describe('Prop toggles', () => {
    it('hides search input when searchable is false', () => {
      renderTable({ searchable: false })
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('hides column visibility button when columnVisibility is false', () => {
      renderTable({ columnVisibility: false })
      expect(screen.queryByLabelText('dataTable.columns')).toBeNull()
    })

    it('hides filter dropdowns when filterable is false', () => {
      renderTable({ filterable: false })
      expect(document.querySelectorAll('.dt-filter-select').length).toBe(0)
    })

    it('applies dt-sticky class when stickyHeader is true', () => {
      const { container } = renderTable()
      const thead = container.querySelector('.dt-thead')
      expect(thead?.className).toContain('dt-sticky')
    })

    it('omits dt-sticky class when stickyHeader is false', () => {
      const { container } = renderTable({ stickyHeader: false })
      const thead = container.querySelector('.dt-thead')
      expect(thead?.className).not.toContain('dt-sticky')
    })

    it('renders custom content via renderTop', () => {
      renderTable({ renderTop: <div>Top Content</div> })
      expect(screen.getByText('Top Content')).toBeTruthy()
    })
  })

  describe('Edge Cases', () => {
    it('renders function accessor columns correctly', () => {
      const cols: ColumnDef<TestItem>[] = [
        { id: 'name', header: 'Name', accessor: 'name' },
        { id: 'computed', header: 'Computed', accessor: (row) => `${row.name} (${row.status})` },
      ]
      render(
        <DataTable
          columns={cols}
          data={testData.slice(0, 3)}
          keyExtractor={(row) => row.id}
          pageSize={10}
        />,
      )
      // Query the table body for computed text rather than getAllByText which could match elsewhere
      const rows = document.querySelectorAll('.dt-tbody .dt-tr')
      const rowText = Array.from(rows).map(r => r.textContent || '')
      expect(rowText.some(t => t.includes('Alpha (Open)'))).toBe(true)
    })
  })
})
