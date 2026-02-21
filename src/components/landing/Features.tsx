import { ShieldCheck, Zap, Globe2, Lock, Coins, LayoutTemplate } from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description: "Our backend validates every transaction. Users cannot tamper with prices or destination addresses.",
    color: "primary" as const,
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description: "Funds go directly from your customer's wallet to yours. No holding periods, no delays.",
    color: "tertiary" as const,
  },
  {
    icon: Coins,
    title: "Zero Fees",
    description: "We don't take a cut. You receive 100% of the payment amount, minus standard network gas fees.",
    color: "secondary" as const,
  },
  {
    icon: Globe2,
    title: "Global Reach",
    description: "Accept payments from anyone, anywhere in the world. No borders, no currency conversion headaches.",
    color: "tertiary" as const,
  },
  {
    icon: Lock,
    title: "Non-Custodial",
    description: "We never touch your funds. You maintain complete control and ownership of your assets at all times.",
    color: "primary" as const,
  },
  {
    icon: LayoutTemplate,
    title: "Works Everywhere",
    description: "Compatible with WordPress, Shopify, React, plain HTML, and any other web platform.",
    color: "secondary" as const,
  },
];

const colorMap = {
  primary: {
    container: "bg-primary-container",
    icon: "text-primary",
    border: "hover:border-primary",
  },
  secondary: {
    container: "bg-secondary-container",
    icon: "text-secondary",
    border: "hover:border-secondary",
  },
  tertiary: {
    container: "bg-tertiary-container",
    icon: "text-tertiary",
    border: "hover:border-tertiary",
  },
};

export function Features() {
  return (
    <section id="features" className="py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-on-surface mb-4">
            Everything you need to accept crypto
          </h2>
          <p className="text-lg text-on-surface-variant max-w-2xl mx-auto">
            Built for merchants who want a reliable, secure, and hassle-free payment solution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const colors = colorMap[feature.color];
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`p-8 rounded-3xl bg-surface border border-outline-variant ${colors.border} transition-all duration-300 group hover:-translate-y-1 shadow-elevation-1`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${colors.container}`}
                >
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className="text-xl font-bold text-on-surface mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
