# 📋 QR Code & Survey Template System Implementation Guide

## 📌 Table of Contents
1. [Overview](#overview)
2. [What Was Implemented](#what-was-implemented)
3. [Files Created](#files-created)
4. [Files Modified](#files-modified)
5. [Database Changes](#database-changes)
6. [How It Works](#how-it-works)
7. [Testing Instructions](#testing-instructions)
8. [Future Work Required](#future-work-required)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This implementation adds two major features to the ASRS system:

1. **QR Code System** - Generate, track, and download QR codes for surveys
2. **Survey Template Linking** - Link QR codes to specific custom survey templates

### Key Capabilities:
- ✅ Generate unique QR codes for surveys
- ✅ Track QR code scans with analytics (total scans, unique IPs, conversion rate)
- ✅ Download QR codes as PNG or SVG images
- ✅ Link QR codes to specific survey templates
- ✅ Render custom survey templates with multiple question types
- ✅ Support text, numeric, and multiple-choice questions
- 🔒 Placeholder comments for future authentication integration

---

## ✨ What Was Implemented

### 1. QR Code Generation System
Allows staff and admin users to generate QR codes that link to surveys. Each QR code:
- Has a unique identifier (e.g., `qr_a1b2c3d4e5f6`)
- Can link to either a general survey or a specific template
- Tracks all scans with detailed analytics
- Can be downloaded as an image for printing or sharing

### 2. Scan Tracking & Analytics
Every time someone scans a QR code:
- The scan is recorded with timestamp, IP address, and user agent
- Analytics are calculated: total scans, unique visitors, conversion rate
- Scan-to-submission conversion tracking

### 3. Survey Template Integration
QR codes can now be linked to specific survey templates:
- Staff create custom survey templates with multiple question types
- Generate a QR code linked to that template
- When users scan the code, they see the custom survey instead of the default form

### 4. Multiple Question Types Support
Survey templates support three question types:
- **Text Response** - Free-form text input (textarea)
- **Numeric** - Number input only
- **Multiple Choice** - Radio button options

---

## 📁 Files Created

### API Endpoints (3 files)

#### 1. `/src/app/api/qr-codes/generate/route.js`
**Purpose:** Generate new QR codes for surveys or reports

**What it does:**
- Generates a unique QR code key using cryptographic random bytes
- Creates a target URL with proper parameters
- Stores QR code metadata in the database
- Returns a base64 PNG image of the QR code

**Key Functions:**
```javascript
generateQRCodeKey() // Creates unique IDs like "qr_a1b2c3d4e5f6"
buildTargetUrl()    // Builds URLs like "/survey?qr=xxx&template=123"
```

**Important Notes:**
- Uses `crypto.randomBytes(6)` for unique key generation
- Supports 3 QR types: 'survey', 'report', 'survey_template'
- Template QR codes use `?template=ID` parameter, others use `?id=ID`
- Contains placeholder comments marked with 🔒 for future auth integration

---

#### 2. `/src/app/api/qr-codes/scan/route.js`
**Purpose:** Track QR code scans and retrieve analytics

**What it does:**
- **POST endpoint:** Records when a QR code is scanned
  - Captures IP address, user agent, referrer
  - Checks if QR code is active and not expired
  - Updates conversion status when survey is submitted

- **GET endpoint:** Retrieves scan statistics
  - Total scans
  - Unique IPs (unique visitors)
  - Conversion rate (scans → submissions)
  - Scans by date (last 30 days)

**Request/Response Examples:**
```javascript
// POST - Record a scan
Request: { qrCodeKey: "qr_abc123", convertedToSubmission: false }
Response: {
  scan: { scanId: 42 },
  qrCode: { isActive: true, isExpired: false }
}

// GET - Get statistics
Request: ?qrCodeKey=qr_abc123
Response: {
  totalScans: 150,
  uniqueIps: 87,
  conversions: 23,
  conversionRate: 15.33,
  scansByDate: [...]
}
```

---

#### 3. `/src/app/api/qr-codes/download/route.js`
**Purpose:** Download QR code images in different formats

**What it does:**
- Generates QR code images on-demand
- Supports PNG (100-2000px) and SVG formats
- Returns binary image data with proper headers

**Query Parameters:**
- `qrCodeKey` - Required, the QR code to download
- `format` - Optional, 'png' or 'svg' (default: 'png')
- `size` - Optional, pixel size for PNG (default: 400)

**Usage Example:**
```
GET /api/qr-codes/download?qrCodeKey=qr_abc123&format=png&size=800
```

---

#### 4. `/src/app/api/surveys/templates/[id]/route.js`
**Purpose:** Fetch a specific survey template by ID

**What it does:**
- Retrieves template data from JSON file storage
- Returns template with title, description, and questions
- Used by survey page to load custom templates

**Response Format:**
```javascript
{
  id: "1234567890",
  title: "Student Experience Survey",
  description: "Tell us about your experience",
  questions: [
    {
      id: "1234567890_0",
      question: "How satisfied are you?",
      type: "choice",
      options: ["Very satisfied", "Satisfied", "Neutral"]
    },
    {
      id: "1234567890_1",
      question: "What can we improve?",
      type: "text",
      options: undefined
    }
  ],
  createdAt: "2024-01-15T10:30:00.000Z",
  published: true
}
```

---

### React Components (1 file)

#### 5. `/src/components/QRCodeManager.js`
**Purpose:** Complete UI for QR code management

**What it includes:**
- **Template Selector** - Dropdown to choose which survey template to link
- **QR Code Generator** - Form to create new QR codes
- **QR Code Display** - Shows generated QR code with details
- **Download Buttons** - Download as PNG (400px, 800px) or SVG
- **Analytics Dashboard** - Shows scan statistics and conversion metrics

**State Management:**
```javascript
// Survey template selection
surveyTemplates      // List of available templates
selectedTemplateId   // Currently selected template ID
templatesLoading     // Loading state for templates

// QR code generation
description          // Optional description for QR code
expiresAt           // Optional expiration date
qrCode              // Generated QR code data
loading             // Generation in progress

// Analytics
stats               // Scan statistics
statsLoading        // Loading state for stats
```

**Key Features:**
- Automatically loads available survey templates on mount
- Shows template link status in QR code details
- Displays analytics with conversion rate calculation
- Real-time feedback with success/error messages

**Placeholder Comments:**
- Contains 🔒 markers for future user authentication
- Currently no access control - anyone can use it
- See "Future Work Required" section for implementation guide

---

### Documentation (1 file)

#### 6. `/QR_CODE_IMPLEMENTATION_README.md`
**Purpose:** Technical documentation for QR code system

**Contents:**
- Database schema documentation
- API endpoint specifications
- Testing procedures
- Future integration guidelines

**Note:** This is the original documentation. The file you're reading now is an expanded version covering both QR codes AND survey templates.

---

## 🔧 Files Modified

### 1. `/package.json`
**Changes:** Added QR code generation dependency

```json
{
  "dependencies": {
    "qrcode": "^1.5.3"  // ← ADDED THIS
  }
}
```

**Installation Command:**
```bash
npm install
```

**Purpose:** The `qrcode` npm package generates QR code images from URLs.

---

### 2. `/src/lib/db.js`
**Changes:** Added QR code database tables and updated schema

#### A. Added `qr_codes` Table
```sql
CREATE TABLE IF NOT EXISTS qr_codes (
  qr_code_id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_key TEXT NOT NULL UNIQUE,           -- Unique ID like "qr_abc123"
  qr_type TEXT NOT NULL,                      -- 'survey', 'report', 'survey_template'
  target_id INTEGER,                          -- Template/Report ID (nullable)
  target_url TEXT NOT NULL,                   -- Full URL the QR code links to
  created_by_user_id INTEGER REFERENCES user(user_id),
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,                            -- Optional expiration
  is_active INTEGER NOT NULL DEFAULT 1,       -- Active/inactive flag
  description TEXT                            -- Optional description
);
```

**Why nullable target_id?**
- General survey QR codes don't link to a specific template (target_id = NULL)
- Template-linked QR codes have a target_id pointing to the template

#### B. Added `qr_scans` Table
```sql
CREATE TABLE IF NOT EXISTS qr_scans (
  qr_scan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  qr_code_id INTEGER NOT NULL REFERENCES qr_codes(qr_code_id),
  scanned_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT,                           -- IPv4 or IPv6
  user_agent TEXT,                           -- Browser/device info
  referrer TEXT,                             -- Where they came from
  country TEXT,                              -- Future: geolocation
  city TEXT,                                 -- Future: geolocation
  converted_to_submission INTEGER DEFAULT NULL  -- NULL/0/1 for conversion tracking
);
```

**Conversion Tracking:**
- Initially set to NULL when scan is recorded
- Updated to 1 if user completes survey submission
- Used to calculate conversion rate in analytics

#### C. Added Indexes for Performance
```sql
-- QR Codes indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_key ON qr_codes(qr_code_key);
CREATE INDEX IF NOT EXISTS idx_qr_codes_type_target ON qr_codes(qr_type, target_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_created_by ON qr_codes(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active);

-- QR Scans indexes
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr_code ON qr_scans(qr_code_id);
CREATE INDEX IF NOT EXISTS idx_qr_scans_date ON qr_scans(scanned_at DESC);
```

**Why these indexes?**
- `idx_qr_codes_key` - Fast lookup when scanning QR codes
- `idx_qr_scans_date` - Fast analytics queries for date ranges
- `idx_qr_codes_type_target` - Efficient template/report lookups

#### D. Updated Test Users (Already existed, but shown for completeness)
```javascript
// Public test user
insertUser.run('Public', 'User', 'public@test.com', 'public123', '555-0001', publicTypeId);

// Staff test user (CAN generate QR codes - once auth is implemented)
insertUser.run('Staff', 'Member', 'staff@test.com', 'staff123', '555-0002', staffTypeId);

// Admin test user (CAN generate QR codes - once auth is implemented)
insertUser.run('Admin', 'User', 'admin@test.com', 'admin123', '555-0003', adminTypeId);
```

**Access Levels (for future implementation):**
- Public: access_rank = 10 (cannot generate QR codes)
- Staff: access_rank = 50 (can generate QR codes)
- Admin: access_rank = 100 (can generate QR codes)

#### E. Placeholder Comments for Future Auth
Look for these markers in the code:

```javascript
// ┌─────────────────────────────────────────────────────────────────────┐
// │ 🔒 ACCESS CONTROL PLACEHOLDER - FOR FUTURE IMPLEMENTATION           │
// ├─────────────────────────────────────────────────────────────────────┤
// │ The user who created this QR code (Staff or Admin)                  │
// │ IMPORTANT: Currently not enforced. When implementing user access     │
// │ levels, add validation in API routes to ensure only users with      │
// │ user_type 'staff' (access_rank >= 50) or 'admin' (access_rank >=   │
// │ 100) can create QR codes per requirements 9f and 11.                │
// └─────────────────────────────────────────────────────────────────────┘
created_by_user_id INTEGER REFERENCES user(user_id),
```

---

### 3. `/src/app/survey/page.js`
**Changes:** Major updates for QR tracking and template rendering

#### A. Added State Variables
```javascript
// QR Code tracking
const [qrCodeKey, setQrCodeKey] = useState(null);
const [scanId, setScanId] = useState(null);

// Survey template loading
const [surveyTemplate, setSurveyTemplate] = useState(null);
const [templateLoading, setTemplateLoading] = useState(false);
const [templateResponses, setTemplateResponses] = useState({});

// User role detection
const [userRole, setUserRole] = useState('public');
```

**What each does:**
- `qrCodeKey` - Stores the QR code ID if user arrived via QR code
- `scanId` - Stores the scan record ID for conversion tracking
- `surveyTemplate` - Holds loaded template data (title, questions, etc.)
- `templateLoading` - Shows loading spinner while template loads
- `templateResponses` - Stores user's answers: `{ questionId: "answer" }`
- `userRole` - Determines if user sees public form or staff QR generator

#### B. Added QR Code Scan Tracking (useEffect #1)
**When it runs:** Once on page load

**What it does:**
1. Checks URL for `?qr=xxx` parameter
2. If found, calls `/api/qr-codes/scan` to record the scan
3. Stores scan ID for later conversion tracking
4. Checks if QR code is active/expired and shows error if not

**Code Flow:**
```javascript
// URL: /survey?qr=qr_abc123
const qrParam = urlParams.get('qr');  // Gets "qr_abc123"
setQrCodeKey(qrParam);                // Save for later

// Record the scan
fetch('/api/qr-codes/scan', {
  method: 'POST',
  body: JSON.stringify({ qrCodeKey: qrParam, convertedToSubmission: false })
});

// Save scan ID for conversion tracking
setScanId(data.scan.scanId);
```

#### C. Added Survey Template Loading (useEffect #2)
**When it runs:** Once on page load

**What it does:**
1. Checks URL for `?template=xxx` parameter
2. If found, fetches template from `/api/surveys/templates/[id]`
3. Stores template in state for rendering

**Code Flow:**
```javascript
// URL: /survey?qr=qr_abc123&template=1234567890
const templateParam = urlParams.get('template');  // Gets "1234567890"

// Load template
const response = await fetch(`/api/surveys/templates/${templateParam}`);
const templateData = await response.json();

// Store template
setSurveyTemplate(templateData);
```

**Template Structure:**
```javascript
{
  id: "1234567890",
  title: "Student Experience Survey",
  description: "Tell us about your experience",
  questions: [
    { id: "...", question: "...", type: "text", options: undefined },
    { id: "...", question: "...", type: "numeric", options: undefined },
    { id: "...", question: "...", type: "choice", options: ["A", "B", "C"] }
  ]
}
```

#### D. Updated Form Submission Handler
**Changes:** Different validation and payload based on survey type

**Default Survey Submission:**
```javascript
// Payload for default survey
{
  name: "John Doe",
  email: "john@example.com",
  responses: {
    firstName: "John",
    lastName: "Doe",
    initiativeRating: "satisfied",
    initiativeComments: "Great initiative!"
  }
}
```

**Template Survey Submission:**
```javascript
// Payload for template-based survey
{
  name: "John Doe",
  email: "john@example.com",
  responses: {
    firstName: "John",
    lastName: "Doe",
    templateId: "1234567890",
    templateTitle: "Student Experience Survey",
    templateAnswers: {
      "1234567890_0": "Very satisfied",  // Question 1 answer
      "1234567890_1": "More study spaces",  // Question 2 answer
      "1234567890_2": "42"  // Question 3 answer (numeric)
    }
  }
}
```

**Conversion Tracking After Submission:**
```javascript
// If user arrived via QR code, mark scan as converted
if (qrCodeKey && scanId) {
  await fetch('/api/qr-codes/scan', {
    method: 'POST',
    body: JSON.stringify({
      qrCodeKey: qrCodeKey,
      convertedToSubmission: true  // ← Mark as converted
    })
  });
}
```

#### E. Added Template Question Rendering
**Renders different input types based on question.type:**

**Text Questions:**
```javascript
{q.type === 'text' && (
  <textarea
    value={templateResponses[q.id] || ''}
    onChange={(e) => setTemplateResponses({
      ...templateResponses,
      [q.id]: e.target.value
    })}
    rows={3}
    required
  />
)}
```

**Numeric Questions:**
```javascript
{q.type === 'numeric' && (
  <input
    type="number"
    value={templateResponses[q.id] || ''}
    onChange={(e) => setTemplateResponses({
      ...templateResponses,
      [q.id]: e.target.value
    })}
    required
  />
)}
```

**Multiple Choice Questions:**
```javascript
{q.type === 'choice' && q.options && (
  <div>
    {q.options.map((option) => (
      <label>
        <input
          type="radio"
          name={`question_${q.id}`}
          value={option}
          checked={templateResponses[q.id] === option}
          onChange={(e) => setTemplateResponses({
            ...templateResponses,
            [q.id]: e.target.value
          })}
          required
        />
        {option}
      </label>
    ))}
  </div>
)}
```

#### F. Updated User Role Detection
**Checks localStorage for logged-in user:**
```javascript
useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    const user = JSON.parse(storedUser);
    setUserRole(user.user_type || 'public');
  }
}, []);
```

**Why this matters:**
- `userRole === 'public'` → Shows survey form
- `userRole === 'staff'` or `'admin'` → Shows QR code generator

#### G. Integrated QRCodeManager Component
**Added to staff/admin view:**
```javascript
{userRole !== 'public' && (
  <QRCodeManager
    qrType="survey"
    showStats={true}
  />
)}
```

---

### 4. `/src/app/api/surveys/templates/route.js`
**Changes:** Fixed question structure mapping

**BEFORE (Incorrect):**
```javascript
questions: questions.map((q) => ({
  id: Date.now() + Math.random(),
  text: q  // ❌ WRONG - treating q as string when it's an object
}))
```

**AFTER (Correct):**
```javascript
questions: questions.map((q, index) => ({
  id: `${Date.now()}_${index}`,
  question: q.question,  // ✅ CORRECT - preserve actual question text
  type: q.type,          // ✅ CORRECT - preserve question type
  options: q.options     // ✅ CORRECT - preserve multiple choice options
}))
```

**Why this was needed:**
- SurveyForm component sends questions as objects: `{question, type, options}`
- Old code tried to convert them to `{id, text: q}` treating `q` as a string
- This caused React errors when trying to render the object as text
- New code preserves the full question structure

**Question Structure Reference:**
```javascript
// What SurveyForm sends:
{
  question: "How satisfied are you?",
  type: "choice",
  options: ["Very satisfied", "Satisfied", "Neutral"]
}

// What gets stored in template:
{
  id: "1234567890_0",
  question: "How satisfied are you?",
  type: "choice",
  options: ["Very satisfied", "Satisfied", "Neutral"]
}
```

---

### 5. `/src/app/api/qr-codes/generate/route.js`
**Changes:** Updated URL parameter generation

**Updated Function:**
```javascript
function buildTargetUrl(qrType, targetId, qrCodeKey, baseUrl) {
  const url = new URL('/survey', baseUrl);
  url.searchParams.set('qr', qrCodeKey);

  // Different parameter names based on QR type
  if (targetId) {
    if (qrType === 'survey_template') {
      url.searchParams.set('template', targetId);  // For templates
    } else {
      url.searchParams.set('id', targetId);        // For others
    }
  }

  return url.toString();
}
```

**Generated URL Examples:**
```javascript
// General survey QR code
"/survey?qr=qr_abc123"

// Template-linked QR code
"/survey?qr=qr_abc123&template=1234567890"

// Report QR code (future use)
"/reporting?qr=qr_abc123&id=5"
```

**Why different parameters?**
- The survey page looks for `?template=xxx` to load templates
- Using consistent parameter names makes the code clearer
- Prevents confusion between template IDs and other entity IDs

---

## 🗄️ Database Changes

### Complete Schema Summary

#### Existing Tables (Before Implementation)
```sql
user_type       -- User types (public, staff, admin)
user            -- User accounts
initiative      -- Initiative categories
field           -- Form field definitions
field_options   -- Options for select/multiselect fields
form            -- Form templates
form_field      -- Fields in forms
submission      -- Form submissions
submission_value -- Submission field values
report_template -- Report templates
report_generation -- Report runs
feature         -- System features
feature_access  -- Feature access levels
surveys         -- Legacy survey storage
reports         -- Legacy report storage
```

#### NEW Tables Added
```sql
qr_codes        -- QR code metadata
qr_scans        -- QR code scan tracking
```

### Table Relationships Diagram

```
qr_codes
├─ qr_code_id (PRIMARY KEY)
├─ created_by_user_id → user(user_id)
├─ target_id → form(form_id) [when qr_type='survey_template']
└─ [Tracked by] qr_scans

qr_scans
├─ qr_scan_id (PRIMARY KEY)
└─ qr_code_id → qr_codes(qr_code_id)
```

### Data Flow Example

**1. Staff creates a survey template:**
```
form table:
├─ form_id: 123
├─ form_name: "Student Experience Survey"
└─ initiative_id: 5

form_field table:
├─ Questions stored as field definitions
└─ Linked to form_id: 123
```

**2. Staff generates QR code for template:**
```
qr_codes table:
├─ qr_code_id: 456
├─ qr_code_key: "qr_a1b2c3d4e5f6"
├─ qr_type: "survey_template"
├─ target_id: 123 (points to form_id)
├─ target_url: "http://localhost:3000/survey?qr=qr_a1b2c3d4e5f6&template=123"
└─ created_by_user_id: 7 (staff member)
```

**3. User scans QR code:**
```
qr_scans table:
├─ qr_scan_id: 789
├─ qr_code_id: 456
├─ scanned_at: "2024-01-15 10:30:00"
├─ ip_address: "192.168.1.100"
├─ user_agent: "Mozilla/5.0..."
└─ converted_to_submission: NULL (not yet submitted)
```

**4. User submits survey:**
```
surveys table:
├─ id: 1011
├─ name: "John Doe"
├─ email: "john@example.com"
└─ responses: "{...templateAnswers...}"

qr_scans table (UPDATED):
├─ qr_scan_id: 789
└─ converted_to_submission: 1 (marked as converted)
```

---

## 🔄 How It Works

### Complete User Flow #1: Staff Creates Template-Linked QR Code

#### Step 1: Login as Staff
```
1. Navigate to /login
2. Enter credentials:
   - Email: staff@test.com
   - Password: staff123
3. Click "Login"
4. Redirected to home page
```

**What happens:**
- `/api/auth/login` checks credentials against database
- User object stored in localStorage
- Header updates to show "Staff Member" and "Logout" button

#### Step 2: Create Survey Template
```
1. Navigate to /survey
2. Scroll to "Create Survey Template" section
3. Fill in:
   - Title: "Student Experience Survey"
   - Description: "Tell us about your campus experience"
4. Add questions:
   - Question 1: "How satisfied are you?" (Multiple Choice)
     - Options: "Very satisfied", "Satisfied", "Neutral"
   - Question 2: "What can we improve?" (Text Response)
   - Question 3: "How many years have you attended?" (Numeric)
5. Click "Create Survey Template"
```

**What happens:**
- POST request to `/api/surveys/templates`
- Template saved to `src/data/surveys.json`
- Template assigned ID (timestamp): "1708012345"
- Success alert shown
- QRCodeManager refreshes template list

#### Step 3: Generate QR Code
```
1. In "Survey Template" dropdown, select "Student Experience Survey"
2. (Optional) Add description: "Spring 2024 Campus Survey"
3. Click "Generate QR Code"
```

**What happens:**
- POST request to `/api/qr-codes/generate`:
  ```javascript
  {
    qrType: "survey_template",
    targetId: "1708012345",
    description: "Spring 2024 Campus Survey"
  }
  ```
- Server:
  1. Generates unique key: `qr_a1b2c3d4e5f6`
  2. Builds URL: `/survey?qr=qr_a1b2c3d4e5f6&template=1708012345`
  3. Creates QR code image (base64 PNG)
  4. Saves to database:
     ```sql
     INSERT INTO qr_codes (qr_code_key, qr_type, target_id, target_url, description, is_active)
     VALUES ('qr_a1b2c3d4e5f6', 'survey_template', '1708012345',
             'http://localhost:3000/survey?qr=qr_a1b2c3d4e5f6&template=1708012345',
             'Spring 2024 Campus Survey', 1);
     ```
- Response shows:
  - QR code image
  - QR code details (ID, type, URL)
  - Download buttons

#### Step 4: Download QR Code
```
1. Click "Download PNG (800px)" button
```

**What happens:**
- Opens URL: `/api/qr-codes/download?qrCodeKey=qr_a1b2c3d4e5f6&format=png&size=800`
- Server generates 800x800px PNG
- Browser downloads file: `qr_a1b2c3d4e5f6.png`
- Staff can now print or share this image

#### Step 5: Share QR Code
```
Staff member:
1. Prints QR code on flyers
2. Posts on social media
3. Displays on digital screens
```

---

### Complete User Flow #2: Public User Scans QR Code

#### Step 1: Scan QR Code
```
1. User opens camera app on phone
2. Points camera at QR code
3. Taps notification to open link
```

**URL opened:**
```
http://localhost:3000/survey?qr=qr_a1b2c3d4e5f6&template=1708012345
```

#### Step 2: Page Load & Scan Tracking
```
1. Survey page loads
2. JavaScript detects URL parameters
3. Two useEffect hooks fire in parallel
```

**useEffect #1 - QR Scan Tracking:**
```javascript
// Detects ?qr=qr_a1b2c3d4e5f6
const qrParam = "qr_a1b2c3d4e5f6";

// Records the scan
POST /api/qr-codes/scan
Body: { qrCodeKey: "qr_a1b2c3d4e5f6", convertedToSubmission: false }

// Database insert:
INSERT INTO qr_scans (qr_code_id, scanned_at, ip_address, user_agent)
VALUES (456, '2024-01-15 14:23:45', '192.168.1.100', 'Mozilla/5.0...');

// Response: { scan: { scanId: 789 }, qrCode: { isActive: true } }
```

**useEffect #2 - Template Loading:**
```javascript
// Detects ?template=1708012345
const templateParam = "1708012345";

// Loads the template
GET /api/surveys/templates/1708012345

// Response:
{
  id: "1708012345",
  title: "Student Experience Survey",
  description: "Tell us about your campus experience",
  questions: [
    {
      id: "1708012345_0",
      question: "How satisfied are you?",
      type: "choice",
      options: ["Very satisfied", "Satisfied", "Neutral"]
    },
    {
      id: "1708012345_1",
      question: "What can we improve?",
      type: "text"
    },
    {
      id: "1708012345_2",
      question: "How many years have you attended?",
      type: "numeric"
    }
  ]
}

// Sets surveyTemplate state → triggers re-render
```

#### Step 3: User Sees Custom Survey
```
Page displays:
┌─────────────────────────────────────────────┐
│ Student Experience Survey                   │
│ Tell us about your campus experience        │
│                                              │
│ Personal Information                         │
│ ├─ First Name: [________]                   │
│ ├─ Last Name:  [________]                   │
│ └─ Email:      [________]                   │
│                                              │
│ Survey Questions                             │
│                                              │
│ 1. How satisfied are you? *                 │
│    ○ Very satisfied                         │
│    ○ Satisfied                              │
│    ○ Neutral                                │
│                                              │
│ 2. What can we improve? *                   │
│    [_____________________________]          │
│    [_____________________________]          │
│                                              │
│ 3. How many years have you attended? *      │
│    [____] (number input)                    │
│                                              │
│ [Clear Form]  [Submit Survey]               │
└─────────────────────────────────────────────┘
```

**Rendering Logic:**
```javascript
// For each question in template
surveyTemplate.questions.map((q) => {
  // Text questions → textarea
  if (q.type === 'text') return <textarea.../>;

  // Numeric questions → number input
  if (q.type === 'numeric') return <input type="number".../>;

  // Multiple choice → radio buttons
  if (q.type === 'choice') {
    return q.options.map(option =>
      <label><input type="radio".../>{option}</label>
    );
  }
})
```

#### Step 4: User Fills Out Survey
```
User enters:
├─ First Name: "Jane"
├─ Last Name: "Smith"
├─ Email: "jane@example.com"
├─ Question 1: Selects "Very satisfied"
├─ Question 2: Types "More study spaces"
└─ Question 3: Enters "3"
```

**State during input:**
```javascript
// Personal info
firstName: "Jane"
lastName: "Smith"
email: "jane@example.com"

// Template responses
templateResponses: {
  "1708012345_0": "Very satisfied",
  "1708012345_1": "More study spaces",
  "1708012345_2": "3"
}
```

#### Step 5: User Submits Survey
```
1. User clicks "Submit Survey"
2. Validation runs
3. Data sent to server
4. Conversion tracked
```

**Validation:**
```javascript
// Check all questions answered
const unansweredQuestions = surveyTemplate.questions.filter(
  q => !templateResponses[q.id] || !templateResponses[q.id].trim()
);

if (unansweredQuestions.length > 0) {
  setError('Please answer all questions before submitting.');
  return; // ❌ Stops submission
}

// Check personal info
if (!firstName.trim() || !lastName.trim() || !email.trim()) {
  setError('Please fill out all required personal information fields.');
  return; // ❌ Stops submission
}

// ✅ All validation passed
```

**Submission Request:**
```javascript
POST /api/surveys
Body: {
  name: "Jane Smith",
  email: "jane@example.com",
  responses: {
    firstName: "Jane",
    lastName: "Smith",
    templateId: "1708012345",
    templateTitle: "Student Experience Survey",
    templateAnswers: {
      "1708012345_0": "Very satisfied",
      "1708012345_1": "More study spaces",
      "1708012345_2": "3"
    }
  }
}
```

**Database Insert:**
```sql
INSERT INTO surveys (name, email, responses, submitted_at)
VALUES (
  'Jane Smith',
  'jane@example.com',
  '{"firstName":"Jane","lastName":"Smith","templateId":"1708012345",...}',
  '2024-01-15 14:28:30'
);
```

**Conversion Tracking:**
```javascript
// Mark the scan as converted
POST /api/qr-codes/scan
Body: {
  qrCodeKey: "qr_a1b2c3d4e5f6",
  convertedToSubmission: true
}

// Database update:
UPDATE qr_scans
SET converted_to_submission = 1
WHERE qr_scan_id = 789;
```

#### Step 6: Success Message Shown
```
Page displays:
┌─────────────────────────────────────────────┐
│              ✅                              │
│                                              │
│         Thank You!                           │
│                                              │
│ Your survey response has been submitted     │
│ successfully. Your feedback helps improve    │
│ future initiatives.                          │
│                                              │
│    [Submit Another Response]                 │
└─────────────────────────────────────────────┘
```

---

### Complete User Flow #3: Staff Views Analytics

#### Step 1: View QR Code Statistics
```
1. Staff member navigates to /survey
2. QRCodeManager shows previously generated QR code
3. Click on QR code to view details
4. Analytics automatically load
```

**Analytics API Request:**
```javascript
GET /api/qr-codes/scan?qrCodeKey=qr_a1b2c3d4e5f6
```

**Database Queries:**
```sql
-- Total scans
SELECT COUNT(*) as total FROM qr_scans WHERE qr_code_id = 456;
-- Result: 150

-- Unique IPs (unique visitors)
SELECT COUNT(DISTINCT ip_address) FROM qr_scans WHERE qr_code_id = 456;
-- Result: 87

-- Conversions (completed surveys)
SELECT COUNT(*) FROM qr_scans
WHERE qr_code_id = 456 AND converted_to_submission = 1;
-- Result: 23

-- Conversion rate
-- Result: (23 / 150) * 100 = 15.33%

-- Scans by date (last 30 days)
SELECT DATE(scanned_at) as scan_date, COUNT(*) as scan_count
FROM qr_scans
WHERE qr_code_id = 456
  AND scanned_at >= date('now', '-30 days')
GROUP BY DATE(scanned_at)
ORDER BY scan_date DESC;
```

**Response:**
```javascript
{
  totalScans: 150,
  uniqueIps: 87,
  conversions: 23,
  conversionRate: 15.33,
  scansByDate: [
    { scan_date: '2024-01-15', scan_count: 12 },
    { scan_date: '2024-01-14', scan_count: 18 },
    { scan_date: '2024-01-13', scan_count: 15 },
    // ... more dates
  ]
}
```

#### Step 2: Analytics Display
```
┌─────────────────────────────────────────────┐
│ 📊 QR Code Analytics                        │
├─────────────────────────────────────────────┤
│                                              │
│ Total Scans          150                    │
│ Unique Visitors      87                     │
│ Conversions          23                     │
│ Conversion Rate      15.33%                 │
│                                              │
│ 📈 Scans Over Time (Last 30 Days)           │
│ ┌───────────────────────────────────────┐  │
│ │ Jan 15  ▓▓▓▓▓▓▓▓▓▓▓▓ 12                │  │
│ │ Jan 14  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 18          │  │
│ │ Jan 13  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ 15             │  │
│ │ ...                                    │  │
│ └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing Instructions

### Prerequisites
```bash
# Ensure dependencies are installed
npm install

# Start development server
npm run dev

# Server should be running at http://localhost:3000
```

### Test Suite 1: QR Code Generation (No Template)

#### Test 1.1: Generate General Survey QR Code
```
1. Login as staff:
   - Email: staff@test.com
   - Password: staff123

2. Navigate to /survey

3. In QRCodeManager section:
   - Leave "Survey Template" as "General Survey (Default)"
   - Description: "Test General Survey QR"
   - Click "Generate QR Code"

4. ✅ VERIFY:
   - Success message appears
   - QR code image displays
   - Type shows "survey" (not "survey_template")
   - Target URL is: /survey?qr=qr_XXXXXX (no template parameter)
```

#### Test 1.2: Download QR Code
```
1. Click "Download PNG (400px)"
2. ✅ VERIFY: File downloads as qr_XXXXXX.png

3. Click "Download PNG (800px)"
4. ✅ VERIFY: File downloads (larger size)

5. Click "Download SVG"
6. ✅ VERIFY: File downloads as qr_XXXXXX.svg
```

#### Test 1.3: Scan General Survey QR
```
1. Open QR code URL in incognito/private window:
   - Right-click QR code URL → "Open in new private window"
   - OR manually type: http://localhost:3000/survey?qr=qr_XXXXXX

2. ✅ VERIFY:
   - Page loads successfully
   - Title is "Take a Survey" (default title)
   - Default survey form shows (rating + comments)
   - NO custom template questions

3. Fill out and submit:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "test@example.com"
   - Rating: "Satisfied"
   - Comments: "Test submission"
   - Click "Submit Survey"

4. ✅ VERIFY:
   - Success message shows
   - "Thank You!" appears
```

---

### Test Suite 2: Survey Template Creation & Linking

#### Test 2.1: Create Survey Template
```
1. Login as staff (if not already)

2. Navigate to /survey

3. Scroll to "Create Survey Template" section

4. Fill in:
   - Title: "Test Template Survey"
   - Description: "This is a test template"

5. Add questions:

   Question 1:
   - Question: "What is your name?"
   - Type: Text Response

   Question 2:
   - Question: "How old are you?"
   - Type: Numeric

   Question 3:
   - Question: "What's your favorite color?"
   - Type: Multiple Choice
   - Options:
     - "Red"
     - "Blue"
     - "Green"

6. Click "Create Survey Template"

7. ✅ VERIFY:
   - Alert shows "Survey template created successfully!"
   - Form clears
   - QR Code Manager template dropdown refreshes
   - New template appears in dropdown
```

#### Test 2.2: Generate Template-Linked QR Code
```
1. In QRCodeManager section:
   - Survey Template: Select "Test Template Survey"
   - Description: "Template QR Test"
   - Click "Generate QR Code"

2. ✅ VERIFY:
   - QR code generates
   - Type shows "survey_template"
   - Shows green badge: "(Linked to Template #XXXXXXXXXX)"
   - Target URL includes: ?template=XXXXXXXXXX
```

#### Test 2.3: Scan Template QR & Verify Custom Questions
```
1. Open template QR URL in incognito window
   - URL format: /survey?qr=qr_XXXXXX&template=XXXXXXXXXX

2. ✅ VERIFY Page Load:
   - Title changes to "Test Template Survey"
   - Description shows "This is a test template"
   - Personal information section shows (same as default)

3. ✅ VERIFY Custom Questions Display:

   Question 1:
   - Label: "1. What is your name? *"
   - Input: Textarea (3 rows)

   Question 2:
   - Label: "2. How old are you? *"
   - Input: Number field

   Question 3:
   - Label: "3. What's your favorite color? *"
   - Input: Radio buttons
     ○ Red
     ○ Blue
     ○ Green
```

#### Test 2.4: Submit Template Survey
```
1. Fill out form:
   - First Name: "Jane"
   - Last Name: "Doe"
   - Email: "jane@example.com"
   - Question 1: "Jane Doe" (text)
   - Question 2: "25" (number)
   - Question 3: Select "Blue" (radio)

2. Click "Submit Survey"

3. ✅ VERIFY:
   - Success message appears
   - "Thank You!" shows
   - No errors in console
```

---

### Test Suite 3: Scan Tracking & Analytics

#### Test 3.1: Verify Scan Recording
```
1. As staff, go to /survey
2. Note the QR code key from generated QR (e.g., qr_a1b2c3)
3. Open Dev Tools → Network tab
4. Click on the generated QR code to view analytics
5. Look for request: GET /api/qr-codes/scan?qrCodeKey=qr_a1b2c3

6. ✅ VERIFY Response:
   {
     totalScans: 1 (or more if tested multiple times),
     uniqueIps: 1,
     conversions: 0 or 1,
     conversionRate: X.XX,
     scansByDate: [...]
   }
```

#### Test 3.2: Test Conversion Tracking
```
1. Generate new QR code (to have clean data)
2. Copy QR code URL
3. Open in incognito window #1:
   - Scan is recorded (totalScans: 1)
   - Fill out and SUBMIT survey
   - Conversion recorded (conversions: 1)

4. Open same URL in incognito window #2:
   - Scan is recorded (totalScans: 2)
   - DO NOT submit survey
   - Conversion NOT recorded (conversions: 1)

5. Go back to staff view → View analytics

6. ✅ VERIFY:
   - Total Scans: 2
   - Unique IPs: 2 (different incognito windows = different IPs locally)
   - Conversions: 1
   - Conversion Rate: 50.00%
```

#### Test 3.3: Test Analytics Display
```
1. In QRCodeManager, click "View Stats" (or stats load automatically)

2. ✅ VERIFY Display Shows:
   - 📊 Total Scans (number)
   - 👥 Unique Visitors (number)
   - ✅ Conversions (number)
   - 📈 Conversion Rate (percentage with 2 decimals)
   - Date chart (scans by date for last 30 days)
```

---

### Test Suite 4: Multiple Question Types

#### Test 4.1: Create Multi-Type Template
```
1. Create new template with ALL question types:

   Title: "All Question Types Test"
   Description: "Testing all three question types"

   Questions:
   1. "Describe your experience" → Text Response
   2. "Rate from 1-10" → Numeric
   3. "Choose department" → Multiple Choice
      - Options: "Engineering", "Business", "Arts", "Science"
   4. "Additional comments" → Text Response
   5. "How many courses?" → Numeric

2. Click "Create Survey Template"

3. ✅ VERIFY: Template created successfully
```

#### Test 4.2: Generate & Test Multi-Type QR
```
1. Generate QR for "All Question Types Test" template
2. Open QR URL in incognito window

3. ✅ VERIFY Question Rendering:
   - Question 1: Textarea visible
   - Question 2: Number input (<input type="number">)
   - Question 3: Four radio buttons
   - Question 4: Textarea visible
   - Question 5: Number input

4. Fill out form:
   - Q1: "Great experience" (text)
   - Q2: 8 (number)
   - Q3: "Engineering" (radio)
   - Q4: "Need more resources" (text)
   - Q5: 5 (number)

5. Submit survey

6. ✅ VERIFY: Submission successful
```

---

### Test Suite 5: Validation & Error Handling

#### Test 5.1: Template Survey Validation
```
1. Open template QR URL
2. Fill only personal info (leave questions blank)
3. Click "Submit Survey"

4. ✅ VERIFY:
   - Error message: "Please answer all questions before submitting."
   - Form does NOT submit
   - No API request sent
```

#### Test 5.2: Personal Info Validation (Template Survey)
```
1. Fill out all questions
2. Leave personal info blank
3. Click "Submit Survey"

4. ✅ VERIFY:
   - Error message: "Please fill out all required personal information fields."
   - Form does NOT submit
```

#### Test 5.3: Expired QR Code
```
NOTE: This test requires manually setting expires_at in database

1. Generate QR code
2. Manually update database:
   UPDATE qr_codes
   SET expires_at = '2020-01-01T00:00:00.000Z'
   WHERE qr_code_key = 'qr_XXXXXX';

3. Open QR URL

4. ✅ VERIFY:
   - Error message: "This QR code has expired. Please use a current link."
   - Form is still visible (can still submit)
```

#### Test 5.4: Inactive QR Code
```
1. Generate QR code
2. Manually update database:
   UPDATE qr_codes
   SET is_active = 0
   WHERE qr_code_key = 'qr_XXXXXX';

3. Open QR URL

4. ✅ VERIFY:
   - Error message: "This QR code has been deactivated. Please contact support."
```

#### Test 5.5: Invalid Template ID
```
1. Manually craft URL with fake template ID:
   http://localhost:3000/survey?qr=qr_abc123&template=99999999

2. ✅ VERIFY:
   - Error message: "Survey template not found. The link may be invalid or expired."
   - Default survey form does NOT show
   - Only error message shows
```

---

### Test Suite 6: Edge Cases

#### Test 6.1: Template with Empty Options
```
1. Create template with multiple choice question
2. Add option, then remove it (leave empty)
3. Try to create template

4. ✅ VERIFY:
   - Alert: "Question X is multiple choice but has no options..."
   - Template NOT created
```

#### Test 6.2: Template with No Questions
```
1. Try to create template with title/description but no questions
2. Click "Create Survey Template"

3. ✅ VERIFY:
   - Alert: "Please add at least one question"
   - Template NOT created
```

#### Test 6.3: QR Code Download Different Sizes
```
1. Generate QR code
2. Test different download sizes:
   - Download PNG (400px)
   - Download PNG (800px)

3. ✅ VERIFY:
   - Both downloads work
   - File sizes are different (800px is larger)
   - Images open successfully
   - QR codes are scannable (test with phone camera)
```

#### Test 6.4: Multiple Scans Same User
```
1. Generate QR code
2. Open URL 5 times in same incognito window
3. Check analytics

4. ✅ EXPECTED BEHAVIOR:
   - Total Scans: 5 (each page load counts)
   - Unique IPs: 1 (same browser session = same IP)
   - This is CORRECT - we track all scans, not just unique
```

#### Test 6.5: Numeric Question with Text Input
```
1. Open template with numeric question
2. Try to type letters in numeric field

3. ✅ VERIFY:
   - Only numbers can be entered
   - Letters are automatically blocked (HTML5 validation)
   - Decimal numbers work
   - Negative numbers work
```

---

### Test Suite 7: User Role Behavior

#### Test 7.1: Public User View
```
1. Logout (or open in incognito without logging in)
2. Navigate to /survey

3. ✅ VERIFY:
   - Shows survey form
   - Does NOT show QR Code Manager
   - Does NOT show "Create Survey Template" section
   - Header shows "Take Survey" and "Login" links
```

#### Test 7.2: Staff User View
```
1. Login as staff@test.com
2. Navigate to /survey

3. ✅ VERIFY:
   - Shows QR Code Manager
   - Shows "Create Survey Template" section
   - Does NOT show survey form (that's for public)
   - Header shows all navigation links + "Logout"
```

#### Test 7.3: Admin User View
```
1. Login as admin@test.com (password: admin123)
2. Navigate to /survey

3. ✅ VERIFY:
   - Same as staff view
   - Shows QR Code Manager
   - Shows "Create Survey Template" section
   - No difference from staff (yet - will change with auth)
```

---

### Database Verification Tests

#### Test DB.1: Verify QR Code Record
```
1. Generate QR code
2. Check database using your preferred SQLite viewer

3. Query:
   SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 1;

4. ✅ VERIFY Record Has:
   - qr_code_id (auto-incremented number)
   - qr_code_key (starts with "qr_")
   - qr_type ('survey' or 'survey_template')
   - target_id (NULL or template ID)
   - target_url (full URL)
   - created_at (timestamp)
   - is_active (1)
   - description (if provided)
```

#### Test DB.2: Verify Scan Record
```
1. Scan QR code
2. Query:
   SELECT * FROM qr_scans ORDER BY scanned_at DESC LIMIT 1;

3. ✅ VERIFY Record Has:
   - qr_scan_id
   - qr_code_id (matches qr_codes.qr_code_id)
   - scanned_at (recent timestamp)
   - ip_address (not NULL)
   - user_agent (contains browser info)
   - converted_to_submission (NULL initially)
```

#### Test DB.3: Verify Conversion Update
```
1. Scan QR code → Submit survey
2. Query same scan record:
   SELECT * FROM qr_scans WHERE qr_scan_id = X;

3. ✅ VERIFY:
   - converted_to_submission changed from NULL to 1
```

#### Test DB.4: Verify Template Storage
```
1. Create survey template
2. Check file: src/data/surveys.json
3. Open in text editor

4. ✅ VERIFY JSON Structure:
   [
     {
       "id": "1708012345",
       "title": "...",
       "description": "...",
       "questions": [
         {
           "id": "1708012345_0",
           "question": "...",
           "type": "text"|"numeric"|"choice",
           "options": [...]  // only for choice type
         }
       ],
       "createdAt": "2024-...",
       "published": true
     }
   ]
```

---

## 🔮 Future Work Required

### 1. User Authentication Integration

**Current State:**
- Users can manually login via `/login` page
- User data stored in localStorage
- No session management
- No token-based auth

**What Needs to Be Done:**

#### A. Implement Session Management
```javascript
// Option 1: JWT Tokens (Recommended)
// File: /src/lib/auth.js

import jwt from 'jsonwebtoken';

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      email: user.email,
      userType: user.user_type,
      accessRank: user.access_rank
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}
```

```javascript
// File: /src/app/api/auth/login/route.js
// UPDATE the login endpoint to return a token:

return NextResponse.json({
  success: true,
  token: generateToken(user),  // ← ADD THIS
  user: {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    user_type: user.user_type,
    access_rank: user.access_rank  // ← ADD THIS
  }
});
```

```javascript
// File: /src/lib/middleware.js (NEW FILE)
// Create middleware to verify auth on protected routes

export async function requireAuth(request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const user = verifyToken(token);
  if (!user) {
    return NextResponse.json(
      { error: 'Invalid or expired token' },
      { status: 401 }
    );
  }

  return user;
}

export async function requireStaffOrAdmin(request) {
  const user = await requireAuth(request);

  if (user.accessRank < 50) {
    return NextResponse.json(
      { error: 'Staff or Admin access required' },
      { status: 403 }
    );
  }

  return user;
}
```

#### B. Update QR Code Generation API
```javascript
// File: /src/app/api/qr-codes/generate/route.js
// FIND the placeholder comment (line ~132) and REPLACE with:

import { requireStaffOrAdmin } from '@/lib/middleware';

export async function POST(request) {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 0: Check Authentication & Authorization
    // ─────────────────────────────────────────────────────────────────────
    const user = await requireStaffOrAdmin(request);
    if (user instanceof NextResponse) return user; // Auth failed

    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Parse and Validate Request Body
    // ─────────────────────────────────────────────────────────────────────
    const body = await request.json();
    // ... rest of existing code

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Insert QR Code Record into Database
    // ─────────────────────────────────────────────────────────────────────
    const result = insertStmt.run(
      qrCodeKey,
      qrType,
      targetId || null,
      targetUrl,
      user.userId,  // ← CHANGED from userId || null to user.userId
      expiresAt || null,
      1,
      description || null
    );
    // ... rest of existing code
  }
  // ... catch block
}
```

#### C. Update Frontend to Send Token
```javascript
// File: /src/components/QRCodeManager.js
// FIND handleGenerateQR function (~line 134) and UPDATE:

const handleGenerateQR = async () => {
  setError(null);
  setSuccess(null);
  setLoading(true);

  try {
    // Get token from localStorage
    const storedUser = localStorage.getItem('user');
    const token = storedUser ? JSON.parse(storedUser).token : null;

    if (!token) {
      setError('You must be logged in to generate QR codes.');
      setLoading(false);
      return;
    }

    // ... prepare requestBody (existing code)

    const response = await fetch('/api/qr-codes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // ← ADD THIS
      },
      body: JSON.stringify(requestBody),
    });

    // ... rest of existing code
  } catch (err) {
    // ... existing error handling
  }
};
```

#### D. Hide QRCodeManager for Non-Staff
```javascript
// File: /src/components/QRCodeManager.js
// FIND the placeholder comment (~line 104) and ADD at the START of component:

export default function QRCodeManager({ qrType, targetId, showStats }) {
  // ═══════════════════════════════════════════════════════════════════════
  // CHECK USER ACCESS LEVEL
  // ═══════════════════════════════════════════════════════════════════════
  const [userCanAccess, setUserCanAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      // Check if user is staff or admin
      if (user.access_rank >= 50) {
        setUserCanAccess(true);
      }
    }
    setCheckingAccess(false);
  }, []);

  // If user doesn't have access, show error
  if (checkingAccess) {
    return <div className="asrs-card p-6">Loading...</div>;
  }

  if (!userCanAccess) {
    return (
      <div className="asrs-card p-6">
        <p className="text-red-600 font-semibold">
          ⚠️ Staff or Admin access required to generate QR codes.
        </p>
        <p className="text-gray-600 mt-2">
          Please contact your administrator if you need access.
        </p>
      </div>
    );
  }

  // ... rest of existing component code
}
```

---

### 2. Survey Template Access Control

**What Needs to Be Done:**

#### A. Protect Template Creation Endpoint
```javascript
// File: /src/app/api/surveys/templates/route.js
// ADD import at top:
import { requireStaffOrAdmin } from '@/lib/middleware';

// UPDATE POST handler:
export async function POST(request) {
  try {
    // Check authentication
    const user = await requireStaffOrAdmin(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    // ... rest of existing code

    const newSurvey = {
      id: Date.now().toString(),
      title,
      description: description || "",
      questions: questions.map((q, index) => ({
        id: `${Date.now()}_${index}`,
        question: q.question,
        type: q.type,
        options: q.options
      })),
      createdAt: new Date().toISOString(),
      published: true,
      createdBy: user.userId  // ← ADD THIS to track who created it
    };

    // ... rest of existing code
  } catch (err) {
    // ... existing error handling
  }
}
```

#### B. Hide Template Creation Form
```javascript
// File: /src/components/SurveyForm.js
// ADD at the START of component:

export default function SurveyForm() {
  const [userCanAccess, setUserCanAccess] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.access_rank >= 50) {
        setUserCanAccess(true);
      }
    }
  }, []);

  if (!userCanAccess) {
    return (
      <div className="asrs-card" style={{ padding: '1.5rem' }}>
        <p style={{ color: '#dc2626', fontWeight: 600 }}>
          ⚠️ Staff or Admin access required to create survey templates.
        </p>
      </div>
    );
  }

  // ... rest of existing component
}
```

---

### 3. Database Migration for Existing Data

**Problem:**
If there are existing survey templates created with the OLD format (before our fix), they will have incorrect question structure.

**Solution:**

#### A. Create Migration Script
```javascript
// File: /scripts/migrate-templates.js (NEW FILE)

