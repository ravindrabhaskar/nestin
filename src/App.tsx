import React, { Suspense, lazy, useState } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { SEO } from './components/SEO';
import { SmoothScroll, scrollToTarget } from './components/SmoothScroll';
import { ScrollToTopButton } from './components/ScrollToTopButton';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { StatsSection } from './components/StatsSection';
import { FeatureTrust } from './components/FeatureTrust';
import { FeatureCommunity } from './components/FeatureCommunity';
import { WhyNestin } from './components/WhyNestin';
import { StepsSection } from './components/StepsSection';
import { DualCardsSection } from './components/DualCardsSection';
import { CityCarousel } from './components/CityCarousel';
import { TestimonialsSection } from './components/TestimonialsSection';
import { AboutUsPage } from './components/AboutUsPage';
import { ContactPage } from './components/ContactPage';
import { NewsletterSection } from './components/NewsletterSection';
import { Footer } from './components/Footer';
import { Modals } from './components/Modals';
import { FindPGPage } from './components/FindPGPage';
import { FavoritesModal } from './components/FavoritesModal';
import { QuickLoginToast } from './components/QuickLoginToast';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PropertyListingProvider } from './context/PropertyListingContext';
import { CRMProvider } from './context/CRMContext';
import { RBACProvider } from './context/RBACContext';
import { SearchFilterState, CityItem, PropertyListing } from './types';
import { PropertyDetailsPage } from './pages/PropertyDetailsPage';
import { PropertyNotFoundPage } from './pages/PropertyNotFoundPage';
import { CitiesPage } from './pages/CitiesPage';
import { CityDetailsPage } from './pages/CityDetailsPage';
import { AuthCallback } from './pages/AuthCallback';
import { ForOwnersPage } from './pages/ForOwnersPage';
import { SyncNoticeToast } from './components/SyncNoticeToast';
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage').then((m) => ({ default: m.OwnerDashboardPage })));
const SuperAdminLoginPage = lazy(() => import('./pages/admin/SuperAdminLoginPage').then((m) => ({ default: m.SuperAdminLoginPage })));
const SuperAdminDashboardPage = lazy(() => import('./pages/admin/SuperAdminDashboardPage').then((m) => ({ default: m.SuperAdminDashboardPage })));

const PortalFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5]">
    <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
  </div>
);
import { TenantProfilePage } from './pages/TenantProfilePage';
import { TenantSettingsPage } from './pages/TenantSettingsPage';
import { TenantBookingsPage } from './pages/TenantBookingsPage';
import { TenantSavedPage } from './pages/TenantSavedPage';
import { TenantPaymentsPage } from './pages/TenantPaymentsPage';
import { TenantDocumentsPage } from './pages/TenantDocumentsPage';
import { TenantSupportPage } from './pages/TenantSupportPage';
import {
  ProtectedOwnerRoute,
  ProtectedSuperAdminRoute,
  ProtectedTenantRoute,
} from './components/auth/ProtectedRoute';

