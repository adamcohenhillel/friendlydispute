'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DisputeForm from './DisputeForm';
import Header from './Header';

export default function ClientPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const disputeId = searchParams.get('disputeId');

  useEffect(() => {
    if (authenticated && disputeId) {
      router.push(`/disputes?join=${disputeId}`);
    }
  }, [authenticated, disputeId]);

  if (!ready) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {!authenticated ? (
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Resolve Disputes</span>
              <span className="block text-indigo-600">With AI Arbitration</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              {disputeId ? 
                "You've been invited to participate in a dispute resolution. Login to join." :
                "Create a case, deposit funds, and let AI make a fair decision. Fast, unbiased, and transparent."}
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <button
                  onClick={() => login()}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  {disputeId ? "Join Dispute" : "Get Started"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <DisputeForm user={user} setLoading={setLoading} />
        )}
      </div>
    </main>
  );
} 