import { promises as fs } from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data', 'surveys.json');

async function migrateTemplates() {
  console.log('🔄 Starting template migration...');

  // Read existing templates
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  const templates = JSON.parse(raw || '[]');

  console.log(`📋 Found ${templates.length} templates`);

  let migrated = 0;

  // Check each template
  const updatedTemplates = templates.map((template) => {
    // Check if questions have old format (have 'text' field instead of 'question')
    if (template.questions && template.questions[0]?.text !== undefined) {
      console.log(`⚠️  Template "${template.title}" has old format, migrating...`);

      // Skip this template - cannot fix because we don't know the question types
      // Staff will need to recreate it
      console.log(`❌ Cannot migrate template "${template.title}" - please recreate`);
      return { ...template, _needsRecreation: true };
    }

    return template;
  });

  // Filter out templates that need recreation
  const validTemplates = updatedTemplates.filter(t => !t._needsRecreation);
  const needRecreation = updatedTemplates.filter(t => t._needsRecreation);

  // Save valid templates
  await fs.writeFile(DATA_PATH, JSON.stringify(validTemplates, null, 2));

  console.log(`✅ Migration complete!`);
  console.log(`   - Valid templates: ${validTemplates.length}`);
  console.log(`   - Need recreation: ${needRecreation.length}`);

  if (needRecreation.length > 0) {
    console.log('\n⚠️  The following templates need to be recreated:');
    needRecreation.forEach(t => {
      console.log(`   - "${t.title}"`);
    });
  }
}

