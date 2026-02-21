import { MousePointerClick, Code2, Wallet } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: <MousePointerClick className="w-8 h-8 text-[var(--md-primary)]" />,
      title: "1. Create your Button",
      description: "Configure the amount, currency, and destination wallet in our simple dashboard.",
      color: "var(--md-primary-container)",
    },
    {
      icon: <Code2 className="w-8 h-8 text-[var(--md-tertiary)]" />,
      title: "2. Copy the Code",
      description: "We generate a secure, ready-to-use HTML snippet for you. Just copy it.",
      color: "var(--md-tertiary-container)",
    },
    {
      icon: <Wallet className="w-8 h-8 text-[var(--md-success)]" />,
      title: "3. Start Earning",
      description: "Paste it into your website. Your customers can now pay you instantly.",
      color: "var(--md-success-container)",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[var(--md-surface-container-low)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--md-on-surface)] mb-4">
            As Simple as Copy & Paste
          </h2>
          <p className="text-lg text-[var(--md-on-surface-variant)] max-w-2xl mx-auto">
            You don&apos;t need to be a developer to accept crypto. We&apos;ve handled the complexity so you don&apos;t have to.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-[var(--md-primary)] via-[var(--md-tertiary)] to-[var(--md-success)] opacity-30 -z-10"></div>

          {steps.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-all duration-300"
                style={{
                  backgroundColor: step.color,
                  boxShadow: 'var(--md-elevation-2)'
                }}
              >
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-[var(--md-on-surface)] mb-3">{step.title}</h3>
              <p className="text-[var(--md-on-surface-variant)] leading-relaxed max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Code Snippet Preview - Material elevated card */}
        <div className="mt-16 max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{ boxShadow: 'var(--md-elevation-4)' }}>
          <div className="flex items-center gap-2 px-4 py-3 bg-[#2D2D2D] border-b border-white/10">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
            <div className="w-3 h-3 rounded-full bg-[#28CA41]"></div>
            <span className="ml-2 text-xs text-gray-400 font-mono">index.html</span>
          </div>
          <div className="p-6 overflow-x-auto bg-[#1C1B1F]">
            <pre className="text-sm font-mono text-gray-300">
              <code>
                <span className="text-[#82AAFF]">&lt;script</span> <span className="text-[#C792EA]">src</span>=<span className="text-[#C3E88D]">{'"https://instanta.app/button.js"'}</span><span className="text-[#82AAFF]">&gt;&lt;/script&gt;</span>
                {'\n\n'}
                <span className="text-gray-500">{`<!-- Your Secure Payment Button -->`}</span>
                {'\n'}
                <span className="text-[#82AAFF]">&lt;button</span> <span className="text-[#C792EA]">data-instanta-button-id</span>=<span className="text-[#C3E88D]">{'"btn_8x92..."'}</span><span className="text-[#82AAFF]">&gt;</span>
                {'\n  '}Pay Now
                {'\n'}
                <span className="text-[#82AAFF]">&lt;/button&gt;</span>
              </code>
            </pre>
          </div>
        </div>

      </div>
    </section>
  );
}
