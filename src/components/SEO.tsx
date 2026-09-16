import React, { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: string;
  twitterHandle?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title = 'Nestin | Verified PGs, Hostels & Co-Living Homes in India',
  description = 'Find and book verified PGs, hostels, and co-living spaces across major Indian cities with Nestin. Zero brokerage, verified amenities, and flexible move-in dates.',
  canonicalUrl = 'https://nestin.in',
  ogImage = 'https://nestin.in/nestin_logo.png',
  ogType = 'website',
  twitterHandle = '@nestin_india',
}) => {
  useEffect(() => {
    // 1. Set Document Title
    document.title = title;

    // Helper to upsert meta tag
    const setMetaTag = (selector: string, attributeName: string, attributeValue: string, content: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Helper to upsert link tag
    const setLinkTag = (rel: string, href: string) => {
      let element = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // Standard Description
    setMetaTag('meta[name="description"]', 'name', 'description', description);

    // Canonical URL
    setLinkTag('canonical', canonicalUrl);

    // Open Graph Meta Tags
    setMetaTag('meta[property="og:title"]', 'property', 'og:title', title);
    setMetaTag('meta[property="og:description"]', 'property', 'og:description', description);
    setMetaTag('meta[property="og:type"]', 'property', 'og:type', ogType);
    setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', ogImage);
    setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', 'Nestin');

    // Twitter Card Meta Tags
    setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setMetaTag('meta[name="twitter:site"]', 'name', 'twitter:site', twitterHandle);
    setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', ogImage);

    // JSON-LD Structured Data Schema
    const schemaData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          '@id': `${canonicalUrl}/#website`,
          'url': canonicalUrl,
          'name': 'Nestin',
          'description': description,
          'potentialAction': [
            {
              '@type': 'SearchAction',
              'target': {
                '@type': 'EntryPoint',
                'urlTemplate': `${canonicalUrl}/?search={search_term_string}`,
              },
              'query-input': 'required name=search_term_string',
            },
          ],
        },
        {
          '@type': 'Organization',
          '@id': `${canonicalUrl}/#organization`,
          'name': 'Nestin',
          'url': canonicalUrl,
          'logo': {
            '@type': 'ImageObject',
            'url': ogImage,
          },
          'sameAs': [
            'https://twitter.com/nestin_india',
            'https://facebook.com/nestin',
            'https://instagram.com/nestin_india',
          ],
        },
        {
          '@type': 'RealEstateAgent',
          '@id': `${canonicalUrl}/#realestate`,
          'name': 'Nestin Co-Living & Hostels',
          'image': ogImage,
          'priceRange': '₹₹',
          'address': {
            '@type': 'PostalAddress',
            'addressCountry': 'IN',
          },
        },
      ],
    };

    let scriptElement = document.querySelector('script[id="nestin-jsonld-schema"]') as HTMLScriptElement | null;
    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = 'nestin-jsonld-schema';
      scriptElement.type = 'application/ld+json';
      document.head.appendChild(scriptElement);
    }
    scriptElement.textContent = JSON.stringify(schemaData, null, 2);

  }, [title, description, canonicalUrl, ogImage, ogType, twitterHandle]);

  return null;
};