migrateTemplates().catch(console.error);
```

#### B. Run Migration
```bash
# Add to package.json scripts:
"migrate-templates": "node scripts/migrate-templates.js"

# Run migration:
npm run migrate-templates
```

---

### 4. Analytics Enhancements

**Optional Improvements:**

#### A. Add Geographic Tracking
```javascript
// File: /src/app/api/qr-codes/scan/route.js
// ADD IP geolocation service (e.g., ipapi.co)

async function getGeoLocation(ip) {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name,
      city: data.city
    };
  } catch (err) {
    return { country: null, city: null };
  }
}

// UPDATE scan recording to include geo data:
const geo = await getGeoLocation(ipAddress);

insertStmt.run(
  qrCodeId,
  new Date().toISOString(),
  ipAddress,
  userAgent,
  referrer,
  geo.country,  // Now populated
  geo.city,     // Now populated
  null
);
```

#### B. Add Scan Timeline Chart
```javascript
// File: /src/components/QRCodeManager.js
// ADD chart library (e.g., recharts)

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

// In analytics display section:
<div>
  <h3>📈 Scans Over Time</h3>
  <LineChart width={600} height={300} data={stats.scansByDate}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="scan_date" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="scan_count" stroke="#8884d8" />
  </LineChart>
</div>
```

---

### 5. QR Code Management Features

**Recommended Additions:**

#### A. List All QR Codes
```javascript
// File: /src/app/api/qr-codes/list/route.js (NEW FILE)

