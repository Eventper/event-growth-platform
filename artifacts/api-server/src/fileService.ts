import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import PDFDocument from 'pdfkit';
import { storage } from './storage';
import { notificationService } from './notificationService';

// Brand palette (matches the platform design system: burgundy / gold / ivory).
const BURGUNDY = '#330311';
const GOLD = '#C9A961';
const DARK_GREY = '#333333';
const MID_GREY = '#666666';
const LIGHT_GREY = '#999999';

// Normalise the loosely-typed timeline payload into a consistent row shape so
// the renderer can handle an array of items, or an object wrapping them under
// any of the common keys (items / milestones / tasks / events).
interface TimelineRow {
  time: string;
  title: string;
  description: string;
  status: string;
  owner: string;
}

function normalizeTimeline(timelineData: any): { title: string; rows: TimelineRow[] } {
  const wrapper = Array.isArray(timelineData) ? null : timelineData;
  const rawItems = Array.isArray(timelineData)
    ? timelineData
    : (wrapper?.items || wrapper?.milestones || wrapper?.tasks || wrapper?.events || []);
  const title =
    (wrapper && (wrapper.eventName || wrapper.title || wrapper.name)) || 'Event Timeline';

  const str = (v: any) => (v == null ? '' : String(v)).trim();
  const rows: TimelineRow[] = (Array.isArray(rawItems) ? rawItems : [])
    .map((it: any): TimelineRow | null => {
      if (it == null) return null;
      if (typeof it === 'string') {
        return { time: '', title: it.trim(), description: '', status: '', owner: '' };
      }
      return {
        time: str(it.time ?? it.date ?? it.when ?? it.timestamp),
        title: str(it.title ?? it.name ?? it.task ?? it.milestone ?? it.label) || 'Untitled',
        description: str(it.description ?? it.details ?? it.notes ?? it.desc),
        status: str(it.status ?? it.state),
        owner: str(it.owner ?? it.responsible ?? it.assignedTo ?? it.assigned_to),
      };
    })
    .filter((r): r is TimelineRow => r !== null);

  return { title: String(title), rows };
}

// Render a branded A4 timeline PDF to disk using pdfkit.
function renderTimelinePdf(
  eventName: string,
  rows: TimelineRow[],
  outPath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
      });
      const stream = createWriteStream(outPath);
      doc.pipe(stream);

      const left = 50;
      const right = 545;
      const contentWidth = right - left;

      // Header band
      doc.save();
      doc.roundedRect(left, 42, 70, 70, 8).fill(BURGUNDY);
      doc.fillColor(GOLD).font('Helvetica-Bold').fontSize(26).text('EP', left, 64, { width: 70, align: 'center' });
      doc.restore();

      doc.fillColor(DARK_GREY).font('Helvetica-Bold').fontSize(11)
        .text('Event Perfekt Global Ltd', 300, 46, { width: 245, align: 'right' });
      doc.font('Helvetica').fontSize(9).fillColor(MID_GREY)
        .text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), 300, 62, { width: 245, align: 'right' });

      doc.moveTo(left, 124).lineTo(right, 124).lineWidth(2).strokeColor(BURGUNDY).stroke();

      // Title block
      doc.y = 150;
      doc.fillColor(BURGUNDY).font('Helvetica-Bold').fontSize(22).text('EVENT TIMELINE', left, doc.y, { align: 'center', width: contentWidth });
      doc.moveDown(0.3);
      doc.fillColor(DARK_GREY).font('Helvetica-Bold').fontSize(14).text(eventName, { align: 'center', width: contentWidth });
      doc.moveDown(1.2);

      if (rows.length === 0) {
        doc.font('Helvetica-Oblique').fontSize(11).fillColor(MID_GREY)
          .text('No timeline entries were provided for this event.', { align: 'center', width: contentWidth });
      }

      // Timeline rows
      for (const row of rows) {
        // Page break if low on space
        if (doc.y > doc.page.height - 140) doc.addPage();

        const rowTop = doc.y;
        // Gold tick marker
        doc.save();
        doc.circle(left + 4, rowTop + 6, 4).fill(GOLD);
        doc.restore();

        const textX = left + 20;
        const textWidth = contentWidth - 20;

        // Time + title line
        if (row.time) {
          doc.font('Helvetica-Bold').fontSize(10).fillColor(BURGUNDY).text(row.time, textX, rowTop, { width: textWidth, continued: false });
        }
        doc.font('Helvetica-Bold').fontSize(12).fillColor(DARK_GREY).text(row.title, textX, doc.y, { width: textWidth });

        // Status + owner meta
        const meta = [row.status && `Status: ${row.status}`, row.owner && `Owner: ${row.owner}`].filter(Boolean).join('   •   ');
        if (meta) {
          doc.font('Helvetica').fontSize(9).fillColor(LIGHT_GREY).text(meta, textX, doc.y + 2, { width: textWidth });
        }

        // Description
        if (row.description) {
          doc.moveDown(0.2);
          doc.font('Helvetica').fontSize(10).fillColor(MID_GREY).text(row.description, textX, doc.y, { width: textWidth, lineGap: 2 });
        }

        doc.moveDown(0.9);
      }

      // Footer page numbers
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        const y = doc.page.height - 40;
        doc.save();
        doc.fillColor(LIGHT_GREY).font('Helvetica').fontSize(8)
          .text('Event Perfekt Global Ltd — Event Timeline', left, y, { width: 250, align: 'left', lineBreak: false });
        doc.text(`Page ${i + 1} of ${range.count}`, 300, y, { width: 245, align: 'right', lineBreak: false });
        doc.restore();
      }

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    } catch (e) {
      reject(e);
    }
  });
}

