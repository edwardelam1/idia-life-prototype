import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { useProfile, USAddress } from '@/hooks/useProfile';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI'
];

// US phone: (XXX) XXX-XXXX or XXX-XXX-XXXX or 10 digits
const US_PHONE_REGEX = /^(\+1\s?)?(\(\d{3}\)|\d{3})[\s\-.]?\d{3}[\s\-.]?\d{4}$/;
// ZIP: 5 digits or 5+4
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  age: z.number().min(13, 'Must be at least 13 years old').max(120, 'Invalid age').optional(),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phone_number: z.string()
    .optional()
    .refine(val => !val || US_PHONE_REGEX.test(val), {
      message: 'Enter a valid US phone number, e.g. (555) 123-4567'
    }),
  street1: z.string().max(100).optional(),
  street2: z.string().max(100).optional(),
  city: z.string().max(60).optional(),
  state: z.string().optional(),
  zip: z.string()
    .optional()
    .refine(val => !val || US_ZIP_REGEX.test(val), {
      message: 'Enter a valid ZIP code, e.g. 90210 or 90210-1234'
    }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

/** Format a raw digit string into (XXX) XXX-XXXX */
function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Basic USPS-style address validation */
function validateUSPSAddress(street1?: string, city?: string, state?: string, zip?: string): { valid: boolean; message: string } {
  if (!street1 && !city && !state && !zip) return { valid: true, message: '' };

  const missing: string[] = [];
  if (!street1?.trim()) missing.push('Street Address');
  if (!city?.trim()) missing.push('City');
  if (!state) missing.push('State');
  if (!zip?.trim()) missing.push('ZIP Code');

  if (missing.length > 0) {
    return { valid: false, message: `Missing required fields: ${missing.join(', ')}` };
  }

  // USPS format checks
  if (street1 && !/^\d+\s+/i.test(street1.trim())) {
    return { valid: false, message: 'Street address should start with a street number (e.g. 123 Main St)' };
  }

  if (zip && !US_ZIP_REGEX.test(zip)) {
    return { valid: false, message: 'Invalid ZIP code format' };
  }

  return { valid: true, message: 'Address looks valid per USPS format' };
}

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
  const [addressValidation, setAddressValidation] = useState<{ valid: boolean; message: string }>({ valid: true, message: '' });

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

  const watchedStreet1 = watch('street1');
  const watchedCity = watch('city');
  const watchedState = watch('state');
  const watchedZip = watch('zip');

  // Validate address on field changes
  useEffect(() => {
    const result = validateUSPSAddress(watchedStreet1, watchedCity, watchedState, watchedZip);
    setAddressValidation(result);
  }, [watchedStreet1, watchedCity, watchedState, watchedZip]);

  useEffect(() => {
    if (profile) {
      setValue('first_name', profile.first_name || '');
      setValue('last_name', profile.last_name || '');
      setValue('middle_name', profile.middle_name || '');
      setValue('suffix', profile.suffix || '');
      setValue('age', profile.age || undefined);
      setValue('gender', profile.gender || '');
      setValue('occupation', profile.occupation || '');
      setValue('bio', profile.bio || '');
      setValue('phone_number', profile.phone_number || '');

      const addr = profile.full_legal_address as USAddress | null;
      if (addr) {
        setValue('street1', addr.street1 || '');
        setValue('street2', addr.street2 || '');
        setValue('city', addr.city || '');
        setValue('state', addr.state || '');
        setValue('zip', addr.zip || '');
      }

      setInterests(profile.interests || []);
      setHealthGoals(profile.health_goals || []);
      setActivityPreferences(profile.activity_preferences || []);
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    const { street1, street2, city, state, zip, phone_number, ...rest } = data;

    // Build address object only if any field is filled
    const hasAddress = street1 || city || state || zip;
    const full_legal_address: USAddress | null = hasAddress ? {
      street1: street1 || '',
      street2: street2 || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
    } : null;

    await updateProfile({
      ...rest,
      phone_number: phone_number || null,
      full_legal_address,
      interests,
      health_goals: healthGoals,
      activity_preferences: activityPreferences
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatUSPhone(e.target.value);
    setValue('phone_number', formatted, { shouldValidate: true });
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
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" {...register('first_name')} className="w-full" />
          {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
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
          <Label htmlFor="age">Age</Label>
          <Input id="age" type="number" {...register('age', { valueAsNumber: true })} className="w-full" />
          {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
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

        {/* Phone Number — US Format */}
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="phone_number">Phone Number</Label>
          <Input
            id="phone_number"
            {...register('phone_number')}
            onChange={handlePhoneChange}
            placeholder="(555) 123-4567"
            className="w-full"
            maxLength={14}
          />
          {errors.phone_number && <p className="text-sm text-destructive">{errors.phone_number.message}</p>}
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="occupation">Occupation</Label>
          <Input id="occupation" {...register('occupation')} className="w-full" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" {...register('bio')} placeholder="Tell us about yourself..." className="w-full" rows={3} />
          {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
        </div>
      </div>

      {/* Mailing Address — USPS Format */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Mailing Address</Label>
          {addressValidation.message && (
            <div className={`flex items-center gap-1 text-xs ${addressValidation.valid ? 'text-green-600' : 'text-amber-600'}`}>
              {addressValidation.valid
                ? <CheckCircle className="w-3.5 h-3.5" />
                : <AlertCircle className="w-3.5 h-3.5" />
              }
              <span>{addressValidation.message}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street1">Street Address Line 1</Label>
            <Input
              id="street1"
              {...register('street1')}
              placeholder="123 Main Street"
              className="w-full"
              maxLength={100}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="street2">Street Address Line 2</Label>
            <Input
              id="street2"
              {...register('street2')}
              placeholder="Apt, Suite, Unit, etc. (optional)"
              className="w-full"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="City"
              className="w-full"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Select onValueChange={(value) => setValue('state', value)} defaultValue={
              (profile?.full_legal_address as USAddress | null)?.state || undefined
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map(st => (
                  <SelectItem key={st} value={st}>{st}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              {...register('zip')}
              placeholder="90210"
              className="w-full"
              maxLength={10}
            />
            {errors.zip && <p className="text-sm text-destructive">{errors.zip.message}</p>}
          </div>
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