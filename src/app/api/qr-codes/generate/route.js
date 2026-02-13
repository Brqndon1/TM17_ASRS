// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE: Generate QR Codes for Surveys
// ═══════════════════════════════════════════════════════════════════════════
// Purpose: Creates unique QR codes that link to surveys or reports
// Requirements: Implements requirements 8c, 9f, 11, and 15d
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import QRCode from 'qrcode';
import crypto from 'crypto';

// ──────────────────────────────────────────────────────────────────────────
// INITIALIZE DATABASE
// ──────────────────────────────────────────────────────────────────────────
// Ensure all database tables exist before processing any requests
initializeDatabase();

// ──────────────────────────────────────────────────────────────────────────
// HELPER FUNCTION: Generate Unique QR Code Key
// ──────────────────────────────────────────────────────────────────────────
// Creates a cryptographically secure random string for the QR code identifier
// This key is used in the URL and must be unique in the database
//
// Returns: A string like "qr_a1b2c3d4e5f6" (prefix + 12 random hex characters)
function generateQRCodeKey() {
  const randomBytes = crypto.randomBytes(6); // 6 bytes = 12 hex characters
  const hexString = randomBytes.toString('hex');
  return `qr_${hexString}`;
}

// ──────────────────────────────────────────────────────────────────────────
// HELPER FUNCTION: Build Target URL
// ──────────────────────────────────────────────────────────────────────────
// Constructs the full URL that the QR code will redirect to
// Includes the qr_code_key as a query parameter for scan tracking
//
// Parameters:
//   - qrType: 'survey', 'report', or 'survey_template'
//   - targetId: The ID of the entity (survey/report)
//   - qrCodeKey: The unique QR code identifier
//   - baseUrl: The base URL of the application (from environment or request)
//
// Returns: Full URL string like "https://asrs.com/survey?qr=qr_abc123"
function buildTargetUrl(qrType, targetId, qrCodeKey, baseUrl) {
  // Determine the path based on QR type
  let path = '';

  if (qrType === 'survey' || qrType === 'survey_template') {
    path = '/survey';
  } else if (qrType === 'report') {
    path = '/reporting';
  }

  // Build the complete URL with QR code key for tracking
  // The qr parameter is used by the scan tracking endpoint
  const url = new URL(path, baseUrl);
  url.searchParams.set('qr', qrCodeKey);

  // ─────────────────────────────────────────────────────────────────────
  // Add Target ID with Appropriate Parameter Name
  // ─────────────────────────────────────────────────────────────────────
  // For survey templates: use 'template' parameter
  // For other types: use 'id' parameter
  // Examples:
  //   - Survey template: /survey?qr=qr_abc123&template=1234567890
  //   - Report: /reporting?qr=qr_abc123&id=5
  if (targetId) {
    if (qrType === 'survey_template') {
      url.searchParams.set('template', targetId);
    } else {
      url.searchParams.set('id', targetId);
    }
  }

  return url.toString();
}

