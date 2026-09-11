import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore } from './store';
import { useSSE } from './hooks/useSSE';
import { WorkspaceLayout } from './components/workspace/WorkspaceLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

const MainContent: React.FC = () => {
  const jobId = useStore((s) => s.jobId);

  // Subscribe to real Server-Sent Events stream when a job is active
  useSSE(jobId);

  return <WorkspaceLayout />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainContent />
    </QueryClientProvider>
  );
}
