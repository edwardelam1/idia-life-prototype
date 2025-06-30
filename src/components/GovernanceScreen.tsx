
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Users, 
  TrendingUp,
  ArrowRight,
  Vote,
  Target
} from 'lucide-react';

const GovernanceScreen = () => {
  const [selectedVote, setSelectedVote] = useState<{[key: number]: string}>({});

  const userVotingPower = {
    total: 15,
    trustScore: 847,
    dataContribution: 8,
    loyaltyBonus: 2
  };

  const proposals = [
    {
      id: 1,
      title: 'Expand Data Privacy Standards',
      description: 'Implement stricter data anonymization protocols and require explicit consent for all data sharing partnerships.',
      category: 'Privacy',
      status: 'active',
      endDate: '2024-07-15',
      totalVotes: 12847,
      yesVotes: 8934,
      noVotes: 3913,
      requiredQuorum: 10000,
      impact: 'High',
      proposer: 'Privacy Committee'
    },
    {
      id: 2,
      title: 'Increase Community Fund Allocation',
      description: 'Raise the percentage of revenue allocated to community programs from 5% to 8% to support more local initiatives.',
      category: 'Community',
      status: 'active',
      endDate: '2024-07-20',
      totalVotes: 9234,
      yesVotes: 6145,
      noVotes: 3089,
      requiredQuorum: 8000,
      impact: 'Medium',
      proposer: 'Community Council'
    },
    {
      id: 3,
      title: 'New Merchant Category: Healthcare',
      description: 'Add healthcare providers to the IDIA Pay merchant network with special incentives for health and wellness spending.',
      category: 'Platform',
      status: 'pending',
      endDate: '2024-07-25',
      totalVotes: 2156,
      yesVotes: 1689,
      noVotes: 467,
      requiredQuorum: 5000,
      impact: 'Medium',
      proposer: 'Platform Team'
    },
    {
      id: 4,
      title: 'Trust Score Algorithm Update',
      description: 'Adjust the IDIA Trust Score algorithm to give more weight to verified good deeds and community participation.',
      category: 'Trust',
      status: 'passed',
      endDate: '2024-06-30',
      totalVotes: 15623,
      yesVotes: 11247,
      noVotes: 4376,
      requiredQuorum: 12000,
      impact: 'High',
      proposer: 'Trust Committee'
    }
  ];

  const handleVote = (proposalId: number, vote: string) => {
    setSelectedVote(prev => ({ ...prev, [proposalId]: vote }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'passed': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const calculateProgress = (votes: number, quorum: number) => {
    return Math.min((votes / quorum) * 100, 100);
  };

  const getVotePercentage = (votes: number, total: number) => {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  return (
    <div className="p-4 space-y-6">
      {/* Voting Power Card */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 mb-1">Your Voting Power</p>
              <p className="text-3xl font-bold">{userVotingPower.total} votes</p>
              <div className="text-sm text-indigo-100 mt-2 space-y-1">
                <p>Trust Score Bonus: +{userVotingPower.trustScore > 800 ? 5 : 3} votes</p>
                <p>Data Contribution: +{userVotingPower.dataContribution} votes</p>
                <p>Loyalty Bonus: +{userVotingPower.loyaltyBonus} votes</p>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Vote className="w-8 h-8" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Proposals */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Governance Proposals</h2>
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>4 Active</span>
          </Badge>
        </div>

        <div className="space-y-4">
          {proposals.map((proposal) => (
            <Card key={proposal.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CardTitle className="text-lg">{proposal.title}</CardTitle>
                      <Badge className={getStatusColor(proposal.status)}>
                        {proposal.status}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <Badge variant="outline">{proposal.category}</Badge>
                      <span className={`font-medium ${getImpactColor(proposal.impact)}`}>
                        {proposal.impact} Impact
                      </span>
                      <span>Ends {proposal.endDate}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600">{proposal.description}</p>
                
                <div className="text-sm text-gray-500">
                  Proposed by {proposal.proposer}
                </div>

                {/* Voting Progress */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Participation</span>
                    <span className="text-gray-600">
                      {proposal.totalVotes.toLocaleString()} / {proposal.requiredQuorum.toLocaleString()} required
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${calculateProgress(proposal.totalVotes, proposal.requiredQuorum)}%` }}
                    />
                  </div>

                  {proposal.totalVotes >= proposal.requiredQuorum && (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Yes</span>
                        </div>
                        <p className="text-lg font-bold text-green-800">
                          {getVotePercentage(proposal.yesVotes, proposal.totalVotes)}%
                        </p>
                        <p className="text-xs text-green-600">
                          {proposal.yesVotes.toLocaleString()} votes
                        </p>
                      </div>
                      
                      <div className="bg-red-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2 mb-1">
                          <XCircle className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-800">No</span>
                        </div>
                        <p className="text-lg font-bold text-red-800">
                          {getVotePercentage(proposal.noVotes, proposal.totalVotes)}%
                        </p>
                        <p className="text-xs text-red-600">
                          {proposal.noVotes.toLocaleString()} votes
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voting Buttons */}
                {proposal.status === 'active' && (
                  <div className="flex space-x-3 pt-2">
                    <Button 
                      className={`flex-1 ${
                        selectedVote[proposal.id] === 'yes' 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-green-500 hover:bg-green-600'
                      }`}
                      onClick={() => handleVote(proposal.id, 'yes')}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Vote Yes
                    </Button>
                    <Button 
                      variant="outline"
                      className={`flex-1 border-red-200 text-red-600 hover:bg-red-50 ${
                        selectedVote[proposal.id] === 'no' 
                          ? 'bg-red-50 border-red-300' 
                          : ''
                      }`}
                      onClick={() => handleVote(proposal.id, 'no')}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Vote No
                    </Button>
                  </div>
                )}

                {proposal.status === 'passed' && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-800">Proposal Passed</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Implementation begins next quarter
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Delegation Option */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-purple-600" />
            <span>Vote Delegation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Delegate your voting power to a trusted friend who shares your values. 
            You can revoke delegation at any time.
          </p>
          <Button variant="outline" className="w-full">
            <ArrowRight className="w-4 h-4 mr-2" />
            Delegate Votes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default GovernanceScreen;
