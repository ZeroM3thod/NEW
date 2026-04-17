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
import ScrollRevealInit from '@/components/ScrollRevealInit';
import VaultXLoader from '@/components/VaultXLoader';

export default function HomePage() {
  return (
    <>
      <VaultXLoader pageName="Home" />
      <ScrollRevealInit />
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