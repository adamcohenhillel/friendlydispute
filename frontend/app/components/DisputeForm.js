'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseEther, encodeFunctionData } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { DISPUTE_ESCROW_ADDRESS } from '../config';
import DisputeEscrowABI from '../contracts/DisputeEscrow.json';

export default function DisputeForm({ user, setLoading }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  
  const { ready, authenticated, user: privyUser, sendTransaction } = usePrivy();
  const { address: connectedAddress } = useAccount();

  useEffect(() => {
    if (privyUser?.wallet?.address) {
      console.log('Active wallet:', {
        address: privyUser.wallet.address,
        chainId: privyUser.wallet.chainId,
      });
    }
  }, [privyUser]);

  useEffect(() => {
    console.log('Connected wagmi address:', connectedAddress);
  }, [connectedAddress]);

  useEffect(() => {
    console.log('Contract address:', DISPUTE_ESCROW_ADDRESS);
  }, []);
  
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!authenticated || !privyUser?.wallet) {
        setError('Please login first');
        setLoading(false);
        return;
      }

      console.log('Attempting to create dispute with:', {
        address: DISPUTE_ESCROW_ADDRESS,
        value: amount,
        description,
        wallet: privyUser.wallet.address,
      });

      const value = parseEther(amount);

      // Encode the function call
      const createDisputeFunction = DisputeEscrowABI.find(x => x.name === 'createDispute' && x.type === 'function');
      if (!createDisputeFunction) {
        throw new Error('Create dispute function not found in ABI');
      }

      const data = encodeFunctionData({
        abi: DisputeEscrowABI,
        functionName: 'createDispute',
        args: [],
      });
      
      const tx = await sendTransaction({
        to: DISPUTE_ESCROW_ADDRESS,
        value: value.toString(),
        data,
      });

      console.log('Transaction sent:', tx);
      setLoading(false);
    } catch (error) {
      console.error('Error creating dispute:', error);
      setError(error.message || 'Failed to create dispute');
      setLoading(false);
    }
  };

  if (isSuccess) {
    router.push('/disputes');
  }

  if (writeError) {
    console.error('Contract write error:', writeError);
  }

  if (!ready) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Create New Dispute
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>
              Enter the dispute details and deposit amount. The other party will
              need to match your deposit.
            </p>
          </div>
          {!privyUser?.wallet ? (
            <div className="mt-4 text-sm text-yellow-600">
              Waiting for wallet to be ready...
              {authenticated && <p>Authenticated but wallet not ready yet</p>}
            </div>
          ) : (
            <div className="mt-4 text-sm text-green-600">
              <p>Wallet connected: {privyUser.wallet.address}</p>
              <p>Contract address: {DISPUTE_ESCROW_ADDRESS}</p>
            </div>
          )}
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-5 space-y-6">
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Deposit Amount (ETH)
              </label>
              <div className="mt-1">
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  id="amount"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700"
              >
                Case Description
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Describe your side of the dispute..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isConfirming || !privyUser?.wallet}
                className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  (isConfirming || !privyUser?.wallet) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isConfirming ? 'Creating...' : 'Create Dispute'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 