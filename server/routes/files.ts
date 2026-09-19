import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { storage, makeKey, isPublicKey, storageDriverName } from '../lib/storage.js';
import { files, users, documents, type FileRecord } from '../db/repositories.js';
import { authenticate, currentUser, type AuthedRequest } from '../middleware/auth.js';
import { sendOk, wrap } from '../middleware/common.js';
import { badRequest, notFound, forbidden } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import { events } from '../lib/events.js';

/**
 * Uploads & file access.
 *   POST /files            multipart { file, purpose: avatar|property|document }
 *   GET  /files/:key       private objects (uploader, their owner tenancy, or admin)
 * Public objects (avatars, listing photos) are served directly from /uploads/<key> (local) or the CDN.
 */

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
const DOC_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxFileBytes, files: 1 },
});

export const filesRouter = Router();

filesRouter.post(
  '/',
  authenticate,
  upload.single('file'),
  wrap(async (req, res) => {
    const user = currentUser(req);
    const file = (req as AuthedRequest & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("No file was uploaded (send it as multipart field 'file').");
    const purpose = String(req.body?.purpose || 'document') as FileRecord['purpose'];
    if (!['avatar', 'property', 'document'].includes(purpose))
      throw badRequest('purpose must be avatar, property or document');
    if (purpose === 'property' && !(user.role === 'owner' || user.role === 'employee' || user.role === 'super_admin'))
      throw forbidden('Only owners and staff can upload listing photos');

    const allowed = purpose === 'document' ? DOC_TYPES : IMAGE_TYPES;
    if (!allowed.has(file.mimetype))
      throw badRequest(`Unsupported file type ${file.mimetype}. Allowed: ${[...allowed].join(', ')}`);
    if (purpose !== 'document' && file.size > 6 * 1024 * 1024) throw badRequest('Images must be smaller than 6 MB');

    const isPublic = purpose !== 'document';
    const key = makeKey(purpose, file.originalname, isPublic);
    const stored = await storage.put(key, file.buffer, file.mimetype, isPublic);
    const record: FileRecord = {
      id: newId('file'),
      key,
      uploaderId: user.id,
      ownerId: user.ownerId || undefined,
      purpose,
      isPublic,
      fileName: file.originalname.slice(0, 200),
      contentType: file.mimetype,
      size: file.size,
      url: stored.url,
      createdAt: new Date().toISOString(),
    };
    files.insert(record);
    events.publish(
      'FileUploaded',
      'File',
      record.id,
      { purpose, size: file.size, contentType: file.mimetype, driver: storageDriverName },
      { actorId: user.id, actorRole: user.role, ownerId: user.ownerId || undefined }
    );
    sendOk(
      res,
      {
        id: record.id,
        key: record.key,
        url: record.url,
        fileName: record.fileName,
        contentType: record.contentType,
        size: record.size,
        sizeLabel: `${(record.size / (1024 * 1024)).toFixed(1)} MB`,
      },
      201
    );
  })
);

/** Private file access: uploader, the owner tenancy the uploader belongs to, the owner of a document's tenant booking, or admin. */
filesRouter.get(
  '/:key(*)',
  authenticate,
  wrap(async (req, res) => {
    const user = currentUser(req);
    const key = decodeURIComponent(req.params.key);
    const record = files.findOne({ key });
    if (!record) throw notFound('File');
    const allowed =
      user.role === 'super_admin' ||
      record.uploaderId === user.id ||
      (record.ownerId && record.ownerId === user.ownerId) ||
      documentSharedWithOwner(record, user.ownerId);
    if (!allowed) throw forbidden('You do not have access to this file');

    if (storage.presign && !isPublicKey(key)) {
      res.redirect(302, await storage.presign(key, 300));
      return;
    }
    const obj = await storage.get(key);
    if (!obj) throw notFound('File');
    res.setHeader('Content-Type', obj.contentType);
    res.setHeader('Content-Disposition', `inline; filename="${record.fileName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(obj.body);
  })
);

/** A tenant's KYC document is visible to the owner whose property the tenant has booked. */
function documentSharedWithOwner(record: FileRecord, ownerId: string | null): boolean {
  if (!ownerId || record.purpose !== 'document') return false;
  const uploader = users.findById(record.uploaderId);
  if (!uploader || uploader.role !== 'tenant') return false;
  return (
    documents.list({ tenant_id: uploader.id }).some((d) => d.fileUrl === record.url && d.ownerId === ownerId) || false
  );
}
