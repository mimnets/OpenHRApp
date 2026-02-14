# Code Organization & Refactoring Recommendations

## Current Code Size Analysis

### Large Files That Need Refactoring

| File | Lines | Status | Recommendation |
|------|-------|--------|----------------|
| `src/pages/EmployeeDirectory.tsx` | 570+ | 🔴 Too Large | Split into multiple components |
| `Others/pb_hooks/main.pb.js` | 1529 | 🔴 Too Large | Split into separate hook files |
| `src/pages/Organization.tsx` | 456 | 🟡 Moderate | Consider splitting tabs into components |
| `src/services/hrService.ts` | 71 | ✅ Good | No changes needed |
| `src/services/employee.service.ts` | 125 | ✅ Good | No changes needed |

---

## Priority 1: Refactor EmployeeDirectory.tsx

### Current Structure (570 lines)
```
EmployeeDirectory.tsx
├── State management (40 lines)
├── Data fetching (50 lines)
├── Form handlers (120 lines)
├── Render: Employee Cards (80 lines)
├── Render: View Modal (80 lines)
└── Render: Add/Edit Modal (200 lines)
```

### Recommended Structure
```
src/pages/EmployeeDirectory/
├── index.tsx (150 lines)
│   └── Main layout, state, data fetching
├── components/
│   ├── EmployeeCard.tsx (60 lines)
│   │   └── Individual employee card display
│   ├── EmployeeViewModal.tsx (100 lines)
│   │   └── Read-only employee details modal
│   ├── EmployeeFormModal.tsx (200 lines)
│   │   └── Add/Edit employee form
│   └── EmployeeSearchBar.tsx (40 lines)
│       └── Search and filter controls
├── hooks/
│   ├── useEmployeeFiltering.ts (50 lines)
│   │   └── Search and filter logic
│   └── useEmployeeForm.ts (80 lines)
│       └── Form state management
└── utils/
    └── employeeHelpers.ts (30 lines)
        └── getTeamName, getShiftName, etc.
```

### Benefits of Refactoring
- ✅ Each component under 200 lines
- ✅ Easier to test individual components
- ✅ Better code reusability
- ✅ Clearer separation of concerns
- ✅ Easier to find and fix bugs

---

## Priority 2: Refactor PocketBase Hooks

### Current Structure (1529 lines)
```
main.pb.js
├── Registration endpoint (220 lines)
├── Auth & subscription (180 lines)
├── Admin endpoints (150 lines)
├── Ad management (200 lines)
├── Contact form (100 lines)
├── Blog endpoints (150 lines)
├── Email notifications (200 lines)
├── Leave notifications (80 lines)
├── Employee verification (40 lines)
└── Helper functions (209 lines)
```

### Recommended Structure
```
Others/pb_hooks/
├── main.pb.js (100 lines)
│   └── Load and register all hooks
├── routes/
│   ├── registration.pb.js (250 lines)
│   │   └── Organization registration
│   ├── auth.pb.js (200 lines)
│   │   └── Authentication & subscription
│   ├── admin.pb.js (200 lines)
│   │   └── Admin verification & management
│   ├── ads.pb.js (250 lines)
│   │   └── Ad configuration
│   ├── blog.pb.js (200 lines)
│   │   └── Blog posts API
│   └── contact.pb.js (150 lines)
│       └── Contact form handling
├── hooks/
│   ├── emailNotifications.pb.js (150 lines)
│   │   └── Email queue hook
│   ├── leaveNotifications.pb.js (100 lines)
│   │   └── Leave request notifications
│   ├── employeeVerification.pb.js (80 lines)
│   │   └── Employee verification emails
│   └── orgUpdates.pb.js (100 lines)
│       └── Organization status changes
└── utils/
    ├── countryDefaults.pb.js (250 lines)
    │   └── Country-based settings
    └── emailTemplates.pb.js (200 lines)
        └── Email HTML templates
```

