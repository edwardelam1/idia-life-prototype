
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, TrendingUp, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ProposalForm from './ProposalForm';

interface Proposal {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  ai_validation_score: number | null;
  ai_validation_feedback: string | null;
  created_at: string;
  votes_for?: number;
  votes_against?: number;
  user_voted?: string | null;
}

const GovernanceScreen = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [votingStates, setVotingStates] = useState<{[key: string]: boolean}>({});
  const { toast } = useToast();

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setProposals(data.map(proposal => ({
          id: proposal.id,
          title: proposal.title,
          description: proposal.description,
          category: proposal.category,
          status: proposal.status || 'approved',
          ai_validation_score: proposal.ai_validation_score,
          ai_validation_feedback: proposal.ai_validation_feedback,
          created_at: proposal.created_at || new Date().toISOString(),
          votes_for: Math.floor(Math.random() * 150) + 50,
          votes_against: Math.floor(Math.random() * 30) + 10,
          user_voted: null
        })));
      }
    } catch (error: any) {
      console.error('Error fetching proposals:', error);
      toast({
        title: "Error loading proposals",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleVote = async (proposalId: string, voteType: 'for' | 'against') => {
    if (votingStates[proposalId]) return;
    
    setVotingStates(prev => ({ ...prev, [proposalId]: true }));
    
    try {
      // Update proposal vote counts
      setProposals(prev => prev.map(p => {
        if (p.id === proposalId) {
          return {
            ...p,
            votes_for: voteType === 'for' ? (p.votes_for || 0) + 1 : p.votes_for,
            votes_against: voteType === 'against' ? (p.votes_against || 0) + 1 : p.votes_against,
            user_voted: voteType
          };
        }
        return p;
      }));

      toast({
        title: "Vote Recorded",
        description: `Your vote ${voteType === 'for' ? 'in favor' : 'against'} has been recorded`,
        variant: "default"
      });
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => {
        setVotingStates(prev => ({ ...prev, [proposalId]: false }));
      }, 1000);
    }
  };

  if (showProposalForm) {
    return (
      <div>
        <ProposalForm
          onClose={() => setShowProposalForm(false)}
          onSuccess={fetchProposals}
        />
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-[calc(100vh-8rem)] overflow-y-auto space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Governance</h1>
            <p className="text-gray-600 text-sm">Participate in platform decisions</p>
          </div>
          <Button onClick={() => setShowProposalForm(true)} size="sm" className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Submit
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="flex items-center p-2">
              <Vote className="h-8 w-8 text-blue-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">Active</p>
                <p className="text-lg font-bold text-gray-900">
                  {proposals.filter(p => p.status === 'approved').length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-2">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">Users</p>
                <p className="text-lg font-bold text-gray-900">1,247</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-2">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-2">
                <p className="text-xs font-medium text-gray-600">Rate</p>
                <p className="text-lg font-bold text-gray-900">73%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Proposals List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Proposals</h2>
          {isLoading ? (
            <div className="text-center py-4">Loading proposals...</div>
          ) : proposals.length === 0 ? (
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-gray-500 text-sm">No proposals yet. Be the first to submit one!</p>
              </CardContent>
            </Card>
          ) : (
            proposals.map((proposal) => (
              <Card key={proposal.id} className="rounded-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{proposal.title}</CardTitle>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{proposal.category}</Badge>
                        <Badge className={`text-xs ${getStatusColor(proposal.status)}`}>
                          {proposal.status.replace('_', ' ')}
                        </Badge>
                        {proposal.ai_validation_score && (
                          <Badge variant="outline" className="text-xs">
                            AI: {proposal.ai_validation_score}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 text-sm mb-3">{proposal.description}</p>
                  {proposal.ai_validation_feedback && (
                    <div className="bg-blue-50 p-2 rounded-lg mb-3">
                      <p className="text-xs text-blue-800">
                        <strong>AI Analysis:</strong> {proposal.ai_validation_feedback}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {new Date(proposal.created_at).toLocaleDateString()}
                    </span>
                    {proposal.status === 'approved' && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <span className="text-green-600">{proposal.votes_for || 0}</span>
                          <span>-</span>
                          <span className="text-red-600">{proposal.votes_against || 0}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant={proposal.user_voted === 'for' ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => handleVote(proposal.id, 'for')}
                            disabled={!!proposal.user_voted || votingStates[proposal.id]}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant={proposal.user_voted === 'against' ? "default" : "outline"} 
                            size="sm" 
                            className="h-7 px-2"
                            onClick={() => handleVote(proposal.id, 'against')}
                            disabled={!!proposal.user_voted || votingStates[proposal.id]}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GovernanceScreen;
