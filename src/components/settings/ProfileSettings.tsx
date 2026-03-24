import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, Plus, CheckCircle, AlertCircle, CalendarIcon, Upload } from 'lucide-react';
import { useProfile, USAddress } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI'
];

const US_PHONE_REGEX = /^(\+1\s?)?(\(\d{3}\)|\d{3})[\s\-.]?\d{3}[\s\-.]?\d{4}$/;
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

const profileSchema = z.object({
  first_name: z.string().min(2, 'First name is required (min 2 characters)'),
  last_name: z.string().min(2, 'Last name is required (min 2 characters)'),
  middle_name: z.string().optional(),
  suffix: z.string().optional(),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  email: z.string().email('Valid email is required'),
  gender: z.string().optional(),
  occupation: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  phone_number: z.string()
    .min(1, 'Phone number is required')
    .refine(val => US_PHONE_REGEX.test(val), {
      message: 'Enter a valid US phone number, e.g. (555) 123-4567'
    }),
  street1: z.string().min(1, 'Street address is required'),
  street2: z.string().max(100).optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zip: z.string()
    .min(1, 'ZIP code is required')
    .refine(val => US_ZIP_REGEX.test(val), {
      message: 'Enter a valid ZIP code, e.g. 90210 or 90210-1234'
    }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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
  const { profile, loading, updating, updateProfile, reload } = useProfile();
  const { toast } = useToast();
  const [newInterest, setNewInterest] = useState('');
  const [newHealthGoal, setNewHealthGoal] = useState('');
  const [newActivityPref, setNewActivityPref] = useState('');
  const [addressValidation, setAddressValidation] = useState<{ valid: boolean; message: string }>({ valid: true, message: '' });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userEmail, setUserEmail] = useState('');

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

  useEffect(() => {
    const result = validateUSPSAddress(watchedStreet1, watchedCity, watchedState, watchedZip);
    setAddressValidation(result);
  }, [watchedStreet1, watchedCity, watchedState, watchedZip]);

  // Load user email from auth
  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setValue('email', user.email);
      }
    };
    getEmail();
  }, [setValue]);

  useEffect(() => {
    if (profile) {
      setValue('first_name', profile.first_name || '');
      setValue('last_name', profile.last_name || '');
      setValue('middle_name', profile.middle_name || '');
      setValue('suffix', profile.suffix || '');
      setValue('gender', profile.gender || '');
      setValue('occupation', profile.occupation || '');
      setValue('bio', profile.bio || '');
      setValue('phone_number', profile.phone_number || '');

      if (profile.date_of_birth) {
        const dob = new Date(profile.date_of_birth);
        setSelectedDate(dob);
        setValue('date_of_birth', format(dob, 'MM/dd/yyyy'));
      }

      setAvatarUrl(profile.avatar_url);

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

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setValue('date_of_birth', format(date, 'MM/dd/yyyy'), { shouldValidate: true });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'Please select an image file', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Image must be under 5MB', variant: 'destructive' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(urlWithCacheBust);
      await updateProfile({ avatar_url: publicUrl } as any);
      toast({ title: 'Success', description: 'Profile photo updated' });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({ title: 'Error', description: 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    const { street1, street2, city, state, zip, phone_number, date_of_birth, email, ...rest } = data;

    const full_legal_address: USAddress = {
      street1: street1,
      street2: street2 || '',
      city: city,
      state: state,
      zip: zip,
    };

    // Convert MM/DD/YYYY to ISO date string for DB
    let isoDate: string | null = null;
    if (date_of_birth) {
      const parsed = parse(date_of_birth, 'MM/dd/yyyy', new Date());
      isoDate = format(parsed, 'yyyy-MM-dd');
    }

    await updateProfile({
      ...rest,
      phone_number: phone_number,
      date_of_birth: isoDate,
      full_legal_address,
      interests,
      health_goals: healthGoals,
      activity_preferences: activityPreferences
    } as any);
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
      {/* Profile Photo */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={avatarUrl || ''} />
          <AvatarFallback className="text-lg">
            {profile?.first_name?.[0]}{profile?.last_name?.[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            id="avatar-upload"
            disabled={uploadingAvatar}
          />
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <Button variant="outline" size="sm" asChild disabled={uploadingAvatar}>
              <span className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
              </span>
            </Button>
          </Label>
          <p className="text-xs text-muted-foreground">JPG, PNG. Max 5MB.</p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name <span className="text-destructive">*</span></Label>
          <Input id="first_name" {...register('first_name')} className="w-full" />
          {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name <span className="text-destructive">*</span></Label>
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

        {/* Date of Birth */}
        <div className="space-y-2">
          <Label>Date of Birth <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, 'MM/dd/yyyy') : <span>MM/DD/YYYY</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
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

        {/* Email (read-only from auth) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
          <Input
            id="email"
            type="email"
            value={userEmail}
            readOnly
            className="w-full bg-muted cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Email is managed through your account settings</p>
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
        <div className="space-y-2">
          <Label htmlFor="phone_number">Phone Number <span className="text-destructive">*</span></Label>
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
          <Label className="text-base font-semibold">Mailing Address <span className="text-destructive">*</span></Label>
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
            <Label htmlFor="street1">Street Address Line 1 <span className="text-destructive">*</span></Label>
            <Input
              id="street1"
              {...register('street1')}
              placeholder="123 Main Street"
              className="w-full"
              maxLength={100}
            />
            {errors.street1 && <p className="text-sm text-destructive">{errors.street1.message}</p>}
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
            <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
            <Input
              id="city"
              {...register('city')}
              placeholder="City"
              className="w-full"
              maxLength={60}
            />
            {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
            <Select onValueChange={(value) => setValue('state', value, { shouldValidate: true })} defaultValue={
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
            {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zip">ZIP Code <span className="text-destructive">*</span></Label>
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
