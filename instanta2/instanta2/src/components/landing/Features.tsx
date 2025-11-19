import { ShieldCheck, Zap, Globe2, Lock, Coins, LayoutTemplate } from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <ShieldCheck className="w-6 h-6 text-blue-600" />,
      title: "Bank-Grade Security",
      description: "Our backend validates every transaction. Users cannot tamper with prices or destination addresses.",
    },
    {
      icon: <Zap className="w-6 h-6 text-orange-500" />,
      title: "Instant Settlement",
      description: "Funds go directly from your customer's wallet to yours. No holding periods, no delays.",
    },
    {
      icon: <Coins className="w-6 h-6 text-blue-600" />,
      title: "Zero Fees",
      description: "We don't take a cut. You receive 100% of the payment amount, minus standard network gas fees.",
    },
    {
      icon: <Globe2 className="w-6 h-6 text-orange-500" />,
      title: "Global Reach",
      description: "Accept payments from anyone, anywhere in the world. No borders, no currency conversion headaches.",
    },
    {
      icon: <Lock className="w-6 h-6 text-blue-600" />,
      title: "Non-Custodial",
      description: "We never touch your funds. You maintain complete control and ownership of your assets at all times.",
    },
    {
      icon: <LayoutTemplate className="w-6 h-6 text-orange-500" />,
      title: "Works Everywhere",
      description: "Compatible with WordPress, Shopify, React, plain HTML, and any other web platform.",
    },
  ];

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to accept crypto
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Built for merchants who want a reliable, secure, and hassle-free payment solution.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-lg hover:border-blue-100 transition-all duration-300 group">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-50 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

