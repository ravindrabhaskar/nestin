import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  Copy,
  Eye,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { OwnerPropertyListing, PropertyListingStatus } from '../../types/property';
import { usePropertyListing } from '../../context/PropertyListingContext';

interface OwnerPropertiesInventoryViewProps {
  onAddProperty: () => void;
  onEditProperty: (property: OwnerPropertyListing) => void;
  onPreviewProperty: (property: OwnerPropertyListing) => void;
  showToast: (msg: string) => void;
}

export const OwnerPropertiesInventoryView: React.FC<OwnerPropertiesInventoryViewProps> = ({
  onAddProperty,
  onEditProperty,
  onPreviewProperty,
  showToast,
}) => {
  const navigate = useNavigate();
  const { ownerProperties, deleteProperty, duplicateProperty, submitForVerification, calculateCompleteness } =
    usePropertyListing();

  const [activeStatusTab, setActiveStatusTab] = useState<'all' | PropertyListingStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Status counts
  const counts = {
    all: ownerProperties.length,
    draft: ownerProperties.filter((p) => p.status === 'draft').length,
    pending_approval: ownerProperties.filter((p) => p.status === 'pending_approval').length,
    published: ownerProperties.filter((p) => p.status === 'published').length,
    rejected: ownerProperties.filter((p) => p.status === 'rejected').length,
    archived: ownerProperties.filter((p) => p.status === 'archived').length,
  };

  // Filtered properties
  const filteredProperties = ownerProperties.filter((p) => {
    if (activeStatusTab !== 'all' && p.status !== activeStatusTab) return false;
    if (selectedType !== 'all' && p.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchLoc = p.location.city.toLowerCase().includes(q) || p.location.area.toLowerCase().includes(q);
      if (!matchName && !matchLoc) return false;
    }
    return true;
  });

  const getStatusBadge = (status: PropertyListingStatus) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#ecfccb] text-[#3f6212] rounded-full text-xs font-black uppercase tracking-wider font-heading border border-[#bef264]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#65a30d]" />
            Live on Find PG
          </span>
        );
      case 'pending_approval':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-black uppercase tracking-wider font-heading border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            Under Review
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-black uppercase tracking-wider font-heading border border-slate-200">
            Draft
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-800 rounded-full text-xs font-black uppercase tracking-wider font-heading border border-rose-200">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Changes Required
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-200 text-slate-600 rounded-full text-xs font-black uppercase tracking-wider font-heading">
            Archived
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#a3e635]/15 text-[#a3e635] text-[11px] font-black uppercase tracking-wider font-heading">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One Property → One Complete Profile</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white font-heading">
            Property Listings & Inventory Master
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-medium">
            Create, verify, and manage your property profiles with accurate room sharing plans, 360° photo tours,
            verified caretaker KYC, and automated occupancy tracking.
          </p>
        </div>

        <button
          type="button"
          onClick={onAddProperty}
          className="px-6 py-3 bg-[#a3e635] hover:bg-[#92d428] text-slate-950 font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 font-heading"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Add New Property</span>
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Properties', count: counts.all },
            { id: 'published', label: 'Live on Find PG', count: counts.published },
            { id: 'pending_approval', label: 'Under Review', count: counts.pending_approval },
            { id: 'draft', label: 'Drafts', count: counts.draft },
            { id: 'rejected', label: 'Changes Required', count: counts.rejected },
            { id: 'archived', label: 'Archived', count: counts.archived },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveStatusTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeStatusTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeStatusTab === tab.id ? 'bg-[#a3e635] text-slate-950' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by property name, area, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              aria-label="Filter by Property Types"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Property Types</option>
              <option value="Co-living">Co-living</option>
              <option value="PG">PG</option>
              <option value="Hostel">Hostel</option>
              <option value="Student Housing">Student Housing</option>
              <option value="Working Professionals">Working Professionals</option>
            </select>
          </div>
        </div>
      </div>

      {/* Property Cards List */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 font-heading">No Properties Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try adjusting your search criteria or clear status filters.'
                : 'Get started by creating your first complete property profile with accurate room plans and images.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddProperty}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer font-heading"
          >
            <Plus className="w-4 h-4 text-[#a3e635]" />
            <span>Create Property Listing</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredProperties.map((property) => {
            const completeness = calculateCompleteness(property);
            const startingPrice = Math.min(...property.rooms.map((r) => r.monthlyRent), 99999);
            const totalOccupiedBeds = property.rooms.reduce((acc, r) => acc + r.occupiedBedsCount, 0);
            const totalAvailableBeds = property.rooms.reduce((acc, r) => acc + r.availableBedsCount, 0);
            const totalBeds = totalOccupiedBeds + totalAvailableBeds || property.details.totalBeds;
            const occupancyPct = totalBeds > 0 ? Math.round((totalOccupiedBeds / totalBeds) * 100) : 0;

            return (
              <div
                key={property.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-4"
              >
                {/* Rejection Alert if rejected */}
                {property.status === 'rejected' && (
                  <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-black text-rose-900 uppercase tracking-wide font-heading">
                          Verification Feedback
                        </div>
                        <div className="text-xs text-rose-700 font-medium">
                          {property.rejectionReason ||
                            'Please update the missing details and re-submit your property for verification.'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEditProperty(property)}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shrink-0 cursor-pointer"
                    >
                      Fix & Resubmit
                    </button>
                  </div>
                )}

                <div className="flex flex-col lg:flex-row gap-5">
                  {/* Property Image & Quick Badges */}
                  <div className="relative w-full lg:w-64 h-48 lg:h-auto rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={
                        property.coverImage ||
                        property.gallery[0]?.url ||
                        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'
                      }
                      alt={property.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5">{getStatusBadge(property.status)}</div>
                    {property.isFeatured && (
                      <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-[10px] rounded-md uppercase tracking-wider font-heading">
                        ★ Featured
                      </div>
                    )}
                  </div>

                  {/* Details Body */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">
                            {property.type} · {property.category}
                          </span>
                          {property.isNestinVerified && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#4d7c0f]">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#65a30d]" />
                              Verified Stay
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-950 font-heading">{property.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {property.location.area}, {property.location.city}
                          </span>
                        </div>
                      </div>

                      {/* Pricing block */}
                      <div className="sm:text-right">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Starting from</div>
                        <div className="text-xl font-black text-slate-950 font-heading">
                          ₹{startingPrice.toLocaleString('en-IN')}
                          <span className="text-xs font-normal text-slate-500"> /mo</span>
                        </div>
                      </div>
                    </div>

                    {/* Room configurations breakdown chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {property.rooms.map((room) => (
                        <span
                          key={room.id}
                          className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold"
                        >
                          {room.type}: ₹{room.monthlyRent.toLocaleString('en-IN')} ({room.availableBedsCount} beds left)
                        </span>
                      ))}
                    </div>

                    {/* Completeness & Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Beds</span>
                        <span className="font-black text-slate-900">{totalBeds} Beds</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Occupancy</span>
                        <span className="font-black text-[#4d7c0f]">
                          {occupancyPct}% ({totalOccupiedBeds}/{totalBeds})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Profile Score</span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                completeness.score >= 80
                                  ? 'bg-[#65a30d]'
                                  : completeness.score >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${completeness.score}%` }}
                            />
                          </div>
                          <span className="font-black text-slate-800 text-[11px]">{completeness.score}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Caretaker KYC</span>
                        <span className="font-bold text-slate-900">{property.caretaker.name}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Primary Tenant View / Live Link */}
                    {property.status === 'published' ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/properties/${property.slug}`)}
                        className="px-3.5 py-2 bg-[#ecfccb] hover:bg-[#d9f99d] text-[#0F5132] rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer font-heading shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Live on Find PG</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPreviewProperty(property)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer font-heading shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview Tenant View</span>
                      </button>
                    )}

                    {/* Status notification badge when under review */}
                    {property.status === 'pending_approval' && (
                      <button
                        type="button"
                        onClick={() =>
                          showToast(
                            `"${property.name}" is currently under verification. Average turnaround is 2–4 hours.`
                          )
                        }
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer font-heading"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                        <span>Verification In Progress</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {property.status === 'draft' && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = submitForVerification(property.id);
                          showToast(res.message);
                        }}
                        className="px-4 py-2 bg-[#a3e635] hover:bg-[#92d428] text-[#0F5132] font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer font-heading transition-all"
                      >
                        Submit for Verification
                      </button>
                    )}

                    {property.status === 'rejected' && (
                      <button
                        type="button"
                        onClick={() => onEditProperty(property)}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer font-heading transition-all"
                      >
                        Fix Issues
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onEditProperty(property)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-[#0F5132] hover:text-white text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer font-heading flex items-center gap-1.5"
                      title="Edit Property Listing"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        duplicateProperty(property.id);
                        showToast(`Duplicated "${property.name}" as new draft.`);
                      }}
                      className="p-2 text-slate-600 hover:text-[#0F5132] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                      title="Duplicate Listing"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${property.name}?`)) {
                          deleteProperty(property.id);
                          showToast(`Property listing deleted.`);
                        }
                      }}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Property"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
