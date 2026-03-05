// ═══════════════════════════════════════════════════════════════════════════
// API ROUTE: Download QR Code as Image
// ═══════════════════════════════════════════════════════════════════════════
// Purpose: Generates and downloads a QR code image file (PNG format)
// Requirements: Implements downloadable QR code requirement
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { db, initializeDatabase } from '@/lib/db';
import QRCode from 'qrcode';
import { requireAccess } from '@/lib/auth/server-auth';

// ──────────────────────────────────────────────────────────────────────────
// INITIALIZE DATABASE
// ──────────────────────────────────────────────────────────────────────────
// Ensure all database tables exist before processing any requests
initializeDatabase();

// ══════════════════════════════════════════════════════════════════════════
// GET /api/qr-codes/download?qrCodeKey=xxx&format=png&size=400
// ══════════════════════════════════════════════════════════════════════════
// Downloads a QR code image file for a given QR code key
//
// This endpoint:
// 1. Looks up the QR code by its key in the database
// 2. Regenerates the QR code image with specified parameters
// 3. Returns the image as a downloadable file with proper headers
//
// Query Parameters:
//   - qrCodeKey: string (required - the QR code identifier)
//   - format: string (optional - 'png' or 'svg', default: 'png')
//   - size: number (optional - width in pixels, default: 400)
//   - download: boolean (optional - if true, triggers browser download)
//
// Response:
//   - Content-Type: image/png or image/svg+xml
//   - Content-Disposition: attachment (if download=true)
//   - Binary image data
//
// Error Response:
//   { "error": "Error message", "details": "Additional info" }
//
// ┌─────────────────────────────────────────────────────────────────────┐
// │ 🔒 ACCESS CONTROL PLACEHOLDER - FOR FUTURE IMPLEMENTATION           │
// ├─────────────────────────────────────────────────────────────────────┤
// │ CONSIDERATION: Should QR code downloads be restricted?              │
// │                                                                      │
// │ Option 1: Public access (current implementation)                    │
// │   - Anyone with the QR code key can download the image              │
// │   - Good for sharing QR codes publicly                              │
// │                                                                      │
// │ Option 2: Staff/Admin only                                          │
// │   - Only authenticated staff/admin can download                     │
// │   - Better security but less flexible                               │
// │                                                                      │
// │ TO IMPLEMENT RESTRICTED ACCESS:                                     │
// │   const user = await getAuthenticatedUser(request);                 │
// │   if (!user || user.access_rank < 50) {                             │
// │     return NextResponse.json(                                       │
// │       { error: 'Staff access required to download QR codes' },     │
// │       { status: 403 }                                               │
// │     );                                                               │
// │   }                                                                  │
// │                                                                      │
// │ RECOMMENDATION: Keep public for now, add option to make specific   │
// │ QR codes private in the future via a 'is_public' flag in database. │
// └─────────────────────────────────────────────────────────────────────┘
// ══════════════════════════════════════════════════════════════════════════
export async function GET(request) {
  try {
    const auth = requireAccess(request, db, { minAccessRank: 50, requireCsrf: false });
    if (auth.error) return auth.error;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Parse Query Parameters
    // ─────────────────────────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);

    const qrCodeKey = searchParams.get('qrCodeKey');
    const format = searchParams.get('format') || 'png';  // png or svg
    const size = parseInt(searchParams.get('size') || '400', 10);
    const shouldDownload = searchParams.get('download') === 'true';

    // Validate required parameter
    if (!qrCodeKey) {
      return NextResponse.json(
        { error: 'Missing required parameter: qrCodeKey' },
        { status: 400 }
      );
    }

    // Validate format parameter
    if (!['png', 'svg'].includes(format)) {
      return NextResponse.json(
        {
          error: 'Invalid format parameter',
          details: 'Format must be either "png" or "svg"'
        },
        { status: 400 }
      );
    }

    // Validate size parameter (reasonable limits)
    if (size < 100 || size > 2000) {
      return NextResponse.json(
        {
          error: 'Invalid size parameter',
          details: 'Size must be between 100 and 2000 pixels'
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Look Up QR Code in Database
    // ─────────────────────────────────────────────────────────────────────
    const qrCode = db.prepare(`
      SELECT
        qr_code_id,
        qr_code_key,
        qr_type,
        target_url,
        description,
        is_active
      FROM qr_codes
      WHERE qr_code_key = ?
    `).get(qrCodeKey);

    // QR code not found
    if (!qrCode) {
      return NextResponse.json(
        {
          error: 'QR code not found',
          details: `No QR code exists with key: ${qrCodeKey}`
        },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 3: Generate QR Code Image
    // ─────────────────────────────────────────────────────────────────────
    // Generate the QR code in the requested format
    // The QR code encodes the target_url from the database

    let imageBuffer;
    let contentType;
    let fileExtension;

    if (format === 'png') {
      // ─────────────────────────────────────────────────────────────────
      // PNG Format
      // ─────────────────────────────────────────────────────────────────
      // Generate PNG image as a buffer
      // Options explanation:
      //   - errorCorrectionLevel: 'H' = High (30% damage tolerance)
      //   - type: 'png' = PNG format
      //   - quality: 0.95 = Very high quality
      //   - margin: 2 = 2 module quiet zone around QR code
      //   - width: User-specified size in pixels
      //   - color.dark: Black modules (dots)
      //   - color.light: Transparent background
      imageBuffer = await QRCode.toBuffer(qrCode.target_url, {
        errorCorrectionLevel: 'H',
        type: 'png',
        quality: 0.95,
        margin: 2,
        width: size,
        color: {
          dark: '#000000',    // Black QR code
          light: '#FFFFFF'    // White background
        }
      });

      contentType = 'image/png';
      fileExtension = 'png';

    } else if (format === 'svg') {
      // ─────────────────────────────────────────────────────────────────
      // SVG Format
      // ─────────────────────────────────────────────────────────────────
      // Generate SVG (Scalable Vector Graphics)
      // SVG is resolution-independent and perfect for print materials
      // Options explanation:
      //   - errorCorrectionLevel: 'H' = High error correction
      //   - type: 'svg' = SVG format
      //   - margin: 2 = 2 module margin
      //   - color.dark: Black modules
      //   - color.light: White background
      const svgString = await QRCode.toString(qrCode.target_url, {
        errorCorrectionLevel: 'H',
        type: 'svg',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      imageBuffer = Buffer.from(svgString, 'utf8');
      contentType = 'image/svg+xml';
      fileExtension = 'svg';
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 4: Generate Filename
    // ─────────────────────────────────────────────────────────────────────
    // Create a descriptive filename for the download
    // Format: qrcode_<type>_<key>_<timestamp>.<ext>
    // Example: qrcode_survey_qr_abc123_20240315.png
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const sanitizedDesc = qrCode.description
      ? qrCode.description.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30)
      : qrCode.qr_type;

    const filename = `qrcode_${sanitizedDesc}_${qrCodeKey}_${timestamp}.${fileExtension}`;

    // ─────────────────────────────────────────────────────────────────────
    // STEP 5: Set Response Headers
    // ─────────────────────────────────────────────────────────────────────
    const headers = new Headers();

    // Set content type
    headers.set('Content-Type', contentType);

    // Set content length
    headers.set('Content-Length', imageBuffer.length.toString());

    // Set cache control (cache for 1 hour)
    // QR codes don't change once generated, so caching is safe
    headers.set('Cache-Control', 'public, max-age=3600');

    // Set content disposition
    // If download=true, browser will download the file
    // Otherwise, browser will try to display it inline
    if (shouldDownload) {
      headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      headers.set('Content-Disposition', `inline; filename="${filename}"`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 6: Return Image Response
    // ─────────────────────────────────────────────────────────────────────
    return new NextResponse(imageBuffer, {
      status: 200,
      headers
    });

  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────
    // ERROR HANDLING
    // ─────────────────────────────────────────────────────────────────────
    console.error('[QR Code Download API] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to download QR code',
        details: error.message
      },
      { status: 500 }
    );
  }
}
