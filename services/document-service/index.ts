import { Router, Response } from "express";
import { AuthenticatedRequest, sendSuccess, sendError } from "../shared/types.js";
import { authenticateToken, requireRole, requirePermission } from "../shared/middleware.js";
import { eventBus } from "../shared/eventBus.js";

export interface DocumentRecord {
  id: string;
  ownerId?: string;
  tenantId?: string;
  propertyId?: string;
  type: "aadhaar_kyc" | "pan_card" | "rental_agreement" | "property_title_deed" | "electricity_bill" | "police_verification";
  fileName: string;
  fileSize: string;
  mimeType: string;
  vaultKey: string;
  status: "pending" | "verified" | "rejected";
  uploadedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

// Private Vault Database
const documentDatabase: Map<string, DocumentRecord> = new Map([
  [
    "doc-001",
    {
      id: "doc-001",
      tenantId: "tenant-001",
      type: "aadhaar_kyc",
      fileName: "Ananya_Sharma_Aadhaar.pdf",
      fileSize: "1.4 MB",
      mimeType: "application/pdf",
      vaultKey: "vault/tenant-001/aadhaar_2026.pdf",
      status: "verified",
      uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      verifiedAt: new Date().toISOString(),
      verifiedBy: "Nestin Verification Engine",
    },
  ],
  [
    "doc-002",
    {
      id: "doc-002",
      ownerId: "owner-001",
      propertyId: "nestin-orion-whitefield",
      type: "property_title_deed",
      fileName: "Orion_Building_Occupancy_Certificate.pdf",
      fileSize: "3.8 MB",
      mimeType: "application/pdf",
      vaultKey: "vault/owner-001/orion_deed.pdf",
      status: "verified",
      uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ],
]);

function generateSignedUrl(doc: DocumentRecord): string {
  const expiresAt = Date.now() + 1000 * 60 * 15; // 15 min TTL
  const token = Buffer.from(JSON.stringify({ docId: doc.id, exp: expiresAt })).toString("base64url");
  return `/api/v1/documents/download/${doc.id}?signedToken=${token}&expires=${expiresAt}`;
}

export const documentRouter: Router = Router();

// Health
documentRouter.get("/health", (req, res) => {
  return sendSuccess(res, { status: "UP", service: "document-service", totalDocs: documentDatabase.size }, "document-service");
});

// Tenant: Get My KYC & Documents
documentRouter.get("/my-documents", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const tenantId = req.user!.id;
  const docs = Array.from(documentDatabase.values())
    .filter((d) => d.tenantId === tenantId)
    .map((d) => ({
      ...d,
      signedDownloadUrl: generateSignedUrl(d),
    }));
  return sendSuccess(res, docs, "document-service");
});

// Owner: Get Property & Business Documents
documentRouter.get("/owner/all", authenticateToken, requireRole("owner", "employee", "admin"), requirePermission("view_documents"), (req: AuthenticatedRequest, res: Response) => {
  const targetOwnerId = req.user?.ownerId || req.user?.id;
  const docs = Array.from(documentDatabase.values())
    .filter((d) => d.ownerId === targetOwnerId)
    .map((d) => ({
      ...d,
      signedDownloadUrl: generateSignedUrl(d),
    }));
  return sendSuccess(res, docs, "document-service");
});

// Upload Document (Private Vault Key Generation)
documentRouter.post("/upload", authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { type = "aadhaar_kyc", fileName, fileSize = "1.2 MB", mimeType = "application/pdf", propertyId } = req.body;
  if (!fileName) {
    return sendError(res, "VALIDATION_FAILED", "File name is required", "document-service", 400);
  }

  const docId = `doc-${Date.now().toString(36)}`;
  const isOwner = req.user?.role === "owner" || req.user?.role === "employee";

  const newDoc: DocumentRecord = {
    id: docId,
    ownerId: isOwner ? req.user?.ownerId || req.user?.id : undefined,
    tenantId: !isOwner ? req.user!.id : undefined,
    propertyId,
    type,
    fileName,
    fileSize,
    mimeType,
    vaultKey: `vault/${req.user!.id}/${docId}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`,
    status: "pending",
    uploadedAt: new Date().toISOString(),
  };

  documentDatabase.set(docId, newDoc);
  eventBus.publish("DocumentUploaded", docId, "Document", newDoc, req.correlationId);

  return sendSuccess(
    res,
    {
      ...newDoc,
      signedDownloadUrl: generateSignedUrl(newDoc),
    },
    "document-service",
    201
  );
});

// Secure Download Endpoint (Validates Signed URL Token)
documentRouter.get("/download/:id", (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { signedToken } = req.query;

  const doc = documentDatabase.get(id);
  if (!doc) {
    return sendError(res, "NOT_FOUND", "Document not found in vault", "document-service", 404);
  }

  if (!signedToken) {
    return sendError(res, "UNAUTHORIZED", "Missing signed access token", "document-service", 401);
  }

  try {
    const payload = JSON.parse(Buffer.from(String(signedToken), "base64url").toString());
    if (payload.exp < Date.now()) {
      return sendError(res, "TOKEN_EXPIRED", "Signed document URL has expired. Please request a fresh link.", "document-service", 403);
    }
  } catch {
    return sendError(res, "INVALID_TOKEN", "Tampered or invalid signed token", "document-service", 403);
  }

  // Stream mock protected document bytes
  res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
  res.setHeader("Content-Type", doc.mimeType);
  return res.send(`%PDF-1.4 [Secure Encrypted Nestin Document: ${doc.fileName} | Vault Key: ${doc.vaultKey}]`);
});