// File categories for organization
export enum FileCategory {
  VENUE_PLANS = 'venue_plans',
  BRAND_ASSETS = 'brand_assets',
  INVOICES = 'invoices',
  CONTRACTS = 'contracts',
  PHOTOS = 'photos',
  DOCUMENTS = 'documents',
  VENDOR_FILES = 'vendor_files',
  TIMELINE_EXPORTS = 'timeline_exports'
}

export interface EventFile {
  id: string;
  eventId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  uploadedBy: string;
  uploadedAt: Date;
  isPublic: boolean;
  description?: string;
  tags?: string[];
}

// Configure multer for secure file uploads
const createMulterConfig = (eventId: string) => {
  const uploadPath = path.join(process.cwd(), 'uploads', 'events', eventId);
  
  return multer({
    storage: multer.diskStorage({
      destination: async (req, file, cb) => {
        try {
          await fs.mkdir(uploadPath, { recursive: true });
          cb(null, uploadPath);
        } catch (error) {
          cb(error as Error, '');
        }
      },
      filename: (req, file, cb) => {
        const uniqueName = `${randomUUID()}-${file.originalname}`;
        cb(null, uniqueName);
      }
    }),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
      files: 10 // Max 10 files per upload
    },
    fileFilter: (req, file, cb) => {
      // Allow common file types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('File type not allowed') as any, false);
      }
    }
  });
};

export class FileService {
  private files = new Map<string, EventFile[]>();

  // Upload files for an event
  async uploadFiles(
    eventId: string, 
    files: Express.Multer.File[], 
    uploadedBy: string,
    category: FileCategory = FileCategory.DOCUMENTS,
    isPublic: boolean = false
  ): Promise<EventFile[]> {
    const eventFiles: EventFile[] = [];

    for (const file of files) {
      const eventFile: EventFile = {
        id: randomUUID(),
        eventId,
        fileName: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        category,
        uploadedBy,
        uploadedAt: new Date(),
        isPublic
      };

      eventFiles.push(eventFile);

      // Store file metadata
      if (!this.files.has(eventId)) {
        this.files.set(eventId, []);
      }
      this.files.get(eventId)!.push(eventFile);

      // Send notification about file upload
      await notificationService.notifyFileUpload(eventId, file.originalname, uploadedBy);
    }

    return eventFiles;
  }

  // Get files for an event (with permission filtering)
  async getEventFiles(eventId: string, userId: string, userRole: string): Promise<EventFile[]> {
    const files = this.files.get(eventId) || [];
    
    // Filter based on user permissions
    if (userRole === 'client') {
      // Clients can see public files and files they uploaded
      return files.filter(file => file.isPublic || file.uploadedBy === userId);
    }
    
    // Planners and admins can see all files
    return files;
  }

  // Get files by category
  async getFilesByCategory(eventId: string, category: FileCategory): Promise<EventFile[]> {
    const files = this.files.get(eventId) || [];
    return files.filter(file => file.category === category);
  }

  // Delete a file
  async deleteFile(fileId: string, userId: string, userRole: string): Promise<boolean> {
    for (const [eventId, files] of this.files.entries()) {
      const fileIndex = files.findIndex(f => f.id === fileId);
      if (fileIndex !== -1) {
        const file = files[fileIndex];
        
        // Check permissions
        if (userRole !== 'admin' && userRole !== 'planner' && file.uploadedBy !== userId) {
          return false; // No permission to delete
        }

        try {
          // Delete physical file
          await fs.unlink(file.filePath);
          
          // Remove from storage
          files.splice(fileIndex, 1);
          
          return true;
        } catch (error) {
          console.error('Error deleting file:', error);
          return false;
        }
      }
    }
    return false;
  }

  // Get file by ID
  async getFile(fileId: string): Promise<EventFile | null> {
    for (const files of this.files.values()) {
      const file = files.find(f => f.id === fileId);
      if (file) return file;
    }
    return null;
  }

  // Generate timeline PDF export
  async generateTimelinePDF(eventId: string, timelineData: any): Promise<EventFile> {
    const fileName = `timeline-${eventId}-${Date.now()}.pdf`;
    const filePath = path.join(process.cwd(), 'uploads', 'events', eventId, fileName);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // Render a real, branded PDF (not a JSON placeholder) via pdfkit.
    const { title, rows } = normalizeTimeline(timelineData);
    await renderTimelinePdf(title, rows, filePath);

    const { size: fileSize } = await fs.stat(filePath);

    const eventFile: EventFile = {
      id: randomUUID(),
      eventId,
      fileName,
      originalName: `Event Timeline - ${new Date().toLocaleDateString()}.pdf`,
      filePath,
      fileSize,
      mimeType: 'application/pdf',
      category: FileCategory.TIMELINE_EXPORTS,
      uploadedBy: 'system',
      uploadedAt: new Date(),
      isPublic: true
    };

    // Store file metadata
    if (!this.files.has(eventId)) {
      this.files.set(eventId, []);
    }
    this.files.get(eventId)!.push(eventFile);

    return eventFile;
  }

  // Get multer middleware for file uploads
  getUploadMiddleware(eventId: string) {
    return createMulterConfig(eventId);
  }
}

export const fileService = new FileService();