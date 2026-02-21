import { ShieldCheck, Zap, Globe2, Lock, Coins, LayoutTemplate } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-[var(--md-primary)]" />,
      title: "Bank-Grade Security",
      description: "Our backend validates every transaction. Users cannot tamper with prices or destination addresses.",
      containerColor: "var(--md-primary-container)",
    },
    {
      icon: <Zap className="w-6 h-6 text-[var(--md-tertiary)]" />,
      title: "Instant Settlement",
      description: "Funds go directly from your customer's wallet to yours. No holding periods, no delays.",
      containerColor: "var(--md-tertiary-container)",
    },
    {
      icon: <Coins className="w-6 h-6 text-[var(--md-primary)]" />,
      title: "Zero Fees",
      description: "We don't take a cut. You receive 100% of the payment amount, minus standard network gas fees.",
      containerColor: "var(--md-primary-container)",
    },
    {
      icon: <Globe2 className="w-6 h-6 text-[var(--md-tertiary)]" />,
      title: "Global Reach",
      description: "Accept payments from anyone, anywhere in the world. No borders, no currency conversion headaches.",
      containerColor: "var(--md-tertiary-container)",
    },
    {
      icon: <Lock className="w-6 h-6 text-[var(--md-secondary)]" />,
      title: "Non-Custodial",
      description: "We never touch your funds. You maintain complete control and ownership of your assets at all times.",
      containerColor: "var(--md-secondary-container)",
    },
    {
      icon: <LayoutTemplate className="w-6 h-6 text-[var(--md-secondary)]" />,
      title: "Works Everywhere",
      description: "Compatible with WordPress, Shopify, React, plain HTML, and any other web platform.",
      containerColor: "var(--md-secondary-container)",
    },
  ];

  return (
    <section id="features" className="py-24 bg-[var(--md-surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--md-on-surface)] mb-4">
            Everything you need to accept crypto
          </h2>
          <p className="text-lg text-[var(--md-on-surface-variant)] max-w-2xl mx-auto">
            Built for merchants who want a reliable, secure, and hassle-free payment solution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 rounded-3xl bg-[var(--md-surface)] border border-[var(--md-outline-variant)] hover:border-[var(--md-primary)] transition-all duration-300 group hover:-translate-y-1"
              style={{ boxShadow: 'var(--md-elevation-1)' }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                style={{ backgroundColor: feature.containerColor }}
              >
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-[var(--md-on-surface)] mb-3">{feature.title}</h3>
              <p className="text-[var(--md-on-surface-variant)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
