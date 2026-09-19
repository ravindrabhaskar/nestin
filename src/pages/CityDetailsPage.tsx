import React, { useMemo, useState, useEffect } from 'react';
import { ApiClient } from '../lib/apiClient';
import type { OwnerPropertyListing } from '../types/property';
import type { PropertyListing } from '../types';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Wifi,
  Utensils,
  Shirt,
  Dumbbell,
  ParkingSquare,
  Zap,
  CheckCircle2,
  Train,
  Plane,
  Bus,
  CloudSun,
  Users,
  Compass,
  ArrowRight,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useCities, cityStaysLabel } from '../lib/usePlatformData';
import { LazyImage } from '../components/LazyImage';
import { InteractiveMap } from '../components/InteractiveMap';
import { usePropertyListing } from '../context/PropertyListingContext';

export const CityDetailsPage: React.FC = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const navigate = useNavigate();
  const { value: allCities } = useCities();

  // Find matching city by id or name slug
  const city = useMemo(() => {
    if (!citySlug) return allCities[0];
    const cleanSlug = citySlug.toLowerCase().trim();
    return (
      allCities.find(
        (c) =>
          c.id.toLowerCase() === cleanSlug ||
          c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === cleanSlug ||
          c.name.toLowerCase() === cleanSlug
      ) || allCities[0]
    );
  }, [citySlug, allCities]);

  // Filter properties in this city
  const { toFindPGListing } = usePropertyListing();
  const [cityProperties, setCityProperties] = useState<PropertyListing[]>([]);
  useEffect(() => {
    let cancelled = false;
    ApiClient.properties
      .search({ city: city.name, pageSize: 60, sort: 'relevance' })
      .then(({ data }) => {
        if (!cancelled) setCityProperties((data as OwnerPropertyListing[]).map(toFindPGListing));
      })
      .catch(() => {
        if (!cancelled) setCityProperties([]);
      });
    return () => {
      cancelled = true;
    };
  }, [city.name, toFindPGListing]);

  const handleExplorePGs = () => {
    navigate(`/find-pg?city=${encodeURIComponent(city.name)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const staysCount = city.verifiedCount
    ? `${city.verifiedCount.toLocaleString('en-IN')} Verified ${city.verifiedCount === 1 ? 'Stay' : 'Stays'}`
    : cityStaysLabel(city);

  const startingPrice = city.startingRent ? `₹${city.startingRent.toLocaleString('en-IN')}` : '—';

  const avgPrice =
    city.availableBeds !== undefined && city.availableBeds > 0
      ? `${city.availableBeds.toLocaleString('en-IN')} free`
      : 'No listings yet';

  return (
    <div className="min-h-screen bg-[#053222] text-white selection:bg-[#a3e635] selection:text-black pb-24">
      {/* BREADCRUMBS & TOP NAV */}
      <div className="bg-slate-950/80 border-b border-white/10 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/cities')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-[#a3e635] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Cities</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="cursor-pointer hover:text-white" onClick={() => navigate('/')}>
              Home
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="cursor-pointer hover:text-white" onClick={() => navigate('/cities')}>
              Cities
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#a3e635] font-bold">{city.name}</span>
          </div>

          <button
            type="button"
            onClick={handleExplorePGs}
            className="px-5 py-2 rounded-full bg-[#a3e635] text-slate-950 text-xs font-black font-heading hover:bg-[#92d428] transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <span>Explore PGs in {city.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* HERO BANNER SECTION */}
      <div className="relative w-full h-[480px] sm:h-[560px] overflow-hidden">
        <LazyImage
          src={city.image}
          alt={city.name}
          className="w-full h-full"
          imgClassName="w-full h-full object-cover object-center"
          placeholderColor="bg-slate-950"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#053222] via-[#053222]/60 to-black/40" />

        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 w-full space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-[#a3e635]/40 text-[#a3e635] text-xs font-black uppercase tracking-wider font-heading flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{staysCount}</span>
              </span>

              {city.weather && (
                <span className="px-3 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CloudSun className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>{city.weather}</span>
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold">
                {city.state || 'India'}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight text-white leading-none">
                {city.name}
              </h1>
              <p className="text-lg sm:text-xl font-medium text-slate-200 max-w-2xl">
                {city.description || `Premier student and professional hub in ${city.state}`}
              </p>
            </div>

            {/* KEY METRICS SUMMARY STRIP */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-300">
              <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
                <span className="text-xs text-slate-400 block">Starting Rent</span>
                <span className="text-base font-black text-[#a3e635] font-heading">{startingPrice}/month</span>
              </div>

              <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
                <span className="text-xs text-slate-400 block">Beds available</span>
                <span className="text-base font-black text-white font-heading">{avgPrice}</span>
              </div>

              {city.studentScore && (
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
                  <span className="text-xs text-slate-400 block">Student Rating</span>
                  <span className="text-base font-black text-amber-400 font-heading">{city.studentScore} / 10</span>
                </div>
              )}

              {city.proScore && (
                <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/15">
                  <span className="text-xs text-slate-400 block">Professional Rating</span>
                  <span className="text-base font-black text-sky-400 font-heading">{city.proScore} / 10</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT GRID CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 pt-8">
        {/* OVERVIEW & DEMOGRAPHICS */}
        <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Compass className="w-6 h-6 text-[#a3e635]" />
            <h2 className="text-2xl font-black font-heading tracking-tight text-white">City Overview & Demographics</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-950/60 rounded-2xl p-5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase font-heading">
                <Users className="w-4 h-4 text-[#a3e635]" />
                <span>Student Hub Score</span>
              </div>
              <p className="text-2xl font-black text-white font-heading">{city.studentScore || 9.5} / 10</p>
              <p className="text-xs text-slate-300">
                Top destination for engineering, medical, and management students across India.
              </p>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase font-heading">
                <Briefcase className="w-4 h-4 text-sky-400" />
                <span>Working Professional Score</span>
              </div>
              <p className="text-2xl font-black text-white font-heading">{city.proScore || 9.6} / 10</p>
              <p className="text-xs text-slate-300">
                High density of IT parks, MNC headquarters, and startup incubators.
              </p>
            </div>

            <div className="bg-slate-950/60 rounded-2xl p-5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase font-heading">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Safety & Women Index</span>
              </div>
              <p className="text-2xl font-black text-white font-heading">{city.safetyScore || 9.7} / 10</p>
              <p className="text-xs text-slate-300">
                Verified safe neighborhoods with 24/7 CCTV surveillance and security staff.
              </p>
            </div>
          </div>
        </section>

        {/* TRANSIT & CONNECTIVITY */}
        {city.nearbyTransit && (
          <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <Train className="w-6 h-6 text-[#a3e635]" />
              <h2 className="text-2xl font-black font-heading tracking-tight text-white">Transit & Connectivity</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {city.nearbyTransit.metro && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Train className="w-4 h-4 text-[#a3e635]" />
                    <span>Metro Connectivity</span>
                  </div>
                  <p className="text-sm font-bold text-white">{city.nearbyTransit.metro}</p>
                </div>
              )}

              {city.nearbyTransit.airport && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Plane className="w-4 h-4 text-sky-400" />
                    <span>Nearest Airport</span>
                  </div>
                  <p className="text-sm font-bold text-white">{city.nearbyTransit.airport}</p>
                </div>
              )}

              {city.nearbyTransit.railway && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Train className="w-4 h-4 text-amber-400" />
                    <span>Railway Station</span>
                  </div>
                  <p className="text-sm font-bold text-white">{city.nearbyTransit.railway}</p>
                </div>
              )}

              {city.nearbyTransit.bus && (
                <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                    <Bus className="w-4 h-4 text-emerald-400" />
                    <span>Bus Terminal</span>
                  </div>
                  <p className="text-sm font-bold text-white">{city.nearbyTransit.bus}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* COLLEGES & IT COMPANIES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* POPULAR COLLEGES */}
          {city.popularColleges && city.popularColleges.length > 0 && (
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <GraduationCap className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-black font-heading text-white">Top Colleges & Universities</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {city.popularColleges.map((college) => (
                  <div
                    key={college}
                    className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#a3e635]" />
                    <span>{college}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOP COMPANIES */}
          {city.popularCompanies && city.popularCompanies.length > 0 && (
            <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <Briefcase className="w-6 h-6 text-sky-400" />
                <h3 className="text-xl font-black font-heading text-white">Top IT Companies & Tech Parks</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {city.popularCompanies.map((company) => (
                  <div
                    key={company}
                    className="px-3.5 py-2 rounded-xl bg-slate-950/80 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                    <span>{company}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* POPULAR LOCALITIES & RENT DISTRIBUTION */}
        <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <MapPin className="w-6 h-6 text-[#a3e635]" />
            <h2 className="text-2xl font-black font-heading tracking-tight text-white">
              Popular Residential Localities
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(city.popularLocalities || []).map((locality) => (
              <div
                key={locality}
                onClick={handleExplorePGs}
                className="bg-slate-950/70 hover:bg-slate-950 border border-white/10 hover:border-[#a3e635]/40 p-4 rounded-2xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white group-hover:text-[#a3e635] transition-colors">
                    {locality}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#a3e635] group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400">Verified PGs available</p>
              </div>
            ))}
          </div>
        </section>

        {/* PRICE DISTRIBUTION BREAKDOWN */}
        <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Info className="w-6 h-6 text-[#a3e635]" />
            <h2 className="text-2xl font-black font-heading tracking-tight text-white">Rent Budget Distribution</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Budget Stays</span>
              <p className="text-xl font-black text-[#a3e635] font-heading">Under ₹6,000/mo</p>
              <p className="text-xs text-slate-300">Basic shared rooms with food & WiFi</p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Mid-Range</span>
              <p className="text-xl font-black text-sky-400 font-heading">₹6,000 - ₹12,000/mo</p>
              <p className="text-xs text-slate-300">Twin sharing with AC & housekeeping</p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Premium</span>
              <p className="text-xl font-black text-amber-400 font-heading">₹12,000 - ₹18,000/mo</p>
              <p className="text-xs text-slate-300">Single private rooms & studio PGs</p>
            </div>

            <div className="bg-slate-950/70 p-5 rounded-2xl border border-white/10 space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">Luxury Co-Living</span>
              <p className="text-xl font-black text-purple-400 font-heading">₹18,000+/mo</p>
              <p className="text-xs text-slate-300">Fully serviced co-living apartments</p>
            </div>
          </div>
        </section>

        {/* TOP AMENITIES IN THIS CITY */}
        <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <Building2 className="w-6 h-6 text-[#a3e635]" />
            <h2 className="text-2xl font-black font-heading tracking-tight text-white">Standard Verified Amenities</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <Wifi className="w-6 h-6 text-[#a3e635] mx-auto" />
              <span className="text-xs font-bold text-white block">High-Speed WiFi</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <Utensils className="w-6 h-6 text-amber-400 mx-auto" />
              <span className="text-xs font-bold text-white block">Homely Meals</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <Shirt className="w-6 h-6 text-sky-400 mx-auto" />
              <span className="text-xs font-bold text-white block">Laundry Service</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <Dumbbell className="w-6 h-6 text-emerald-400 mx-auto" />
              <span className="text-xs font-bold text-white block">Gym Access</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <ParkingSquare className="w-6 h-6 text-purple-400 mx-auto" />
              <span className="text-xs font-bold text-white block">Vehicle Parking</span>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 text-center space-y-2">
              <Zap className="w-6 h-6 text-[#a3e635] mx-auto" />
              <span className="text-xs font-bold text-white block">Power Backup</span>
            </div>
          </div>
        </section>

        {/* INTERACTIVE CITY MAP SECTION */}
        <section className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 backdrop-blur-md space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-[#a3e635]" />
              <h2 className="text-2xl font-black font-heading tracking-tight text-white">
                {city.name} Map & Stay Clusters
              </h2>
            </div>
            <button
              type="button"
              onClick={handleExplorePGs}
              className="text-xs font-extrabold text-[#a3e635] hover:underline flex items-center gap-1 font-heading"
            >
              <span>View Fullscreen Map</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-[400px] rounded-2xl overflow-hidden border border-white/10">
            <InteractiveMap
              properties={cityProperties}
              onSelectProperty={(prop) => {
                navigate(`/properties/${prop.slug || prop.id}`);
              }}
            />
          </div>
        </section>

        {/* BOTTOM CTA BANNER */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 rounded-3xl p-8 sm:p-12 border border-[#a3e635]/40 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#a3e635]/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            Ready to find your stay in {city.name}?
          </h2>

          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto font-medium">
            {city.startingRent
              ? `Explore verified PGs, Hostels, and Co-Living rooms starting from ${startingPrice}/month with zero brokerage.`
              : `We are onboarding verified PGs, Hostels and Co-Living spaces in ${city.name}. Own a property here? List it free.`}
          </p>

          <button
            type="button"
            onClick={handleExplorePGs}
            className="px-10 py-4 rounded-full bg-[#a3e635] text-slate-950 text-base font-black font-heading tracking-tight hover:bg-[#92d428] shadow-[0_10px_40px_rgba(163,230,53,0.4)] hover:shadow-[0_15px_50px_rgba(163,230,53,0.6)] transition-all transform hover:scale-105 cursor-pointer inline-flex items-center gap-3"
          >
            <span>Explore PGs in {city.name}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
