'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

import { CompanionHero } from '@/components/hero/CompanionHero';
import { LearningSpotlight } from '@/components/landing/LearningSpotlight';
import { AdvantagesSection } from '@/components/landing/AdvantagesSection';
import { RealTimeShowcase } from '@/components/landing/RealTimeShowcase';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/today');
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex flex-col items-center justify-center w-full bg-white text-[#171717] selection:bg-[#D4F82A] selection:text-black">
      {/* 1. Hero Section (fits 100svh in initial viewport with dynamic phrase rotator) */}
      <CompanionHero />

      {/* 2. Spotlight Section: 'Master Complex Concepts Faster with Socratic AI' */}
      <LearningSpotlight />

      {/* 3. Platform Advantages Section: 2x2 Grid with Lime Badges & Clean Actions */}
      <div id="how-it-works" className="w-full scroll-mt-20">
        <AdvantagesSection />
      </div>

      {/* 4. Real-Time Showcase & 10,000+ Topics Floating Roadmap Cards with Seamless Flowing Connector into CTA */}
      <div id="about" className="w-full scroll-mt-20">
        <RealTimeShowcase />
      </div>

      {/* 5. Modern Dark Footer with Lime Brand Dot & Newsletter Input */}
      <LandingFooter />
    </div>
  );
}