### Example main.pb.js After Refactoring
```javascript
console.log("[HOOKS] Loading OpenHR System Hooks...");

// Load route handlers
require(`${__hooks}/routes/registration.pb.js`);
require(`${__hooks}/routes/auth.pb.js`);
require(`${__hooks}/routes/admin.pb.js`);
require(`${__hooks}/routes/ads.pb.js`);
require(`${__hooks}/routes/blog.pb.js`);
require(`${__hooks}/routes/contact.pb.js`);

// Load event hooks
require(`${__hooks}/hooks/emailNotifications.pb.js`);
require(`${__hooks}/hooks/leaveNotifications.pb.js`);
require(`${__hooks}/hooks/employeeVerification.pb.js`);
require(`${__hooks}/hooks/orgUpdates.pb.js`);

console.log("[HOOKS] All hooks loaded successfully!");
```

### Benefits
- ✅ Easy to find specific functionality
- ✅ Can enable/disable features by commenting out one line
- ✅ Easier to test individual endpoints
- ✅ Better version control (smaller diffs)
- ✅ Multiple developers can work simultaneously

---

## Priority 3: Organization Page Tabs

### Current Structure (456 lines)
```
Organization.tsx
└── All 8 tabs in one file
    ├── STRUCTURE
    ├── TEAMS
    ├── PLACEMENT
    ├── SHIFTS
    ├── WORKFLOW
    ├── LEAVES
    ├── HOLIDAYS
    └── SYSTEM
```

### Already Split! ✅
The tabs are already separated into components:
- `OrgStructure.tsx`
- `OrgTeams.tsx`
- `OrgPlacement.tsx`
- `OrgShifts.tsx`
- `OrgWorkflow.tsx`
- `OrgLeaves.tsx`
- `OrgHolidays.tsx`
- `OrgSystem.tsx`

**Status:** No refactoring needed - already well-organized!

---

## Refactoring Guide: Step-by-Step

### Example: Extracting EmployeeCard Component

#### Step 1: Create Component File
```typescript
// src/pages/EmployeeDirectory/components/EmployeeCard.tsx

import React from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { Employee } from '../../../types';

interface Props {
  employee: Employee;
  onEdit: (emp: Employee) => void;
  onDelete: (id: string) => void;
  onClick: (emp: Employee) => void;
  getTeamName: (teamId?: string) => string;
  isAdmin: boolean;
}

export const EmployeeCard: React.FC<Props> = ({
  employee,
  onEdit,
  onDelete,
  onClick,
  getTeamName,
  isAdmin
}) => {
  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8..." onClick={() => onClick(employee)}>
      {/* Move card JSX here */}
    </div>
  );
};
```

#### Step 2: Update EmployeeDirectory
```typescript
// src/pages/EmployeeDirectory/index.tsx

import { EmployeeCard } from './components/EmployeeCard';

// In render:
{filtered.map((emp) => (
  <EmployeeCard
    key={emp.id}
    employee={emp}
    onEdit={handleOpenEdit}
    onDelete={handleDelete}
    onClick={setShowViewModal}
    getTeamName={getTeamName}
    isAdmin={isAdmin}
  />
))}
```

#### Step 3: Extract Form Modal
```typescript
// src/pages/EmployeeDirectory/components/EmployeeFormModal.tsx

interface Props {
  showModal: boolean;
  editingId: string | null;
  formState: any;
  teams: Team[];
  shifts: Shift[];
  // ... other props
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onFieldChange: (field: string, value: any) => void;
}

export const EmployeeFormModal: React.FC<Props> = ({ ... }) => {
  return showModal ? (
    <div className="fixed inset-0...">
      {/* Move form JSX here */}
    </div>
  ) : null;
};
```

#### Step 4: Extract Custom Hooks
```typescript
// src/pages/EmployeeDirectory/hooks/useEmployeeForm.ts

import { useState } from 'react';

export const useEmployeeForm = (
  initialState: any,
  departments: string[],
  designations: string[],
  shifts: Shift[]
) => {
  const [formState, setFormState] = useState(initialState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openAddModal = () => {
    const defaultShift = shifts.find(s => s.isDefault);
    setFormState({
      ...initialState,
      department: departments[0] || 'Unassigned',
      designation: designations[0] || 'New Employee',
      shiftId: defaultShift?.id || ''
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (employee: Employee) => {
    setFormState({ /* map employee to form state */ });
    setEditingId(employee.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormState(initialState);
  };

  return {
    formState,
    setFormState,
    editingId,
    showModal,
    openAddModal,
    openEditModal,
    closeModal
  };
};
```