// ══════════════════════════════════════════════════════════════════════════
// POST /api/qr-codes/generate
// ══════════════════════════════════════════════════════════════════════════
// Generates a new QR code for a survey or report
//
// Request Body (JSON):
//   {
//     "qrType": "survey" | "report" | "survey_template",
//     "targetId": number (optional - ID of survey/report),
//     "description": string (optional - label for this QR code),
//     "expiresAt": string (optional - ISO date when QR expires),
//     "userId": number (optional - ID of user creating the QR code)
//   }
//
// Response (JSON):
//   {
//     "success": true,
//     "qrCode": {
//       "qrCodeId": number,
//       "qrCodeKey": string,
//       "targetUrl": string,
//       "qrType": string,
//       "dataUrl": string (base64 encoded QR code image)
//     }
//   }
//
// Error Response:
//   { "error": "Error message", "details": "Additional info" }
// ══════════════════════════════════════════════════════════════════════════
export async function POST(request) {
  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Parse and Validate Request Body
    // ─────────────────────────────────────────────────────────────────────
    const body = await request.json();
    const {
      qrType,      // Type: 'survey', 'report', or 'survey_template'
      targetId,    // ID of the entity this QR code links to
      description, // Optional description for this QR code
      expiresAt,   // Optional expiration date (ISO string)
      userId       // ID of the user creating this QR code
    } = body;

    // Validate required field: qrType
    if (!qrType) {
      return NextResponse.json(
        { error: 'Missing required field: qrType' },
        { status: 400 }
      );
    }

    // Validate qrType is one of the allowed values
    const validQrTypes = ['survey', 'report', 'survey_template'];
    if (!validQrTypes.includes(qrType)) {
      return NextResponse.json(
        {
          error: 'Invalid qrType',
          details: `qrType must be one of: ${validQrTypes.join(', ')}`
        },
        { status: 400 }
      );
    }

    // ┌─────────────────────────────────────────────────────────────────────┐
    // │ 🔒 ACCESS CONTROL PLACEHOLDER - FOR FUTURE IMPLEMENTATION           │
    // ├─────────────────────────────────────────────────────────────────────┤
    // │ REQUIREMENT: Only Staff (access_rank >= 50) and Admin (access_rank │
    // │ >= 100) users should be able to generate QR codes per requirements │
    // │ 9f and 11.                                                          │
    // │                                                                      │
    // │ TO IMPLEMENT:                                                        │
    // │ 1. Get the authenticated user from the session/token                │
    // │    Example:                                                          │
    // │    const user = await getAuthenticatedUser(request);                │
    // │    if (!user) {                                                      │
    // │      return NextResponse.json(                                      │
    // │        { error: 'Authentication required' },                        │
    // │        { status: 401 }                                              │
    // │      );                                                              │
    // │    }                                                                 │
    // │                                                                      │
    // │ 2. Check user's access rank from database                           │
    // │    const userWithType = db.prepare(`                                │
    // │      SELECT u.*, ut.access_rank                                     │
    // │      FROM user u                                                    │
    // │      JOIN user_type ut ON u.user_type_id = ut.user_type_id         │
    // │      WHERE u.user_id = ?                                            │
    // │    `).get(user.user_id);                                            │
    // │                                                                      │
    // │ 3. Verify access rank is at least 50 (staff level)                 │
    // │    if (userWithType.access_rank < 50) {                             │
    // │      return NextResponse.json(                                      │
    // │        { error: 'Insufficient permissions',                         │
    // │          details: 'Staff or Admin access required to generate QR'  │
    // │        },                                                            │
    // │        { status: 403 }                                              │
    // │      );                                                              │
    // │    }                                                                 │
    // │                                                                      │
    // │ 4. Use authenticated user ID instead of request userId              │
    // │    const createdByUserId = user.user_id;                            │
    // └─────────────────────────────────────────────────────────────────────┘

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Generate Unique QR Code Key
    // ─────────────────────────────────────────────────────────────────────
    // Create a unique identifier for this QR code
    // If there's a collision (extremely rare), we'll get a database error
    // and can retry with a new key
    const qrCodeKey = generateQRCodeKey();

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Build Target URL
    // ─────────────────────────────────────────────────────────────────────
    // Construct the URL that the QR code will redirect to
    // Use environment variable for base URL in production, or derive from request
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
                    request.headers.get('origin') ||
                    'http://localhost:3000';

    const targetUrl = buildTargetUrl(qrType, targetId, qrCodeKey, baseUrl);

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Insert QR Code Record into Database
    // ─────────────────────────────────────────────────────────────────────
    // Store the QR code metadata in the qr_codes table
    const insertStmt = db.prepare(`
      INSERT INTO qr_codes (
        qr_code_key,
        qr_type,
        target_id,
        target_url,
        created_by_user_id,
        expires_at,
        is_active,
        description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      qrCodeKey,                    // Unique key for this QR code
      qrType,                       // Type: survey, report, or survey_template
      targetId || null,             // ID of the target entity (can be null for general survey)
      targetUrl,                    // Full URL the QR code redirects to
      userId || null,               // User who created this (null until auth is implemented)
      expiresAt || null,            // Optional expiration date
      1,                            // is_active = 1 (active by default)
      description || null           // Optional description
    );

    const qrCodeId = result.lastInsertRowid;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 5: Generate QR Code Image
    // ─────────────────────────────────────────────────────────────────────
    // Use the qrcode library to generate a QR code image
    // The image is returned as a data URL (base64 encoded PNG)
    // which can be directly used in an <img> tag or downloaded
    //
    // QR Code Options:
    //   - errorCorrectionLevel: 'H' = High (30% of data can be restored)
    //   - type: 'image/png' = PNG format
    //   - quality: 0.92 = High quality
    //   - margin: 1 = Quiet zone around QR code (modules)
    //   - color.dark: Black dots
    //   - color.light: White background
    //   - width: 400 = Size in pixels
    const qrCodeDataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',  // High error correction
      type: 'image/png',           // PNG format
      quality: 0.92,               // High quality
      margin: 1,                   // 1 module margin
      color: {
        dark: '#000000',           // Black QR code
        light: '#FFFFFF'           // White background
      },
      width: 400                   // 400px wide
    });

    // ─────────────────────────────────────────────────────────────────────
    // STEP 6: Return Success Response
    // ─────────────────────────────────────────────────────────────────────
    // Return the QR code data to the client
    // The dataUrl can be used directly in an <img src="..."> tag
    // or downloaded as a PNG file
    return NextResponse.json({
      success: true,
      qrCode: {
        qrCodeId: Number(qrCodeId),  // Database ID for this QR code
        qrCodeKey,                    // Unique key (used in URL)
        targetUrl,                    // The URL this QR code points to
        qrType,                       // Type of QR code
        targetId,                     // ID of target entity
        dataUrl: qrCodeDataUrl,       // Base64 encoded PNG image
        description,                  // Optional description
        expiresAt,                    // Optional expiration date
        createdAt: new Date().toISOString()  // When it was created
      }
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────────────────
    console.error('[QR Code Generate API] Error:', error);

    // Check for unique constraint violation (duplicate qr_code_key)
    // This is extremely rare but possible
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        {
          error: 'QR code key collision',
          details: 'Please try again. This is very rare.'
        },
        { status: 500 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'Failed to generate QR code',
        details: error.message
      },
      { status: 500 }
    );
  }
}
