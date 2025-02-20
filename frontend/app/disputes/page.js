'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { DISPUTE_ESCROW_ADDRESS } from '../config';
import DisputeEscrowABI from '../contracts/DisputeEscrow.json';
import Header from '../components/Header';
import { createPublicClient, http, parseEther, encodeFunctionData } from 'viem';
import { hardhat } from 'viem/chains';
import { useSearchParams } from 'next/navigation';

export default function DisputesPage() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const { ready, authenticated, user: privyUser, sendTransaction } = usePrivy();
  const searchParams = useSearchParams();
  const joinDisputeId = searchParams.get('join');

  const client = createPublicClient({
    chain: hardhat,
    transport: http()
  });

  const handleJoinDispute = async (disputeId, amount) => {
    if (!authenticated || !privyUser?.wallet) {
      setError('Please login first');
      return;
    }

    try {
      const data = encodeFunctionData({
        abi: DisputeEscrowABI,
        functionName: 'joinDispute',
        args: [BigInt(disputeId)],
      });

      const tx = await sendTransaction({
        to: DISPUTE_ESCROW_ADDRESS,
        value: amount.toString(),
        data,
      });

      console.log('Join transaction sent:', tx);
      await tx.wait();
      fetchDisputes(); // Refresh the disputes list
    } catch (error) {
      console.error('Error joining dispute:', error);
      setError(error.message || 'Failed to join dispute');
    }
  };

  const handleSubmitCase = async (disputeId, caseData) => {
    if (!authenticated || !privyUser?.wallet) {
      setError('Please login first');
      return;
    }

    try {
      const data = encodeFunctionData({
        abi: DisputeEscrowABI,
        functionName: 'submitCase',
        args: [BigInt(disputeId), caseData],
      });

      const tx = await sendTransaction({
        to: DISPUTE_ESCROW_ADDRESS,
        data,
      });

      console.log('Submit case transaction sent:', tx);
      await tx.wait();
      fetchDisputes(); // Refresh the disputes list
    } catch (error) {
      console.error('Error submitting case:', error);
      setError(error.message || 'Failed to submit case');
    }
  };

  const handleShare = (disputeId) => {
    const link = `${window.location.origin}/?disputeId=${disputeId}`;
    navigator.clipboard.writeText(link);
    setShareLink(link);
    setTimeout(() => setShareLink(null), 3000);
  };

  const handleResolveDispute = async (disputeId) => {
    if (!authenticated || !privyUser?.wallet) {
      setError('Please login first');
      return;
    }

    try {
      // Get both cases
      const dispute = disputes.find(d => d.id === disputeId);
      if (!dispute) {
        setError('Dispute not found');
        return;
      }

      // Call OpenAI to analyze the cases and determine the winner
      const response = await fetch('/api/resolve-dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          disputeId,
          caseA: dispute.caseDataA,
          caseB: dispute.caseDataB,
          partyA: dispute.partyA,
          partyB: dispute.partyB,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to resolve dispute');
      }

      // Execute the contract call with the AI's decision
      const data = encodeFunctionData({
        abi: DisputeEscrowABI,
        functionName: 'resolveDispute',
        args: [BigInt(disputeId), result.winner],
      });

      const tx = await sendTransaction({
        to: DISPUTE_ESCROW_ADDRESS,
        data,
      });

      console.log('Resolve transaction sent:', tx);
      await tx.wait();
      fetchDisputes(); // Refresh the disputes list
    } catch (error) {
      console.error('Error resolving dispute:', error);
      setError(error.message || 'Failed to resolve dispute');
    }
  };

  const fetchDisputes = async () => {
    if (!authenticated || !privyUser?.wallet) return;
    setError(null);

    try {
      // First try to read the contract to make sure it exists
      const result = await client.readContract({
        address: DISPUTE_ESCROW_ADDRESS,
        abi: DisputeEscrowABI,
        functionName: 'nextDisputeId',
      });

      const nextDisputeId = Number(result);
      console.log('Next dispute ID:', nextDisputeId);

      if (nextDisputeId === 0) {
        setDisputes([]);
        setLoading(false);
        return;
      }

      // Fetch all disputes
      const disputePromises = Array.from({ length: nextDisputeId }, (_, i) =>
        client.readContract({
          address: DISPUTE_ESCROW_ADDRESS,
          abi: DisputeEscrowABI,
          functionName: 'disputes',
          args: [BigInt(i)],
        })
      );

      const disputesData = await Promise.all(disputePromises);
      console.log('Raw disputes data:', disputesData);

      // Transform the data into a more manageable format
      const formattedDisputes = disputesData.map((dispute, index) => ({
        id: index,
        partyA: dispute[0],
        partyB: dispute[1],
        amount: dispute[2],
        caseDataA: dispute[3],
        caseDataB: dispute[4],
        isResolved: dispute[5],
        winner: dispute[6],
        createdAt: Number(dispute[7]),
        resolvedAt: Number(dispute[8])
      }));

      console.log('Formatted disputes:', formattedDisputes);
      setDisputes(formattedDisputes);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setError(error.message || 'Failed to fetch disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [authenticated, privyUser]);

  useEffect(() => {
    if (joinDisputeId && authenticated && privyUser?.wallet) {
      const dispute = disputes.find(d => d.id === Number(joinDisputeId));
      if (dispute && dispute.partyB === '0x0000000000000000000000000000000000000000') {
        handleJoinDispute(Number(joinDisputeId), dispute.amount);
      }
    }
  }, [joinDisputeId, authenticated, privyUser, disputes]);

  if (!ready || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Please login to view your disputes
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      {shareLink && (
        <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="text-sm">Link copied to clipboard!</p>
        </div>
      )}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Your Disputes</h1>
            <p className="mt-2 text-sm text-gray-700">
              A list of all disputes you're involved in as either Party A or Party B.
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}
        <div className="mt-8 flex flex-col">
          <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        ID
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Amount (ETH)
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Your Role
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Cases
                      </th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {disputes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-3 py-4 text-sm text-gray-500 text-center">
                          No disputes found. Create a new dispute to get started!
                        </td>
                      </tr>
                    ) : (
                      disputes.map((dispute) => {
                        const userAddress = privyUser?.wallet?.address?.toLowerCase();
                        const isPartyA = dispute.partyA?.toLowerCase() === userAddress;
                        const isPartyB = dispute.partyB?.toLowerCase() === userAddress;
                        const role = isPartyA ? 'Party A' : isPartyB ? 'Party B' : 'None';
                        const status = dispute.isResolved ? 'Resolved' : 
                                     dispute.partyB === '0x0000000000000000000000000000000000000000' ? 'Waiting for Party B' : 
                                     'Active';
                        const bothCasesSubmitted = dispute.caseDataA && dispute.caseDataB;

                        return (
                          <tr key={dispute.id}>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {dispute.id}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {(Number(dispute.amount) / 1e18).toFixed(4)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                status === 'Resolved' ? 'bg-green-100 text-green-800' :
                                status === 'Active' ? 'bg-blue-100 text-blue-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {role}
                            </td>
                            <td className="px-3 py-4 text-sm text-gray-500">
                              {dispute.caseDataA && <div>Party A: {dispute.caseDataA}</div>}
                              {dispute.caseDataB && <div>Party B: {dispute.caseDataB}</div>}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              <div className="space-x-2">
                                {!dispute.isResolved && (
                                  <>
                                    {role === 'None' ? (
                                      <button
                                        className="text-indigo-600 hover:text-indigo-900"
                                        onClick={() => handleJoinDispute(dispute.id, dispute.amount)}
                                      >
                                        Join Dispute
                                      </button>
                                    ) : (
                                      <>
                                        {status === 'Waiting for Party B' && isPartyA && (
                                          <button
                                            className="text-indigo-600 hover:text-indigo-900"
                                            onClick={() => handleShare(dispute.id)}
                                          >
                                            Share Link
                                          </button>
                                        )}
                                        {(!dispute.caseDataA && isPartyA) || (!dispute.caseDataB && isPartyB) ? (
                                          <button
                                            className="text-indigo-600 hover:text-indigo-900"
                                            onClick={() => handleSubmitCase(dispute.id, 'Sample case data')}
                                          >
                                            Submit Case
                                          </button>
                                        ) : null}
                                        {bothCasesSubmitted && isPartyA && (
                                          <button
                                            className="text-green-600 hover:text-green-900"
                                            onClick={() => handleResolveDispute(dispute.id)}
                                          >
                                            Resolve with AI
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </>
                                )}
                                {dispute.isResolved && (
                                  <span className="text-green-600">
                                    Winner: {dispute.winner === dispute.partyA ? 'Party A' : 'Party B'}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 