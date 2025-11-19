import { MousePointerClick, Code2, Wallet } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: <MousePointerClick className="w-8 h-8 text-blue-600" />,
      title: "1. Create your Button",
      description: "Configure the amount, currency, and destination wallet in our simple dashboard.",
    },
    {
      icon: <Code2 className="w-8 h-8 text-orange-500" />,
      title: "2. Copy the Code",
      description: "We generate a secure, ready-to-use HTML snippet for you. Just copy it.",
    },
    {
      icon: <Wallet className="w-8 h-8 text-green-500" />,
      title: "3. Start Earning",
      description: "Paste it into your website. Your customers can now pay you instantly.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            As Simple as Copy & Paste
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            You don't need to be a developer to accept crypto. We've handled the complexity so you don't have to.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop only) */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gray-200 -z-10"></div>

          {steps.map((step, index) => (
            <div key={index} className="relative flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-300">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Code Snippet Preview */}
        <div className="mt-16 max-w-3xl mx-auto bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-800">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border-b border-gray-700">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="ml-2 text-xs text-gray-400 font-mono">index.html</span>
          </div>
          <div className="p-6 overflow-x-auto">
            <pre className="text-sm font-mono text-gray-300">
              <code>
                <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://instanta.app/button.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span>
                {'\n\n'}
                <span className="text-gray-500">{`<!-- Your Secure Payment Button -->`}</span>
                {'\n'}
                <span className="text-blue-400">&lt;button</span> <span className="text-purple-400">data-instanta-button-id</span>=<span className="text-green-400">"btn_8x92..."</span><span className="text-blue-400">&gt;</span>
                {'\n  '}Pay Now
                {'\n'}
                <span className="text-blue-400">&lt;/button&gt;</span>
              </code>
            </pre>
          </div>
        </div>

      </div>
    </section>
  );
}

