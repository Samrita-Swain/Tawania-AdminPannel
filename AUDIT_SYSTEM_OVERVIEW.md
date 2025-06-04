# 📊 Audit System - Complete Overview

## 🎯 Two Types of Audits

### 1. 📋 **Inventory Audits** (Physical Stock Counting)
**Purpose**: Count and verify physical inventory in warehouses

**Models**:
- `Audit` - Main audit record
- `AuditItem` - Individual items to count
- `AuditAssignment` - User assignments

**Status Flow**:
```
PLANNED → IN_PROGRESS → COMPLETED/CANCELLED
```

**Progress Calculation**:
```javascript
const totalItems = audit.items.length;
// Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
const perfectlyCountedItems = audit.items.filter(item =>
  item.status === "COUNTED" ||
  item.status === "RECONCILED"
).length;
const progress = Math.round((perfectlyCountedItems / totalItems) * 100);
```

### 2. 📝 **Audit Logs** (Activity Tracking)
**Purpose**: Track all system activities and changes

**Model**: `AuditLog`
**Function**: Records who did what, when, and where

---

## 🔄 Inventory Audit Workflow

### **Step 1: Planning (PLANNED)**
- Create audit with warehouse, dates, notes
- Assign users to specific zones
- Generate audit items from inventory
- Status: `PLANNED`

### **Step 2: Start Audit (IN_PROGRESS)**
- Change status to `IN_PROGRESS`
- Users can begin counting
- Progress tracking begins

### **Step 3: Counting Process**
- Users count items in assigned zones
- Update `AuditItem.actualQuantity`
- Set item status: `COUNTED`, `DISCREPANCY`, etc.
- Progress updates in real-time

### **Step 4: Completion (COMPLETED)**
- Review all discrepancies
- Finalize audit
- Generate reports
- Status: `COMPLETED`

---

## 📈 Progress Tracking

### **Main List Progress Bar**:
```javascript
// In /audits page - Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
const totalItems = audit.items.length;
const perfectlyCountedItems = audit.items.filter((item) =>
  item.status === "COUNTED" || item.status === "RECONCILED"
).length;
const progress = totalItems > 0 ? Math.round((perfectlyCountedItems / totalItems) * 100) : 0;
```

### **Detail Page Progress**:
```javascript
// In /audits/[id] page - Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
const totalItems = audit.items.length;
const perfectlyCountedItems = audit.items.filter((item) =>
  item.status === "COUNTED" || item.status === "RECONCILED"
).length;
const progress = totalItems > 0 ? Math.round((perfectlyCountedItems / totalItems) * 100) : 0;
```

---

## 🎨 Visual Progress Display

### **Progress Bar Component**:
```html
<div className="w-full bg-gray-200 rounded-full h-2.5">
  <div
    className="bg-blue-600 h-2.5 rounded-full"
    style={{ width: `${progress}%` }}
  ></div>
</div>
<span className="ml-2 text-xs text-gray-800">{progress}%</span>
```

### **Statistics Display**:
- **Total Items**: Total audit items
- **Counted Items**: Items with status COUNTED/RECONCILED/DISCREPANCY
- **Discrepancies**: Items with DISCREPANCY status
- **Accuracy Rate**: (Counted - Discrepancies) / Counted * 100

---

## 🔧 Current Issues & Solutions

### **Issue 1: Schema Mismatch**
**Problem**: Different field names in schema vs generated client
**Solution**: Use correct field names from actual schema

### **Issue 2: Progress Not Updating**
**Problem**: Progress might not update in real-time
**Solution**: Ensure item status updates trigger progress recalculation

### **Issue 3: Audit Log Confusion**
**Problem**: Mixing inventory audits with audit logs
**Solution**: Clear separation and documentation

---

## 🚀 How Progress Works

1. **Audit Creation**: Items generated with status `PENDING`
2. **Start Counting**: Users update item quantities and status
3. **Progress Calculation**: Real-time calculation based on item statuses
4. **Visual Update**: Progress bars update automatically
5. **Completion**: 100% when all items counted/reconciled

---

## 📊 Progress States

- **0%**: All items `PENDING`
- **25%**: 1/4 items perfectly counted (COUNTED/RECONCILED)
- **50%**: Half items perfectly counted (COUNTED/RECONCILED)
- **100%**: All items `COUNTED` or `RECONCILED` (NO DISCREPANCIES)

---

## 🎯 Key Components

1. **Audit List** (`/audits`) - Shows all audits with progress
2. **Audit Detail** (`/audits/[id]`) - Detailed view with statistics
3. **Counting Interface** (`/audits/[id]/count`) - Where users count items
4. **Progress Calculation** - Real-time based on item statuses
5. **Visual Display** - Progress bars and percentages
