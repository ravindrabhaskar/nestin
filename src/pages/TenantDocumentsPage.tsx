import React, { useState, useRef } from 'react';
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Trash2, Eye, ShieldCheck, X, Plus } from 'lucide-react';
import { TenantAccountLayout } from '../components/profile/TenantAccountLayout';
import { TenantDocument } from '../types';
import { ApiClient, uploadFile } from '../lib/apiClient';
import { useApiResource } from '../hooks/useApiResource';
import { useAuth } from '../context/AuthContext';
import { AgreementCard } from '../components/resident/AgreementCard';

export const TenantDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { data: documents, setData: setDocuments } = useApiResource<TenantDocument[]>(
    () => ApiClient.tenant.documents(),
    [],
    {
      enabled: !!user,
      key: user?.id,
      label: 'Could not load your documents',
    }
  );

  const [selectedDoc, setSelectedDoc] = useState<TenantDocument | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newDocType, setNewDocType] = useState<TenantDocument['type']>('govt_id');
  const [newDocName, setNewDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const getStatusBadge = (status: TenantDocument['status']) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#a3e635]/25 text-[#3d6800] border border-[#a3e635]/40 flex items-center gap-1 font-heading">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified</span>
          </span>
        );
      case 'in_review':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 border border-amber-500/30 flex items-center gap-1 font-heading">
            <Clock className="w-3 h-3" />
            <span>In Review</span>
          </span>
        );
      case 'pending_upload':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 font-heading">
            <AlertCircle className="w-3 h-3" />
            <span>Pending Upload</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200 flex items-center gap-1 font-heading">
            <AlertCircle className="w-3 h-3" />
            <span>Rejected</span>
          </span>
        );
    }
  };

  const handleDelete = async (id: string) => {
    const previous = documents;
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setSelectedDoc(null);
    try {
      await ApiClient.tenant.deleteDocument(id);
      showToast('Document deleted.');
    } catch (err) {
      setDocuments(previous);
      showToast(err instanceof Error ? err.message : 'Could not delete the document.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Files must be smaller than 10 MB.');
      return;
    }

    // The file is stored privately (local disk or S3) and only the resident, the owner they booked
    // with, and platform admins can open it.
    try {
      showToast('Uploading…');
      const uploaded = await uploadFile(file, 'document');
      const saved = await ApiClient.tenant.addDocument({
        name: newDocName || file.name,
        fileName: file.name,
        type: newDocType,
        fileSize: uploaded.sizeLabel,
        fileUrl: uploaded.url,
      });
      setDocuments((prev) => [saved, ...prev]);
      setUploadModalOpen(false);
      setNewDocName('');
      showToast('Document uploaded for verification.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  return (
    <TenantAccountLayout
      title="Tenant Documents & KYC"
      subtitle="Upload and manage government identity proofs, college/office ID cards, and rental agreements."
      activeNav="/documents"
      headerAction={
        <button
          type="button"
          onClick={() => setUploadModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs font-heading"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Upload Document</span>
        </button>
      }
    >
      <div className="space-y-6">
        <AgreementCard onNotice={(m) => showToast?.(m)} />
        {/* TRUST BANNER */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-[#a3e635]/20 text-slate-950">
              <ShieldCheck className="w-6 h-6 text-[#5fa000]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-extrabold text-sm text-slate-900 font-heading">
                100% Encrypted & Bank-Grade Security
              </h3>
              <p className="text-xs text-slate-500 max-w-xl">
                Your ID proofs are stored securely with 256-bit AES encryption. Documents are only shared with the
                verified property manager when your lease is active.
              </p>
            </div>
          </div>

          {toastMsg && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#a3e635]/20 border border-[#a3e635]/50 text-[#3d6800] text-xs font-extrabold font-heading">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{toastMsg}</span>
            </div>
          )}
        </div>

        {/* DOCUMENTS LIST */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-slate-100 text-slate-700 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 font-heading">{doc.name}</span>
                      {getStatusBadge(doc.status)}
                    </div>
                    <p className="text-xs text-slate-500">
                      Uploaded on {doc.uploadedAt} {doc.fileSize && `• ${doc.fileSize}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-heading"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    className="px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-heading"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UPLOAD MODAL */}
      {uploadModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black font-heading text-slate-900">Upload New Document</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Document Type</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  <option value="govt_id">Government ID (Aadhaar / Passport / Driving License)</option>
                  <option value="address_proof">Address Proof (Voter ID / Utility Bill)</option>
                  <option value="college_or_employee_id">College ID / Corporate Office Badge</option>
                  <option value="rent_agreement">Rental Agreement / NOC</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-700">Document Title / Note</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="e.g. Aadhaar Card (Front & Back)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50">
                <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs text-slate-600 font-medium">
                  Select a PDF, PNG, or JPG file from your device
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-bold cursor-pointer font-heading shadow-xs"
                >
                  Browse Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {selectedDoc && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
        >
          <div className="bg-white rounded-3xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black font-heading text-slate-900">{selectedDoc.name}</h3>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
              <FileText className="w-12 h-12 text-[#5fa000] mx-auto" />
              <div className="text-xs font-bold text-slate-800 font-heading">{selectedDoc.name}</div>
              <div className="text-[11px] text-slate-500">Status: {selectedDoc.status.toUpperCase()}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-[#a3e635] text-xs font-bold cursor-pointer font-heading"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantAccountLayout>
  );
};