function AppInner() {
  const navigate = useNavigate();
  const location = useLocation();

  const { authModalOpen, setAuthModalOpen } = useAuth();
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilterState | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityItem | null>(null);

  // Derive active navbar page from pathname
  const getCurrentPageFromPath = (): 'home' | 'find-pg' | 'for-owners' | 'about' | 'contact' => {
    if (location.pathname.startsWith('/find-pg')) return 'find-pg';
    if (location.pathname.startsWith('/for-owners') || location.pathname.startsWith('/owner/dashboard')) return 'for-owners';
    if (location.pathname.startsWith('/about')) return 'about';
    if (location.pathname.startsWith('/contact')) return 'contact';
    return 'home';
  };

  const currentPage = getCurrentPageFromPath();

  const handleNavigate = (
    page: 'home' | 'find-pg' | 'for-owners' | 'about' | 'contact',
    sectionId?: string
  ) => {
    if (page === 'find-pg') {
      navigate('/find-pg');
    } else if (page === 'for-owners') {
      navigate('/for-owners');
    } else if (page === 'about') {
      navigate('/about');
    } else if (page === 'contact') {
      navigate('/contact');
    } else {
      navigate('/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (page === 'home' && sectionId) {
      setTimeout(() => {
        scrollToTarget(`#${sectionId}`, { offset: -90, duration: 1.2 });
      }, 100);
    }
  };

  const handleSelectProperty = (property: PropertyListing) => {
    const targetSlug =
      property.slug ||
      (property.name || property.title || property.id)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    navigate(`/property/${targetSlug}`);
  };

  const isDetailsPage = location.pathname.startsWith('/properties/') || location.pathname.startsWith('/property/');
  const isOwnerDashboard = location.pathname.startsWith('/owner');
  const isAdminPage = location.pathname.startsWith('/admin');
  const hideGlobalChrome = isDetailsPage || isOwnerDashboard || isAdminPage;

  return (
    <WishlistProvider>
      <SmoothScroll>
        <SEO />
        <div className="min-h-screen bg-[#FAF9F5] text-[#121820] relative selection:bg-[#a3e635] selection:text-black flex flex-col justify-between font-sans">
          {/* Render Navbar on non-property-details pages */}
          {!hideGlobalChrome && (
            <Navbar
              currentPage={currentPage}
              onNavigate={handleNavigate}
              onOpenAuth={() => setAuthModalOpen(true)}
              onOpenFavorites={() => setFavoritesOpen(true)}
              onSelectSection={(sectionId) => {
                if (location.pathname !== '/') {
                  navigate('/');
                  setTimeout(() => {
                    const el = document.getElementById(sectionId);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }, 150);
                } else {
                  const el = document.getElementById(sectionId);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />
          )}

          {/* Main Routing Views with full min-h-screen and natural browser scrolling */}
          <main className="relative z-10 flex-grow min-h-screen">
            <Suspense fallback={<PortalFallback />}>
            <Routes>
              {/* Home Page Route */}
              <Route
                path="/"
                element={
                  <div className="space-y-4">
                    <section id="home">
                      <Hero onSearch={() => navigate('/find-pg')} />
                    </section>
                    <StatsSection />
                    <FeatureTrust />
                    <FeatureCommunity />
                    <section id="why-nestin">
                      <WhyNestin
                        onSelectFeature={() => navigate('/find-pg')}
                      />
                    </section>
                    <StepsSection
                      onStepAction={(stepIdx) => {
                        if (stepIdx === 0 || stepIdx === 1) {
                          navigate('/find-pg');
                        } else if (stepIdx === 2) {
                          setAuthModalOpen(true);
                        } else {
                          const el = document.getElementById('why-nestin');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    />
                    <section id="platform-highlights">
                      <DualCardsSection
                        onFindPG={() => navigate('/find-pg')}
                      />
                    </section>
                    <CityCarousel
                      onSelectCity={(city) => {
                        setSelectedCity(city);
                        navigate(`/find-pg?city=${encodeURIComponent(city.name)}`);
                      }}
                      onViewAllCities={() => navigate('/cities')}
                    />
                    <TestimonialsSection />
                    <NewsletterSection />
                  </div>
                }
              />

              {/* All Cities Directory Route */}
              <Route path="/cities" element={<CitiesPage />} />

              {/* Dedicated City Details Page Route */}
              <Route path="/cities/:citySlug" element={<CityDetailsPage />} />

              {/* Find PG Page Route */}
              <Route
                path="/find-pg"
                element={
                  <FindPGPage
                    onSelectProperty={handleSelectProperty}
                    onOpenAuth={() => setAuthModalOpen(true)}
                  />
                }
              />

              {/* About Us Page Route */}
              <Route
                path="/about"
                element={
                  <AboutUsPage
                    onNavigate={handleNavigate}
                    onOpenAuth={() => setAuthModalOpen(true)}
                  />
                }
              />

              {/* Contact Page Route */}
              <Route
                path="/contact"
                element={<ContactPage onNavigate={handleNavigate} />}
              />

              {/* Dedicated Property Details Page Route */}
              <Route path="/property/:slug" element={<PropertyDetailsPage />} />
              <Route path="/property/:propertyId" element={<PropertyDetailsPage />} />
              <Route path="/properties/:slug" element={<PropertyDetailsPage />} />

              {/* Supabase OAuth Redirect Callback */}
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* For Owners & Owner Dashboard Routes */}
              <Route path="/for-owners" element={<ForOwnersPage />} />
              <Route path="/owner" element={<Navigate to="/owner/dashboard" replace />} />
              <Route path="/owner/crm" element={<Navigate to="/owner/dashboard" replace />} />
              <Route path="/owner/dashboard" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Dashboard" /></ProtectedOwnerRoute>} />
              <Route path="/owner/leads" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Leads" /></ProtectedOwnerRoute>} />
              <Route path="/owner/bookings" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Bookings" /></ProtectedOwnerRoute>} />
              <Route path="/owner/visitors" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Visitors" /></ProtectedOwnerRoute>} />
              <Route path="/owner/customers" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Customers" /></ProtectedOwnerRoute>} />
              <Route path="/owner/properties" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Properties" /></ProtectedOwnerRoute>} />
              <Route path="/owner/reports" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Reports" /></ProtectedOwnerRoute>} />
              <Route path="/owner/analytics" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Analytics" /></ProtectedOwnerRoute>} />
              <Route path="/owner/employees" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Employees" /></ProtectedOwnerRoute>} />
              <Route path="/owner/roles-permissions" element={<ProtectedOwnerRoute><OwnerDashboardPage initialNav="Roles & Permissions" /></ProtectedOwnerRoute>} />
              <Route path="/owner/roles" element={<Navigate to="/owner/roles-permissions" replace />} />

              {/* Super Admin Management Console (Strictly Isolated) */}
              <Route path="/admin/login" element={<SuperAdminLoginPage />} />
              <Route path="/admin" element={<ProtectedSuperAdminRoute><SuperAdminDashboardPage /></ProtectedSuperAdminRoute>} />
              <Route path="/admin/*" element={<ProtectedSuperAdminRoute><SuperAdminDashboardPage /></ProtectedSuperAdminRoute>} />

              {/* Protected Resident & Tenant Routes */}
              <Route path="/profile" element={<ProtectedTenantRoute><TenantProfilePage /></ProtectedTenantRoute>} />
              <Route path="/settings" element={<ProtectedTenantRoute><TenantSettingsPage /></ProtectedTenantRoute>} />
              <Route path="/settings/notifications" element={<ProtectedTenantRoute><TenantSettingsPage /></ProtectedTenantRoute>} />
              <Route path="/settings/preferences" element={<ProtectedTenantRoute><TenantSettingsPage /></ProtectedTenantRoute>} />
              <Route path="/settings/security" element={<ProtectedTenantRoute><TenantSettingsPage /></ProtectedTenantRoute>} />
              <Route path="/settings/privacy" element={<ProtectedTenantRoute><TenantSettingsPage /></ProtectedTenantRoute>} />
              <Route path="/my-bookings" element={<ProtectedTenantRoute><TenantBookingsPage /></ProtectedTenantRoute>} />
              <Route path="/saved" element={<ProtectedTenantRoute><TenantSavedPage /></ProtectedTenantRoute>} />
              <Route path="/payments" element={<ProtectedTenantRoute><TenantPaymentsPage /></ProtectedTenantRoute>} />
              <Route path="/documents" element={<ProtectedTenantRoute><TenantDocumentsPage /></ProtectedTenantRoute>} />
              <Route path="/support" element={<ProtectedTenantRoute><TenantSupportPage /></ProtectedTenantRoute>} />

              {/* Backwards compatible aliases */}
              <Route path="/my-profile" element={<Navigate to="/profile" replace />} />
              <Route path="/my-wishlist" element={<Navigate to="/saved" replace />} />
              <Route path="/dashboard" element={<Navigate to="/profile" replace />} />

              {/* Catch-all Not Found Route */}
              <Route path="*" element={<PropertyNotFoundPage />} />
            </Routes>
            </Suspense>
          </main>

          {/* Footer for non-details and non-admin pages */}
          {!hideGlobalChrome && (
            <Footer
              onNavigate={handleNavigate}
              onSelectCity={(city) => {
                const cityName = typeof city === 'string' ? city : (city as any)?.name;
                setSelectedCity(cityName);
                navigate(`/find-pg?city=${encodeURIComponent(cityName)}`);
              }}
              onOpenFAQ={() => {
                if (location.pathname !== '/') navigate('/');
                setTimeout(() => {
                  scrollToTarget('#why-nestin', { offset: -90, duration: 1.2 });
                }, 150);
              }}
            />
          )}

          {/* Modals */}
          <Modals
            authOpen={authModalOpen}
            onCloseAuth={() => {
              setAuthModalOpen(false);
            }}
            searchFilter={searchFilter}
            onCloseSearch={() => setSearchFilter(null)}
            selectedCity={selectedCity}
            onCloseCity={() => setSelectedCity(null)}
          />

          {/* Wishlist Favorites Drawer */}
          <FavoritesModal
            isOpen={favoritesOpen}
            onClose={() => setFavoritesOpen(false)}
            onViewPropertyDetails={handleSelectProperty}
            onBookProperty={handleSelectProperty}
            onNavigateToFindPG={() => navigate('/find-pg')}
          />

          {/* Quick Login Toast Notification */}
          <QuickLoginToast />

          {/* Background sync notices (persistence errors, staff credentials, etc.) */}
          <SyncNoticeToast />

          {/* Floating Scroll To Top Button */}
          <ScrollToTopButton />
        </div>
      </SmoothScroll>
    </WishlistProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PropertyListingProvider>
        <CRMProvider>
          <RBACProvider>
            <AppInner />
          </RBACProvider>
        </CRMProvider>
      </PropertyListingProvider>
    </AuthProvider>
  );
}
