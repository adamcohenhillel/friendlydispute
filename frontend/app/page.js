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
import { Menu, Transition } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { UserCircleIcon, SparklesIcon, ScaleIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { DISPUTE_ESCROW_ADDRESS } from './config';
import DisputeEscrowABI from './contracts/DisputeEscrow.json';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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

function Header() {
  const { authenticated, user, logout, login } = usePrivy();
  const searchParams = useSearchParams();
  const currentPage = searchParams.get('page');

  const navigation = [
    { name: 'Home', href: '/', current: !currentPage },
    { name: 'My Disputes', href: '?page=disputes', current: currentPage === 'disputes' },
  ];

  return (
    <div className="sticky top-0 z-50 w-full">
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md border-b border-black/[0.06]"></div>
      <div className="container relative flex h-16 items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2">
          <div className="relative flex items-center">
            <div className="absolute inset-0 bg-primary/10 rounded-lg blur"></div>
            <ScaleIcon className="h-7 w-7 sm:h-8 sm:w-8 text-primary relative" />
          </div>
          <span className="font-semibold text-lg sm:text-xl">
            FriendlyDispute
          </span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <nav className="hidden sm:flex items-center gap-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`nav-link ${item.current ? 'text-foreground after:scale-x-100' : ''}`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          
          {authenticated ? (
            <div className="flex items-center gap-4">
              <Menu as="div" className="relative sm:hidden">
                <Menu.Button className="p-2 hover:bg-primary/5 rounded-lg transition-colors">
                  <Bars3Icon className="h-5 w-5" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right glass-card rounded-lg py-1">
                    {navigation.map((item) => (
                      <Menu.Item key={item.name}>
                        {({ active }) => (
                          <Link
                            href={item.href}
                            className={`block px-4 py-2 text-sm ${
                              active || item.current ? 'bg-primary/5 text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {item.name}
                          </Link>
                        )}
                      </Menu.Item>
                    ))}
                  </Menu.Items>
                </Transition>
              </Menu>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button className="relative group">
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9 ring-2 ring-black/[0.04] transition-shadow hover:ring-black/[0.08]">
                      {user?.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} />
                      ) : (
                        <AvatarFallback className="bg-primary/5 text-primary font-medium">
                          {user?.email?.address?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-64 p-3">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <h4 className="text-sm font-medium">{user?.email?.address || 'User'}</h4>
                      <div className="flex items-center text-xs text-muted-foreground gap-1.5">
                        <div className="size-1.5 rounded-full bg-primary"></div>
                        Connected with Privy
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-9 text-sm hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20"
                      onClick={() => logout()}
                    >
                      Sign out
                    </Button>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          ) : (
            <Button onClick={() => login()} className="signup-button">
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!authenticated || !privyUser?.wallet) {
        toast.error('Please login first');
        setLoading(false);
        return;
      }

      const value = parseEther(amount);
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

      toast.success('Transaction sent! Creating your dispute...');
      console.log('Transaction sent:', tx);
      setLoading(false);
    } catch (error) {
      console.error('Error creating dispute:', error);
      toast.error(error.message || 'Failed to create dispute');
      setLoading(false);
    }
  };

  if (!ready) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="feature-card">
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-8">
          <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center shrink-0">
            <SparklesIcon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold">Create New Dispute</h2>
            <p className="text-muted-foreground mt-1">
              Enter the dispute details and deposit amount. The other party will need to match your deposit.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {!privyUser?.wallet ? (
            <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
              <div className="flex items-center gap-3">
                <div className="size-2 rounded-full bg-primary animate-pulse"></div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium">Waiting for wallet...</span>
                  {authenticated && <span className="block mt-0.5 text-xs">Authenticated but wallet not ready yet</span>}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Wallet Connected</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{privyUser.wallet.address}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-primary/5 p-4 border border-primary/10">
                <div className="flex items-center gap-3">
                  <ScaleIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Smart Contract</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">{DISPUTE_ESCROW_ADDRESS}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Deposit Amount</label>
                  <div className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">ETH</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount held in escrow
                </p>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-12 pl-12 text-lg font-medium bg-transparent border-black/[0.06] focus:border-primary/20 focus:ring-primary/10"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Ξ</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Case Description</label>
                  <div className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">Required</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Be clear and factual
                </p>
              </div>
              <Textarea
                placeholder="Describe your side of the dispute..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="min-h-[120px] text-base resize-none bg-transparent border-black/[0.06] focus:border-primary/20 focus:ring-primary/10"
              />
            </div>

            <Button
              type="submit"
              className="signup-button w-full h-12 text-base font-medium"
              disabled={!privyUser?.wallet}
            >
              Create Dispute
            </Button>
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
  const { ready, authenticated, user: privyUser, sendTransaction } = usePrivy();
  const searchParams = useSearchParams();
  const joinDisputeId = searchParams.get('join');

  const client = createPublicClient({
    chain: hardhat,
    transport: http()
  });

  const handleJoinDispute = async (disputeId, amount) => {
    if (!authenticated || !privyUser?.wallet) {
      toast.error('Please login first');
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

      toast.success('Joining dispute...');
      console.log('Join transaction sent:', tx);
      await tx.wait();
      fetchDisputes();
    } catch (error) {
      console.error('Error joining dispute:', error);
      toast.error(error.message || 'Failed to join dispute');
    }
  };

  const handleSubmitCase = async (disputeId, caseData) => {
    if (!authenticated || !privyUser?.wallet) {
      toast.error('Please login first');
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

      toast.success('Submitting your case...');
      console.log('Submit case transaction sent:', tx);
      await tx.wait();
      fetchDisputes();
    } catch (error) {
      console.error('Error submitting case:', error);
      toast.error(error.message || 'Failed to submit case');
    }
  };

  const handleShare = (disputeId) => {
    const link = `${window.location.origin}/?disputeId=${disputeId}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied to clipboard!');
  };

  const handleResolveDispute = async (disputeId) => {
    if (!authenticated || !privyUser?.wallet) {
      toast.error('Please login first');
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

      toast.success('Requesting resolution...');
      console.log('Resolution request sent:', tx);
      await tx.wait();
      fetchDisputes();
    } catch (error) {
      console.error('Error requesting resolution:', error);
      toast.error(error.message || 'Failed to request resolution');
    }
  };

  const fetchDisputes = async () => {
    if (!authenticated || !privyUser?.wallet) return;
    setError(null);

    try {
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

      const disputePromises = Array.from({ length: nextDisputeId }, (_, i) =>
        client.readContract({
          address: DISPUTE_ESCROW_ADDRESS,
          abi: DisputeEscrowABI,
          functionName: 'disputes',
          args: [BigInt(i)],
        })
      );

      const disputesData = await Promise.all(disputePromises);
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
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-12 px-4">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Please login to view and manage your disputes
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-12 px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Disputes</h1>
            <p className="text-muted-foreground mt-2">
              Manage and track all your active and resolved disputes
            </p>
          </div>
        </div>

        {error && (
          <Card className="mb-8 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        )}

        <div className="space-y-6">
          {disputes.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Disputes Found</CardTitle>
                <CardDescription>
                  Create a new dispute to get started with the resolution process
                </CardDescription>
              </CardHeader>
            </Card>
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
                <Card key={dispute.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Dispute #{dispute.id}</span>
                      <span className={`text-sm px-3 py-1 rounded-full ${
                        status === 'Resolved' ? 'bg-green-100 text-green-800' :
                        status === 'Active' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {status}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Amount: {(Number(dispute.amount) / 1e18).toFixed(4)} ETH
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium mb-2">Party A's Case</h4>
                          <p className="text-sm text-muted-foreground">
                            {dispute.caseDataA || 'Not submitted yet'}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Party B's Case</h4>
                          <p className="text-sm text-muted-foreground">
                            {dispute.caseDataB || 'Not submitted yet'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    {!dispute.isResolved && (
                      <>
                        {role === 'None' ? (
                          <Button
                            onClick={() => handleJoinDispute(dispute.id, dispute.amount)}
                            variant="default"
                          >
                            Join Dispute
                          </Button>
                        ) : (
                          <>
                            {status === 'Waiting for Party B' && isPartyA && (
                              <Button
                                variant="outline"
                                onClick={() => handleShare(dispute.id)}
                              >
                                Share Link
                              </Button>
                            )}
                            {(!dispute.caseDataA && isPartyA) || (!dispute.caseDataB && isPartyB) ? (
                              <Button
                                variant="default"
                                onClick={() => handleSubmitCase(dispute.id, 'Sample case data')}
                              >
                                Submit Case
                              </Button>
                            ) : null}
                            {bothCasesSubmitted && isPartyA && !dispute.requestId && (
                              <Button
                                variant="default"
                                onClick={() => handleResolveDispute(dispute.id)}
                              >
                                Request Resolution
                              </Button>
                            )}
                            {dispute.requestId && !dispute.isResolved && (
                              <span className="text-yellow-600 text-sm">
                                Resolution in progress...
                              </span>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {dispute.isResolved && (
                      <span className="text-green-600 text-sm">
                        Winner: {dispute.winner === dispute.partyA ? 'Party A' : 'Party B'}
                      </span>
                    )}
                  </CardFooter>
                </Card>
              );
            })
          )}
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
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-primary">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background overflow-hidden">
      <Header />
      <Toaster />
      
      {isDisputesPage ? (
        <DisputesPage />
      ) : (
        <div className="container relative mx-auto py-16 sm:py-24 px-4 sm:px-6">
          {!authenticated ? (
            <div className="max-w-[1200px] mx-auto">
              <div className="absolute top-0 right-0 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] hero-glow"></div>
              <div className="absolute bottom-0 left-0 w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] hero-glow"></div>
              
              <div className="relative text-center space-y-6 mb-12 sm:mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-sm text-primary mb-6 sm:mb-8">
                  <SparklesIcon className="h-4 w-4" />
                  <span className="font-medium">AI-Powered Dispute Resolution</span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight">
                  <span className="block">Resolve Disputes</span>
                  <span className="block mt-4 bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                    With AI Arbitration
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  {disputeId ? 
                    "You've been invited to participate in a dispute resolution. Login to join." :
                    "Create a case, deposit funds, and let AI make a fair decision. Fast, unbiased, and transparent."}
                </p>
              </div>

              <div className="flex flex-col items-center gap-6 mb-24">
                <Button
                  onClick={() => login()}
                  className="signup-button h-12 px-8 text-lg"
                >
                  {disputeId ? "Join Dispute" : "Get Started"}
                </Button>
                <p className="text-sm text-muted-foreground">
                  No credit card required · Free plan available
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="feature-card">
                  <div className="mb-6">
                    <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-2">
                      <SparklesIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">AI-Powered</h3>
                    <p className="mt-2 text-muted-foreground">
                      Advanced AI technology ensures fair and unbiased dispute resolution
                    </p>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="mb-6">
                    <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-2">
                      <ScaleIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">Transparent</h3>
                    <p className="mt-2 text-muted-foreground">
                      All decisions are recorded on the blockchain for complete transparency
                    </p>
                  </div>
                </div>

                <div className="feature-card">
                  <div className="mb-6">
                    <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-2">
                      <ShieldCheckIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">Secure</h3>
                    <p className="mt-2 text-muted-foreground">
                      Your funds are safely held in escrow until the dispute is resolved
                    </p>
                  </div>
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