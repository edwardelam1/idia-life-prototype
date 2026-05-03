import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Mail, Clock } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';

export function NotificationSettings() {
  const { preferences, updatePreferences } = useProfile();

  const Row = ({ id, title, desc, checked, onChange, disabled }: { id?: string; title: string; desc: string; checked?: boolean; onChange?: (v: boolean) => void; disabled?: boolean }) => (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5 min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">{title}</Label>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} defaultChecked={checked === undefined ? undefined : undefined} />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Push Notifications */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Push Notifications</h3>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label htmlFor="push-notifications" className="text-sm font-medium">Enable Push Notifications</Label>
            <p className="text-xs text-muted-foreground">Important updates and reminders</p>
          </div>
          <Switch
            id="push-notifications"
            checked={preferences?.push_notifications || false}
            onCheckedChange={(v) => updatePreferences({ push_notifications: v })}
          />
        </div>

        {preferences?.push_notifications && (
          <div className="space-y-3 pl-3 border-l-2 border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm font-medium">Activity Reminders</Label>
                <p className="text-xs text-muted-foreground">Stay active throughout the day</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm font-medium">Goal Achievements</Label>
                <p className="text-xs text-muted-foreground">Celebrate when you reach goals</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm font-medium">Weekly Reports</Label>
                <p className="text-xs text-muted-foreground">Summary of your weekly progress</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <Label className="text-sm font-medium">Data Insights</Label>
                <p className="text-xs text-muted-foreground">Personalized health insights</p>
              </div>
              <Switch />
            </div>
          </div>
        )}
      </section>

      {/* Notification Timing */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Notification Timing</h3>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Quiet Hours Start</Label>
            <Select defaultValue="22:00">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return <SelectItem key={i} value={`${hour}:00`}>{hour}:00</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Quiet Hours End</Label>
            <Select defaultValue="08:00">
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return <SelectItem key={i} value={`${hour}:00`}>{hour}:00</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Reminder Frequency</Label>
          <Select defaultValue="daily">
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Email Notifications */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Email Notifications</h3>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-sm font-medium">Security Alerts</Label>
            <p className="text-xs text-muted-foreground">Security updates and login alerts</p>
          </div>
          <Switch defaultChecked disabled />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-sm font-medium">Product Updates</Label>
            <p className="text-xs text-muted-foreground">New features and announcements</p>
          </div>
          <Switch defaultChecked />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-sm font-medium">Health Tips</Label>
            <p className="text-xs text-muted-foreground">Weekly tips and wellness advice</p>
          </div>
          <Switch />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <Label className="text-sm font-medium">Monthly Reports</Label>
            <p className="text-xs text-muted-foreground">Detailed monthly reports</p>
          </div>
          <Switch defaultChecked />
        </div>
      </section>
    </div>
  );
}
