
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Vote, Users, TrendingUp, Plus } from 'lucide-react';
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
}

const GovernanceScreen = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProposals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
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

  if (showProposalForm) {
    return (
      <div className="p-6">
        <ProposalForm
          onClose={() => setShowProposalForm(false)}
          onSuccess={fetchProposals}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governance</h1>
          <p className="text-gray-600 mt-2">Participate in platform decisions and submit proposals</p>
        </div>
        <Button onClick={() => setShowProposalForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Submit Proposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Vote className="h-12 w-12 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Proposals</p>
              <p className="text-2xl font-bold text-gray-900">
                {proposals.filter(p => p.status === 'approved').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Users className="h-12 w-12 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Participants</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-12 w-12 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Participation</p>
              <p className="text-2xl font-bold text-gray-900">73%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Proposals List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Proposals</h2>
        {isLoading ? (
          <div className="text-center py-8">Loading proposals...</div>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No proposals yet. Be the first to submit one!</p>
            </CardContent>
          </Card>
        ) : (
          proposals.map((proposal) => (
            <Card key={proposal.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{proposal.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{proposal.category}</Badge>
                      <Badge className={getStatusColor(proposal.status)}>
                        {proposal.status.replace('_', ' ')}
                      </Badge>
                      {proposal.ai_validation_score && (
                        <Badge variant="outline">
                          AI Score: {proposal.ai_validation_score}/10
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{proposal.description}</p>
                {proposal.ai_validation_feedback && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>AI Analysis:</strong> {proposal.ai_validation_feedback}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-gray-500">
                    {new Date(proposal.created_at).toLocaleDateString()}
                  </span>
                  {proposal.status === 'approved' && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Vote For</Button>
                      <Button variant="outline" size="sm">Vote Against</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default GovernanceScreen;