---

## Naming Conventions

### Files
- **Components:** PascalCase (e.g., `EmployeeCard.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useEmployeeForm.ts`)
- **Utils:** camelCase (e.g., `employeeHelpers.ts`)
- **Types:** PascalCase (e.g., `Employee.ts`)

### Folders
- **Components:** Singular lowercase (e.g., `component/`)
- **Hooks:** Plural lowercase (e.g., `hooks/`)
- **Utils:** Plural lowercase (e.g., `utils/`)
- **Services:** Plural lowercase (e.g., `services/`)

### Functions
- **Event handlers:** `handle` prefix (e.g., `handleSubmit`)
- **Render functions:** `render` prefix (e.g., `renderCard`)
- **Getters:** `get` prefix (e.g., `getTeamName`)
- **Hooks:** `use` prefix (e.g., `useEmployees`)

---

## Testing After Refactoring

### Checklist
- [ ] All features work exactly as before
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All forms submit correctly
- [ ] All modals open and close
- [ ] All data displays correctly
- [ ] Performance is same or better

### Test Each Component Individually
```typescript
// EmployeeCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { EmployeeCard } from './EmployeeCard';

describe('EmployeeCard', () => {
  it('displays employee name', () => {
    const employee = { name: 'John Doe', ... };
    render(<EmployeeCard employee={employee} ... />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const onClick = jest.fn();
    const employee = { name: 'John Doe', ... };
    render(<EmployeeCard employee={employee} onClick={onClick} ... />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledWith(employee);
  });
});
```

---

## When to Refactor

### ✅ Good Time to Refactor
- Between features (not during active development)
- After reaching a stable milestone
- When adding new features to a large file
- When fixing bugs in hard-to-navigate code
- When onboarding new developers

### ❌ Bad Time to Refactor
- During critical bug fixes
- Close to deadlines
- While actively developing new features
- Without proper testing setup

---

## Gradual Refactoring Strategy

### Phase 1: Extract Components (Week 1)
1. Extract EmployeeCard
2. Extract EmployeeViewModal
3. Test thoroughly

### Phase 2: Extract Form (Week 2)
1. Extract EmployeeFormModal
2. Extract form sections (personal info, work info, etc.)
3. Test thoroughly

### Phase 3: Extract Hooks (Week 3)
1. Extract useEmployeeForm
2. Extract useEmployeeFiltering
3. Test thoroughly

### Phase 4: PocketBase Hooks (Week 4)
1. Create folder structure
2. Split registration routes
3. Split email hooks
4. Test thoroughly

---

## Benefits of Well-Organized Code

### Developer Experience
- 🚀 Faster feature development
- 🐛 Easier bug fixing
- 📚 Better onboarding for new developers
- 🧪 Easier testing
- 📖 Better documentation

### Code Quality
- ♻️ Better reusability
- 🔍 Easier code reviews
- 🛡️ Fewer bugs
- 📏 Consistent patterns
- 🎯 Clear responsibilities

### Maintenance
- 🔧 Easier updates
- 📦 Better version control
- 👥 Multiple developers can work simultaneously
- 🔄 Easier refactoring in future
- 📊 Better performance monitoring

---

## Summary

### Immediate Actions
1. ✅ Add console logging for debugging (DONE)
2. ✅ Fix shift/team assignment bugs (DONE)
3. 📋 Test with comprehensive debugging guide (IN PROGRESS)

### Future Actions (Optional)
1. 📁 Refactor EmployeeDirectory into multiple components
2. 📁 Split PocketBase hooks into separate files
3. 🧪 Add unit tests for extracted components
4. 📚 Update documentation

### Priority Order
1. **Fix bugs first** (current focus)
2. **Verify fixes work** (use debugging guide)
3. **Plan refactoring** (use this guide)
4. **Refactor gradually** (one component at a time)
5. **Test after each refactor** (ensure nothing breaks)

**Remember:** Working code > Pretty code. Fix issues first, refactor later!