import { NextResponse } from 'next/server';
import db, { initializeDatabase } from '@/lib/db';
import { requireStaffOrAdmin } from '@/lib/middleware';

export async function GET(request) {
  try {
    initializeDatabase();

    const user = await requireStaffOrAdmin(request);
    if (user instanceof NextResponse) return user;

    // Get all QR codes for this user
    const qrCodes = db.prepare(`
      SELECT
        qr_code_id,
        qr_code_key,
        qr_type,
        target_id,
        target_url,
        description,
        created_at,
        is_active,
        (SELECT COUNT(*) FROM qr_scans WHERE qr_code_id = qr_codes.qr_code_id) as total_scans
      FROM qr_codes
      WHERE created_by_user_id = ?
      ORDER BY created_at DESC
    `).all(user.userId);

    return NextResponse.json({ qrCodes });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

#### B. Deactivate QR Code
```javascript
// File: /src/app/api/qr-codes/deactivate/route.js (NEW FILE)

export async function POST(request) {
  try {
    initializeDatabase();

    const user = await requireStaffOrAdmin(request);
    if (user instanceof NextResponse) return user;

    const { qrCodeKey } = await request.json();

    // Update is_active to 0
    db.prepare(`
      UPDATE qr_codes
      SET is_active = 0
      WHERE qr_code_key = ? AND created_by_user_id = ?
    `).run(qrCodeKey, user.userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
```

---

## 🐛 Troubleshooting

### Issue 1: QR Code Not Generating
**Symptoms:**
- Click "Generate QR Code" → Nothing happens
- Error in console: "Failed to generate QR code"

**Possible Causes & Solutions:**

#### A. Missing qrcode Package
```bash
# Check if installed:
npm list qrcode

# If not found, install:
npm install qrcode@^1.5.3
```

#### B. Database Not Initialized
```bash
# Check if data directory exists:
ls data/

# If not, restart dev server (it creates on startup):
npm run dev
```

#### C. Database Locked
```bash
# Stop dev server
# Delete database:
rm data/asrs.db data/asrs.db-shm data/asrs.db-wal

# Restart server:
npm run dev
```

---

### Issue 2: Template Not Loading
**Symptoms:**
- Scan QR code → "Survey template not found" error
- Template dropdown is empty

**Solutions:**

#### A. Check Template File Exists
```bash
# Check file:
cat src/data/surveys.json

# If file doesn't exist or is empty, create a test template
```

#### B. Check Template ID Matches
```javascript
// In browser console on survey page:
const urlParams = new URLSearchParams(window.location.search);
console.log('Template ID from URL:', urlParams.get('template'));

// Then check if this ID exists in surveys.json
```

#### C. Invalid Template Format
```bash
# Validate JSON syntax:
cat src/data/surveys.json | python -m json.tool

# If invalid, fix syntax errors or delete and recreate templates
```

---

### Issue 3: Scans Not Recording
**Symptoms:**
- Open QR URL → Scan count doesn't increase
- Analytics show 0 scans

**Solutions:**

#### A. Check URL Has QR Parameter
```
Correct:   /survey?qr=qr_abc123
Incorrect: /survey
```

#### B. Check Database Permissions
```bash
# Check if qr_scans table exists:
sqlite3 data/asrs.db "SELECT COUNT(*) FROM qr_scans;"

# If error "no such table", database needs reinitialization
```

#### C. Check Network Tab
```
1. Open Dev Tools → Network tab
2. Scan QR code
3. Look for POST to /api/qr-codes/scan
4. Check response for errors
```

---

### Issue 4: Conversion Tracking Not Working
**Symptoms:**
- Submit survey → Conversion rate stays 0%
- converted_to_submission stays NULL in database

**Solutions:**

#### A. Check scanId Is Set
```javascript
// In browser console on survey page before submitting:
console.log('scanId:', scanId);
console.log('qrCodeKey:', qrCodeKey);

// If either is null, scan wasn't recorded properly
```

#### B. Check Submission Handler
```javascript
// Add debug logging to handleSubmit:
console.log('Tracking conversion:', { qrCodeKey, scanId });

// Should log both values, not null
```

---

### Issue 5: Multiple Choice Options Not Showing
**Symptoms:**
- Create template with multiple choice → Options don't appear in survey
- Radio buttons missing

**Solutions:**

#### A. Check Question Type
```javascript
// In template, verify type is exactly "choice":
{
  type: "choice",  // ✅ Correct
  options: ["A", "B", "C"]
}

// NOT:
{
  type: "multiple_choice",  // ❌ Wrong
  type: "radio",            // ❌ Wrong
}
```

#### B. Check Options Array
```javascript
// Options must be non-empty array:
{
  type: "choice",
  options: ["A", "B", "C"]  // ✅ Correct
}

// NOT:
{
  type: "choice",
  options: []  // ❌ Empty - will not render
}

// NOT:
{
  type: "choice"
  // Missing options field - will error
}
```

---

### Issue 6: React Rendering Errors
**Symptoms:**
- Error: "Objects are not valid as a React child"
- Survey page crashes when loading template

**Solutions:**

#### A. Check Template Question Structure
This was the main bug we fixed. Verify templates have correct structure:

```javascript
// CORRECT structure after fix:
{
  id: "123_0",
  question: "What is your name?",  // ✅ "question" field
  type: "text",
  options: undefined
}

// INCORRECT structure (old format):
{
  id: 123.456,
  text: { question: "...", type: "...", options: [...] }  // ❌ Nested object
}
```

**Fix:**
1. Delete `src/data/surveys.json`
2. Recreate all templates using the form
3. They will now have correct structure

---

### Issue 7: Download Not Working
**Symptoms:**
- Click download → Nothing happens
- Download starts but file is corrupt

**Solutions:**

#### A. Check QR Code Key in URL
```javascript
// URL should be:
/api/qr-codes/download?qrCodeKey=qr_abc123&format=png&size=800

// NOT:
/api/qr-codes/download  // Missing qrCodeKey
```

#### B. Check Format Parameter
```javascript
// Valid formats:
format=png  // ✅
format=svg  // ✅

// Invalid:
format=jpg  // ❌ Not supported
format=pdf  // ❌ Not supported
```

#### C. Check Size Parameter
```javascript
// Valid sizes for PNG:
size=100   // Minimum
size=400   // Default
size=800   // Large
size=2000  // Maximum

// Invalid:
size=50    // ❌ Too small
size=5000  // ❌ Too large
```

---

## 📊 Summary of Changes

### Files Created: 6
1. `/src/app/api/qr-codes/generate/route.js` - QR generation endpoint
2. `/src/app/api/qr-codes/scan/route.js` - Scan tracking endpoint
3. `/src/app/api/qr-codes/download/route.js` - QR download endpoint
4. `/src/app/api/surveys/templates/[id]/route.js` - Template fetch endpoint
5. `/src/components/QRCodeManager.js` - QR management UI component
6. `/QR_CODE_IMPLEMENTATION_README.md` - Original documentation

### Files Modified: 5
1. `/package.json` - Added qrcode dependency
2. `/src/lib/db.js` - Added qr_codes and qr_scans tables + indexes
3. `/src/app/survey/page.js` - Added QR tracking, template loading, and rendering
4. `/src/app/api/surveys/templates/route.js` - Fixed question structure mapping
5. `/src/app/api/qr-codes/generate/route.js` - Updated URL parameter logic

### Database Tables Added: 2
1. `qr_codes` - Stores QR code metadata
2. `qr_scans` - Tracks individual QR code scans

### Database Indexes Added: 6
1. `idx_qr_codes_key` - Fast QR code lookups
2. `idx_qr_codes_type_target` - Template/report queries
3. `idx_qr_codes_created_by` - User's QR codes
4. `idx_qr_codes_active` - Active QR code filtering
5. `idx_qr_scans_qr_code` - Scan analytics
6. `idx_qr_scans_date` - Date-based analytics

### Key Features Implemented:
- ✅ QR code generation with unique keys
- ✅ Multiple QR code types (survey, report, survey_template)
- ✅ QR code downloads (PNG, SVG)
- ✅ Scan tracking with IP, user agent, referrer
- ✅ Conversion tracking (scan → submission)
- ✅ Analytics dashboard (total scans, unique IPs, conversion rate)
- ✅ Survey template linking via QR codes
- ✅ Dynamic template rendering (text, numeric, choice questions)
- ✅ Template-based form validation
- ✅ User role detection (public vs staff/admin views)

### Future Work Required:
- 🔒 User authentication (JWT tokens)
- 🔒 Session management
- 🔒 Access control for QR generation (staff/admin only)
- 🔒 Access control for template creation (staff/admin only)
- 📊 Geographic tracking (IP geolocation)
- 📊 Analytics charts (timeline visualization)
- 🗃️ QR code management UI (list, deactivate, edit)
- 🗃️ Template management UI (list, edit, delete)

---

## 📞 Support & Contact

**For Questions:**
- Review this documentation
- Check the "Troubleshooting" section
- Inspect browser console for errors
- Check database records manually

**Common Commands:**
```bash
# Start dev server
npm run dev

# Install dependencies
npm install

# Check database
sqlite3 data/asrs.db "SELECT * FROM qr_codes ORDER BY created_at DESC LIMIT 5;"

# View recent scans
sqlite3 data/asrs.db "SELECT * FROM qr_scans ORDER BY scanned_at DESC LIMIT 10;"

# Reset database (CAUTION: Deletes all data)
rm data/asrs.db*
npm run dev
```

---

## 🎯 Quick Start Checklist

For teammates reviewing this implementation:

- [ ] Read "Overview" section
- [ ] Understand "How It Works" flow diagrams
- [ ] Review "Files Created" and "Files Modified" sections
- [ ] Run "Test Suite 1" (QR code generation)
- [ ] Run "Test Suite 2" (Survey templates)
- [ ] Run "Test Suite 3" (Scan tracking)
- [ ] Check "Future Work Required" for next steps
- [ ] Review placeholder comments (🔒) in code
- [ ] Verify database schema in `db.js`
- [ ] Test edge cases (Test Suite 6)

---

**Documentation Version:** 1.0
**Last Updated:** February 2024
**Implementation Status:** ✅ Complete (Pending Future Work)
**Author:** Claude Code Implementation Team

---

**End of Documentation**
