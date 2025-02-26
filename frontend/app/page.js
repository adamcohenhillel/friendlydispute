'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { parseEther, encodeFunctionData, createPublicClient, http } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { WagmiProvider, createConfig } from "wagmi";
import { mainnet, sepolia, hardhat } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider } from "@privy-io/react-auth";
import { Disclosure, Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { DISPUTE_ESCROW_ADDRESS } from './config';
import DisputeEscrowABI from './contracts/DisputeEscrow.json';

// Add local Hardhat network
const hardhatChain = {
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
};

const config = createConfig({
  chains: [hardhatChain],
  transports: {
    [hardhatChain.id]: http(),
  },
});

const queryClient = new QueryClient();

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function Header() {
  const { authenticated, user, logout } = usePrivy();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page');

  const navigation = [
    { name: 'Home', href: '/', current: !currentPage },
    { name: 'My Disputes', href: '?page=disputes', current: currentPage === 'disputes' },
  ];

  return (
    <Disclosure as="nav" className="bg-white shadow">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link href="/" className="text-xl font-bold text-indigo-600">
                    FriendlyDispute
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={classNames(
                        item.current
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                        'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium'
                      )}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:items-center">
                {authenticated && (
                  <Menu as="div" className="relative ml-3">
                    <div>
                      <Menu.Button className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                        <span className="sr-only">Open user menu</span>
                        {user?.avatarUrl ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={user.avatarUrl}
                            alt=""
                          />
                        ) : (
                          <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        )}
                      </Menu.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-200"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Menu.Item>
                          {({ active }) => (
                            <div className="px-4 py-2 text-sm text-gray-700">
                              {user?.email?.address || 'User'}
                            </div>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={() => logout()}
                              className={classNames(
                                active ? 'bg-gray-100' : '',
                                'block w-full px-4 py-2 text-sm text-gray-700 text-left'
                              )}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                )}
              </div>
              <div className="-mr-2 flex items-center sm:hidden">
                <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <span className="sr-only">Open main menu</span>
                  {open ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </Disclosure.Button>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.name}
                  as={Link}
                  href={item.href}
                  className={classNames(
                    item.current
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800',
                    'block pl-3 pr-4 py-2 border-l-4 text-base font-medium'
                  )}
                >
                  {item.name}
                </Disclosure.Button>
              ))}
            </div>
            {authenticated && (
              <div className="border-t border-gray-200 pb-3 pt-4">
                <div className="flex items-center px-4">
                  {user?.avatarUrl ? (
                    <img
                      className="h-10 w-10 rounded-full"
                      src={user.avatarUrl}
                      alt=""
                    />
                  ) : (
                    <UserCircleIcon className="h-10 w-10 text-gray-400" />
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user?.email?.address || 'User'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <Disclosure.Button
                    as="button"
                    onClick={() => logout()}
                    className="block w-full px-4 py-2 text-base font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  >
                    Sign out
                  </Disclosure.Button>
                </div>
              </div>
            )}
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}

function DisputeForm({ user, setLoading }) {
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

function DisputesPage() {
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
      const data = encodeFunctionData({
        abi: DisputeEscrowABI,
        functionName: 'requestResolution',
        args: [BigInt(disputeId)],
      });

      const tx = await sendTransaction({
        to: DISPUTE_ESCROW_ADDRESS,
        data,
      });

      console.log('Resolution request sent:', tx);
      await tx.wait();
      fetchDisputes(); // Refresh the disputes list
    } catch (error) {
      console.error('Error requesting resolution:', error);
      setError(error.message || 'Failed to request resolution');
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
        resolvedAt: Number(dispute[8]),
        requestId: dispute[9],
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
                                        {bothCasesSubmitted && isPartyA && !dispute.requestId && (
                                          <button
                                            className="text-green-600 hover:text-green-900"
                                            onClick={() => handleResolveDispute(dispute.id)}
                                          >
                                            Request Resolution
                                          </button>
                                        )}
                                        {dispute.requestId && !dispute.isResolved && (
                                          <span className="text-yellow-600">
                                            Resolution in progress...
                                          </span>
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

function ClientPage() {
  const { ready, authenticated, user, login } = usePrivy();
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const disputeId = searchParams.get('disputeId');
  const isDisputesPage = searchParams.get('page') === 'disputes';

  useEffect(() => {
    if (authenticated && disputeId) {
      router.push(`?page=disputes&join=${disputeId}`);
    }
  }, [authenticated, disputeId]);

  if (!ready) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {isDisputesPage ? (
        <DisputesPage />
      ) : (
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
      )}
    </main>
  );
}

export default function App({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <PrivyProvider
          appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
          config={{
            loginMethods: ["email", "google", "apple"],
            appearance: {
              theme: "light",
              accentColor: "#676FFF",
            },
            supportedChains: [hardhatChain],
            defaultChain: hardhatChain,
            embeddedWallets: {
              createOnLogin: 'all-users',
              noPromptOnSignature: true,
            },
          }}
        >
          <ClientPage />
        </PrivyProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
} 