import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, CalendarIcon, Lock, Unlock, AlertTriangle, KeyRound, Shield, Fingerprint, Download, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { useSecureProfile, SecurePII } from '@/hooks/useSecureProfile';
import { useWallet } from '@/hooks/useWallet';
import { useSovereignWallet } from '@/hooks/useSovereignWallet';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';
import { US_STATES, formatPhoneNumber } from '@/utils/usAddressValidation';
import { useToast } from '@/hooks/use-toast';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  date_of_birth: z.date({ required_error: 'Date of birth is required' }),
  gender: z.string().optional(),
  phone_number: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be in (XXX) XXX-XXXX format'),
  email: z.string().email('Invalid email address'),
  street1: z.string().min(1, 'Street address is required').max(100),
  street2: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required').max(50),
  state: z.string().min(2, 'State is required'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'ZIP must be XXXXX or XXXXX-XXXX'),
  occupation: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const INTEREST_OPTIONS = [
  'Fitness', 'Running', 'Cycling', 'Swimming', 'Yoga', 'Meditation',
  'Nutrition', 'Weight Loss', 'Strength Training', 'Cardio',
  'Mental Health', 'Sleep', 'Stress Management', 'Hiking',
  'Sports', 'Dancing', 'Rock Climbing', 'Martial Arts'
];

const HEALTH_GOAL_OPTIONS = [
  'Weight Loss', 'Weight Gain', 'Muscle Building', 'Endurance',
  'Flexibility', 'Balance', 'Heart Health', 'Blood Pressure',
  'Cholesterol', 'Diabetes Management', 'Mental Wellbeing',
  'Better Sleep', 'Stress Reduction', 'Recovery', 'Performance'
];

const ACTIVITY_PREFERENCE_OPTIONS = [
  'Morning Workouts', 'Evening Workouts', 'Indoor Activities', 'Outdoor Activities',
  'Group Activities', 'Solo Activities', 'High Intensity', 'Low Intensity',
  'Short Sessions', 'Long Sessions', 'Daily Movement', 'Weekend Warrior'
];

