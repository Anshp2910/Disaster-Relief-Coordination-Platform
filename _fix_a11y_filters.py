# Fix dashboard-filter-row accessibility - add role="group" and aria-label

import re

# ============================================================
# Resources.tsx - 2 filter rows (category + status)
# ============================================================
path = 'client/src/pages/Resources.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace first filter row (Category)
old = '<div className="dashboard-filter-row">\n              {CATEGORIES.map((c) => ('
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'resources.filterByCategory\') || \'Filter by category\'}>\n              {CATEGORIES.map((c) => ('
content = content.replace(old, new)

# Replace second filter row (Status)
old = '<div className="dashboard-filter-row">\n              {STATUSES.map((s) => ('
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'resources.filterByStatus\') || \'Filter by status\'}>\n              {STATUSES.map((s) => ('
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('1. Fixed Resources.tsx filter rows')


# ============================================================
# Incidents.tsx - 3 filter rows
# ============================================================
path = 'client/src/pages/Incidents.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# First filter row
old = '<div className="dashboard-filter-row">\n              {DISASTER_TYPES.map((d) => ('
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'incidents.filterByDisasterType\') || \'Filter by disaster type\'}>\n              {DISASTER_TYPES.map((d) => ('
content = content.replace(old, new)

# Second filter row
old = '<div className="dashboard-filter-row">\n              {STATUS_OPTIONS.filter((s) => s !== \'All\').map((s) => ('
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'incidents.filterByStatus\') || \'Filter by status\'}>\n              {STATUS_OPTIONS.filter((s) => s !== \'All\').map((s) => ('
content = content.replace(old, new)

# Third filter row
old = '<div className="dashboard-filter-row">\n              <div className="filter-group">'
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'incidents.zoneFilter\') || \'Zone filter\'}>\n              <div className="filter-group">'
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('2. Fixed Incidents.tsx filter rows')


# ============================================================
# Schedules.tsx - 3 filter rows
# ============================================================
path = 'client/src/pages/Schedules.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# First filter row (Status)
old = '<div className="dashboard-filter-row">\n              {STATUS_FILTER_OPTIONS.map((s) => ('
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'schedules.filterByStatus\') || \'Filter by status\'}>\n              {STATUS_FILTER_OPTIONS.map((s) => ('
content = content.replace(old, new)

# Second filter row (Shift)
old = '<div className="dashboard-filter-row">\n              {\'All\', ...SHIFT_OPTIONS]'
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'schedules.filterByShift\') || \'Filter by shift\'}>\n              {\'All\', ...SHIFT_OPTIONS]'
# Try alternative if above doesn't match
if old not in content:
    # Try different pattern
    old2 = "<div className=\"dashboard-filter-row\">\n              {['All', ...SHIFT_OPTIONS].map((s) => ("
    new2 = "<div className=\"dashboard-filter-row\" role=\"group\" aria-label={t('schedules.filterByShift') || 'Filter by shift'}>\n              {['All', ...SHIFT_OPTIONS].map((s) => ("
    if old2 in content:
        content = content.replace(old2, new2)

# Third filter row (Zone)
old = '<div className="dashboard-filter-row">\n              <div className="filter-group">'
new = '<div className="dashboard-filter-row" role="group" aria-label={t(\'schedules.filterByZone\') || \'Filter by zone\'}>\n              <div className="filter-group">'
content = content.replace(old, new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('3. Fixed Schedules.tsx filter rows')

print('\nAll a11y filter fixes applied!')
