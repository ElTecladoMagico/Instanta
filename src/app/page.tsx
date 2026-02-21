import { Navbar } from "../components/landing/Navbar";
import { Hero } from "../components/landing/Hero";
import { HowItWorks } from "../components/landing/HowItWorks";
import { Features } from "../components/landing/Features";
import { Footer } from "../components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background selection:bg-primary-container selection:text-on-primary-container">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </main>
  );
}
