'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import BgCanvas from '@/components/BgCanvas';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import StatsTicker from '@/components/StatsTicker';
import PlatformStats from '@/components/PlatformStats';
import Seasons from '@/components/Seasons';
import HowItWorks from '@/components/HowItWorks';
import Referral from '@/components/Referral';
import Testimonials from '@/components/Testimonials';
import About from '@/components/About';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function HomePage() {
  useScrollReveal();

  return (
    <>
      <BgCanvas />
      <Navbar />
      <main>
        <Hero />
        <StatsTicker />
        <PlatformStats />
        <Seasons />
        <HowItWorks />
        <Referral />
        <Testimonials />
        <About />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