export function ProfileSettings() {
  const { profile, loading: profileLoading, updating, updateProfile } = useProfile();
  const { pii, loading: piiLoading, saving: piiSaving, save: savePII } = useSecureProfile();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRevealRecoveryPhrase = async () => {
    console.log("[START] Recovery Phrase Reveal");
    const confirmed = window.confirm(
      "Reveal your recovery phrase?\n\nAnyone with these 12 words controls your vault. Only proceed in a private location.",
    );
    if (!confirmed) {
      console.log("[END] Recovery Phrase Reveal: cancelled");
      return;
    }
    console.log("[END] Recovery Phrase Reveal: navigating to view");
    navigate("/recovery-phrase?mode=view");
  };

  const [locked, setLocked] = useState(true);
  const [newInterest, setNewInterest] = useState('');
  const [newHealthGoal, setNewHealthGoal] = useState('');
  const [newActivityPref, setNewActivityPref] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema)
  });

  const [interests, setInterests] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [activityPreferences, setActivityPreferences] = useState<string[]>([]);

  const phoneValue = watch('phone_number') || '';
  const dobValue = watch('date_of_birth');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phone_number', formatted, { shouldValidate: true });
  };

  // Hydrate form from Secure Enclave PII + Supabase profile
  useEffect(() => {
    if (pii) {
      setValue('first_name', pii.first_name || '');
      setValue('last_name', pii.last_name || '');
      setValue('email', pii.email || '');
      // Convert enclave phone format (xxx-xxx-xxxx) to form format ((xxx) xxx-xxxx)
      if (pii.phone) {
        const digits = pii.phone.replace(/\D/g, '');
        if (digits.length === 10) {
          setValue('phone_number', `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`);
        } else {
          setValue('phone_number', pii.phone);
        }
      }
    }
  }, [pii, setValue]);

  useEffect(() => {
    if (profile) {
      // Only set non-PII fields from profile (PII comes from enclave above)
      setValue('middle_name', profile.middle_name || '');
      setValue('suffix', profile.suffix || '');
      if (profile.date_of_birth) {
        const parsed = new Date(profile.date_of_birth);
        if (isValid(parsed)) setValue('date_of_birth', parsed);
      }
      setValue('gender', profile.gender || '');
      setValue('street1', profile.full_legal_address?.street1 || '');
      setValue('street2', profile.full_legal_address?.street2 || '');
      setValue('city', profile.full_legal_address?.city || '');
      setValue('state', profile.full_legal_address?.state || '');
      setValue('zip', profile.full_legal_address?.zip || '');
      setValue('occupation', profile.occupation || '');
      setValue('bio', profile.bio || '');
      setInterests(profile.interests || []);
      setHealthGoals(profile.health_goals || []);
      setActivityPreferences(profile.activity_preferences || []);
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    const { street1, street2, city, state, zip, phone_number, date_of_birth, first_name, last_name, email: formEmail, ...rest } = data;

    // 1. Save PII fields to Secure Enclave (never to backend)
    const digits = phone_number.replace(/\D/g, '');
    const enclavePhone = `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
    
    const piiData: SecurePII = {
      first_name,
      last_name,
      email: formEmail,
      phone: enclavePhone,
    };
    await savePII(piiData); // Also syncs to auth.users.user_metadata via the hook

    // 2. Save non-PII fields to Supabase profile
    await updateProfile({
      ...rest,
      date_of_birth: format(date_of_birth, 'yyyy-MM-dd'),
      phone_number: undefined, // NEVER send phone to backend
      full_legal_address: { street1, street2: street2 || '', city, state, zip },
      interests,
      health_goals: healthGoals,
      activity_preferences: activityPreferences,
    } as any);

    toast({
      title: 'Profile Saved',
      description: 'PII updated in your device\'s Secure Enclave. Non-PII preferences saved.',
    });

    setLocked(true);
  };

  const addItem = (item: string, setter: React.Dispatch<React.SetStateAction<string[]>>, resetValue: React.Dispatch<React.SetStateAction<string>>) => {
    if (item.trim()) {
      setter(prev => [...prev, item.trim()]);
      resetValue('');
    }
  };

  const removeItem = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const loading = profileLoading || piiLoading;

  if (loading) {
    return <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-muted rounded"></div>
      <div className="h-10 bg-muted rounded"></div>
      <div className="h-20 bg-muted rounded"></div>
    </div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Lock/Unlock toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {locked ? (
            <Lock className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Unlock className="w-4 h-4 text-primary" />
          )}
          <span className="text-sm text-muted-foreground">
            {locked ? 'Profile is locked — tap to edit' : 'Editing — changes save to Secure Enclave'}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setLocked(!locked)}
        >
          {locked ? 'Unlock' : 'Lock'}
        </Button>
      </div>

      {/* Legal Disclaimer */}
      <div className="flex items-start gap-2 bg-destructive/5 border border-destructive/20 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">Legal Notice:</strong> You must provide truthful and accurate information. 
          If any information is found to be fraudulent, IDIA reserves the right to take all actions 
          permitted by law, up to and including permanent account termination and referral to 
          appropriate authorities.
        </span>
      </div>

      {/* Basic Information — PII fields from Secure Enclave */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input id="first_name" {...register('first_name')} className="w-full" disabled={locked} />
          {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input id="last_name" {...register('last_name')} className="w-full" disabled={locked} />
          {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input id="middle_name" {...register('middle_name')} className="w-full" placeholder="Optional" disabled={locked} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suffix">Suffix</Label>
          <Input id="suffix" {...register('suffix')} className="w-full" placeholder="Jr., Sr., III, etc." disabled={locked} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" type="email" {...register('email')} className="w-full" disabled={locked} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                disabled={locked}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dobValue && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dobValue ? format(dobValue, "MM/dd/yyyy") : <span>MM/DD/YYYY</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dobValue}
                onSelect={(date) => date && setValue('date_of_birth', date, { shouldValidate: true })}
                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
                captionLayout="dropdown"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
          {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select onValueChange={(value) => setValue('gender', value)} defaultValue={profile?.gender || undefined} disabled={locked}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="non-binary">Non-binary</SelectItem>
              <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone Number *</Label>
          <Input
            id="phone_number"
            type="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className="w-full"
            maxLength={14}
            disabled={locked}
          />
          {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
        </div>
      </div>

      {/* US Address */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Mailing Address</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street1">Street Address Line 1</Label>
            <Input id="street1" {...register('street1')} placeholder="123 Main St" className="w-full" disabled={locked} />
            {errors.street1 && <p className="text-sm text-destructive">{errors.street1.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street2">Street Address Line 2</Label>
            <Input id="street2" {...register('street2')} placeholder="Apt, Suite, Unit (optional)" className="w-full" disabled={locked} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} className="w-full" disabled={locked} />
            {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select onValueChange={(value) => setValue('state', value, { shouldValidate: true })} defaultValue={profile?.full_legal_address?.state || undefined} disabled={locked}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {US_STATES.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input id="zip" {...register('zip')} placeholder="12345" className="w-full" maxLength={10} disabled={locked} />
            {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
          </div>
        </div>
      </div>

      {/* Occupation & Bio */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input id="occupation" {...register('occupation')} className="w-full" disabled={locked} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" {...register('bio')} placeholder="Tell us about yourself..." className="w-full" rows={3} disabled={locked} />
          {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label>Interests</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewInterest} value={newInterest} disabled={locked}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add an interest" />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_OPTIONS.filter(option => !interests.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newInterest, setInterests, setNewInterest)} disabled={!newInterest || locked}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {interest}
              {!locked && <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setInterests)} />}
            </Badge>
          ))}
        </div>
      </div>

      {/* Health Goals */}
      <div className="space-y-3">
        <Label>Health Goals</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewHealthGoal} value={newHealthGoal} disabled={locked}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add a health goal" />
            </SelectTrigger>
            <SelectContent>
              {HEALTH_GOAL_OPTIONS.filter(option => !healthGoals.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newHealthGoal, setHealthGoals, setNewHealthGoal)} disabled={!newHealthGoal || locked}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {healthGoals.map((goal, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {goal}
              {!locked && <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setHealthGoals)} />}
            </Badge>
          ))}
        </div>
      </div>

      {/* Activity Preferences */}
      <div className="space-y-3">
        <Label>Activity Preferences</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewActivityPref} value={newActivityPref} disabled={locked}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add activity preference" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_PREFERENCE_OPTIONS.filter(option => !activityPreferences.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newActivityPref, setActivityPreferences, setNewActivityPref)} disabled={!newActivityPref || locked}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activityPreferences.map((pref, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {pref}
              {!locked && <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setActivityPreferences)} />}
            </Badge>
          ))}
        </div>
      </div>

      {/* Vault Security */}
      <div className="space-y-3 pt-4 border-t border-border">
        <Label className="text-base font-semibold flex items-center gap-2">
          <KeyRound className="w-4 h-4" /> Vault Security
        </Label>
        <p className="text-xs text-muted-foreground">
          Your 12-word recovery phrase is the only way to restore your vault. Reveal it only in a private location.
        </p>
        <Button type="button" variant="outline" className="w-full" onClick={handleRevealRecoveryPhrase}>
          <KeyRound className="w-4 h-4 mr-2" />
          View / Download Recovery Phrase
        </Button>
      </div>

      {!locked && (
        <div className="flex justify-end">
          <Button type="submit" disabled={updating || piiSaving}>
            {updating || piiSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </form>
  );
}
