import { createFileRoute } from '@tanstack/react-router';
import { Route as RouteIcon, Server, Shield, Sparkles, Waves, Zap } from 'lucide-react';

import { db } from '@db/core';

export const Route = createFileRoute('/')({
  component: App,
  loader: async () => {
    const { data: factions } = await db.from('factions').select();
    return { factions };
  },
});

function App() {
  const { factions } = Route.useLoaderData();
  console.log({ factions });
  const features = [
    {
      icon: <Zap />,
      title: 'Powerful Server Functions',
      description:
        'Write server-side code that seamlessly integrates with your client components. Type-safe, secure, and simple.',
    },
    {
      icon: <Server />,
      title: 'Flexible Server Side Rendering',
      description:
        'Full-document SSR, streaming, and progressive enhancement out of the box. Control exactly what renders where.',
    },
    {
      icon: <RouteIcon />,
      title: 'API Routes',
      description:
        'Build type-safe API endpoints alongside your application. No separate backend needed.',
    },
    {
      icon: <Shield />,
      title: 'Strongly Typed Everything',
      description:
        'End-to-end type safety from server to client. Catch errors before they reach production.',
    },
    {
      icon: <Waves />,
      title: 'Full Streaming Support',
      description:
        'Stream data from server to client progressively. Perfect for AI applications and real-time updates.',
    },
    {
      icon: <Sparkles />,
      title: 'Next Generation Ready',
      description:
        'Built from the ground up for modern web applications. Deploy anywhere JavaScript runs.',
    },
  ];

  return (
    <div>
      <section>
        <h1>
          <span>TANSTACK</span> <span>START</span>
        </h1>
        <p>The framework for next generation AI applications</p>
        <p>
          Full-stack framework powered by TanStack Router for React and Solid. Build modern
          applications with server functions, streaming, and type safety.
        </p>
        <div>
          <a href="https://tanstack.com/start" target="_blank" rel="noopener noreferrer">
            Documentation
          </a>
          <p>
            Begin your TanStack Start journey by editing <code>/src/routes/index.tsx</code>
          </p>
        </div>
      </section>

      <section>
        <div>
          {features.map((feature) => (
            <div key={feature.title}>
              <div>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
