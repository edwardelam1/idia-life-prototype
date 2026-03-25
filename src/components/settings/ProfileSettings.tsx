import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parse, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';
import { US_STATES, formatPhoneNumber, extractPhoneDigits } from '@/utils/usAddressValidation';

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  date_of_birth: z.date({ required_error: 'Date of birth is required' }),
  gender: z.string().optional(),
  phone_number: z.string()
    .regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Phone must be in (XXX) XXX-XXXX format'),
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
  const { profile, loading, updating, updateProfile } = useProfile();
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
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phone_number', formatted, { shouldValidate: true });
  };

  useEffect(() => {
    if (profile) {
      setValue('first_name', profile.first_name || '');
      setValue('last_name', profile.last_name || '');
      setValue('middle_name', profile.middle_name || '');
      setValue('suffix', profile.suffix || '');
      if (profile.date_of_birth) {
        const parsed = new Date(profile.date_of_birth);
        if (isValid(parsed)) setValue('date_of_birth', parsed);
      }
      setValue('gender', profile.gender || '');
      setValue('phone_number', profile.phone_number || '');
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
    const { street1, street2, city, state, zip, phone_number, date_of_birth, ...rest } = data;
    await updateProfile({
      ...rest,
      date_of_birth: format(date_of_birth, 'yyyy-MM-dd'),
      phone_number,
      full_legal_address: { street1, street2: street2 || '', city, state, zip },
      interests,
      health_goals: healthGoals,
      activity_preferences: activityPreferences
    });
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

  if (loading) {
    return <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-muted rounded"></div>
      <div className="h-10 bg-muted rounded"></div>
      <div className="h-20 bg-muted rounded"></div>
    </div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input id="first_name" {...register('first_name')} className="w-full" />
          {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input id="last_name" {...register('last_name')} className="w-full" />
          {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="middle_name">Middle Name</Label>
          <Input id="middle_name" {...register('middle_name')} className="w-full" placeholder="Optional" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="suffix">Suffix</Label>
          <Input id="suffix" {...register('suffix')} className="w-full" placeholder="Jr., Sr., III, etc." />
        </div>

        <div className="space-y-2">
          <Label>Date of Birth *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
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
                captionLayout="dropdown-buttons"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
          {errors.date_of_birth && <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select onValueChange={(value) => setValue('gender', value)} defaultValue={profile?.gender || undefined}>
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
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="phone_number">Phone Number</Label>
          <Input
            id="phone_number"
            type="tel"
            value={phoneValue}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className="w-full"
            maxLength={14}
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
            <Input id="street1" {...register('street1')} placeholder="123 Main St" className="w-full" />
            {errors.street1 && <p className="text-sm text-destructive">{errors.street1.message}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street2">Street Address Line 2</Label>
            <Input id="street2" {...register('street2')} placeholder="Apt, Suite, Unit (optional)" className="w-full" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...register('city')} className="w-full" />
            {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select onValueChange={(value) => setValue('state', value, { shouldValidate: true })} defaultValue={profile?.full_legal_address?.state || undefined}>
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
            <Input id="zip" {...register('zip')} placeholder="12345" className="w-full" maxLength={10} />
            {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
          </div>
        </div>
      </div>

      {/* Occupation & Bio */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input id="occupation" {...register('occupation')} className="w-full" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" {...register('bio')} placeholder="Tell us about yourself..." className="w-full" rows={3} />
          {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
        </div>
      </div>

      {/* Interests */}
      <div className="space-y-3">
        <Label>Interests</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewInterest} value={newInterest}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add an interest" />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_OPTIONS.filter(option => !interests.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newInterest, setInterests, setNewInterest)} disabled={!newInterest}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {interests.map((interest, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {interest}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setInterests)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Health Goals */}
      <div className="space-y-3">
        <Label>Health Goals</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewHealthGoal} value={newHealthGoal}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add a health goal" />
            </SelectTrigger>
            <SelectContent>
              {HEALTH_GOAL_OPTIONS.filter(option => !healthGoals.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newHealthGoal, setHealthGoals, setNewHealthGoal)} disabled={!newHealthGoal}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {healthGoals.map((goal, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {goal}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setHealthGoals)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* Activity Preferences */}
      <div className="space-y-3">
        <Label>Activity Preferences</Label>
        <div className="flex gap-2">
          <Select onValueChange={setNewActivityPref} value={newActivityPref}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Add activity preference" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_PREFERENCE_OPTIONS.filter(option => !activityPreferences.includes(option)).map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={() => addItem(newActivityPref, setActivityPreferences, setNewActivityPref)} disabled={!newActivityPref}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {activityPreferences.map((pref, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1">
              {pref}
              <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem(index, setActivityPreferences)} />
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={updating}>
          {updating ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
