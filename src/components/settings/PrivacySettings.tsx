import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, Database, Mail, Trash2, Download } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function PrivacySettings() {
  const { preferences, updatePreferences } = useProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const exportData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: userPreferences }, { data: healthMetrics }, { data: transactions }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', user.id).single(),
        supabase.from('health_metrics').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
      ]);

      const blob = new Blob([JSON.stringify({ profile, preferences: userPreferences, healthMetrics, transactions, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-health-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: 'Data Exported', description: 'Your data has been downloaded successfully' });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({ title: 'Export Failed', description: 'Failed to export your data', variant: 'destructive' });
    }
  };

  const deleteAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      if (error) throw error;
      toast({ title: 'Account Deleted', description: 'Your account has been permanently deleted' });
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({ title: 'Deletion Failed', description: 'Failed to delete your account', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Data Sharing */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Data Sharing</h3>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="data-sharing" className="text-sm font-medium">Data Sharing Consent</Label>
            <p className="text-xs text-muted-foreground">Allow anonymized data for research and insights</p>
          </div>
          <Switch
            id="data-sharing"
            checked={preferences?.data_sharing_consent || false}
            onCheckedChange={(v) => updatePreferences({ data_sharing_consent: v })}
          />
        </div>

        <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-lg">
          <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            All shared data is anonymized and encrypted. Personal identifiers are removed before any data is used.
          </p>
        </div>
      </section>

      {/* Communication */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Communication</h3>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="marketing-emails" className="text-sm font-medium">Marketing Emails</Label>
            <p className="text-xs text-muted-foreground">New features, tips, and health insights</p>
          </div>
          <Switch
            id="marketing-emails"
            checked={preferences?.marketing_emails || false}
            onCheckedChange={(v) => updatePreferences({ marketing_emails: v })}
          />
        </div>
      </section>

      {/* Data Management */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Data Management</h3>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-medium">Export Your Data</div>
            <p className="text-xs text-muted-foreground">Download a copy of your data</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportData}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export
          </Button>
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t">
          <div className="space-y-0.5 min-w-0">
            <div className="text-sm font-medium text-destructive">Delete Account</div>
            <p className="text-xs text-muted-foreground">Permanently delete account and data</p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your account
                  and remove all your data from our servers. All health metrics, achievements,
                  and personal information will be lost forever.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={deleteAccount}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete my account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </section>
    </div>
  );
}
