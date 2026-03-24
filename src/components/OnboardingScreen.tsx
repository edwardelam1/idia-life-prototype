import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { CalendarIcon, Upload, ChevronRight, ChevronLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { USAddress } from '@/hooks/useProfile';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI'
];

const US_PHONE_REGEX = /^(\+1\s?)?(\(\d{3}\)|\d{3})[\s\-.]?\d{3}[\s\-.]?\d{4}$/;
const US_ZIP_REGEX = /^\d{5}(-\d{4})?$/;

function formatUSPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 5;
  const [submitting, setSubmitting] = useState(false);

  // Step 1 - Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // Step 2 - Contact
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Step 3 - Address
  const [street1, setStreet1] = useState('');
  const [street2, setStreet2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  // Step 4 - Avatar
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getEmail();
  }, []);

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};

    if (s === 1) {
      if (!firstName.trim() || firstName.trim().length < 2) errs.firstName = 'First name is required (min 2 characters)';
      if (!lastName.trim() || lastName.trim().length < 2) errs.lastName = 'Last name is required (min 2 characters)';
      if (!selectedDate) errs.dob = 'Date of birth is required';
    }

    if (s === 2) {
      if (!phoneNumber || !US_PHONE_REGEX.test(phoneNumber)) errs.phone = 'Enter a valid US phone number, e.g. (555) 123-4567';
    }

    if (s === 3) {
      if (!street1.trim()) errs.street1 = 'Street address is required';
      else if (!/^\d+\s+/i.test(street1.trim())) errs.street1 = 'Street address should start with a street number';
      if (!city.trim()) errs.city = 'City is required';
      if (!state) errs.state = 'State is required';
      if (!zip.trim() || !US_ZIP_REGEX.test(zip)) errs.zip = 'Enter a valid ZIP code';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
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
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({ title: 'Error', description: 'Failed to upload photo', variant: 'destructive' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const isoDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
      const full_legal_address: USAddress = { street1, street2, city, state, zip };

      // Get avatar URL without cache buster
      let cleanAvatarUrl: string | null = null;
      if (avatarUrl) {
        cleanAvatarUrl = avatarUrl.split('?')[0];
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: isoDate,
          phone_number: phoneNumber,
          full_legal_address: full_legal_address as any,
          ...(cleanAvatarUrl ? { avatar_url: cleanAvatarUrl } : {}),
        } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Welcome!', description: 'Your profile has been set up successfully.' });
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      toast({ title: 'Error', description: 'Failed to save profile. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const addressValid = street1.trim() && city.trim() && state && zip.trim() && US_ZIP_REGEX.test(zip) && /^\d+\s+/i.test(street1.trim());

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          <p className="text-sm text-muted-foreground">Step {step} of {totalSteps}</p>
          <Progress value={(step / totalSteps) * 100} className="h-2" />
        </div>

        {/* Step 1 — Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>First Name <span className="text-destructive">*</span></Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />
              {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Last Name <span className="text-destructive">*</span></Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />
              {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
            </div>
            <div className="space-y-2">
              <Label>Date of Birth <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, 'MM/dd/yyyy') : <span>MM/DD/YYYY</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    captionLayout="dropdown-buttons"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              {errors.dob && <p className="text-sm text-destructive">{errors.dob}</p>}
            </div>
          </div>
        )}

        {/* Step 2 — Contact */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number <span className="text-destructive">*</span></Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(formatUSPhone(e.target.value))}
                placeholder="(555) 123-4567"
                maxLength={14}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={userEmail} readOnly className="bg-muted cursor-not-allowed" />
              <p className="text-xs text-muted-foreground">Email is from your account</p>
            </div>
          </div>
        )}

        {/* Step 3 — Address */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Mailing Address <span className="text-destructive">*</span></Label>
              {addressValid && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Address looks valid</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Street Address <span className="text-destructive">*</span></Label>
              <Input value={street1} onChange={(e) => setStreet1(e.target.value)} placeholder="123 Main St" />
              {errors.street1 && <p className="text-sm text-destructive">{errors.street1}</p>}
            </div>
            <div className="space-y-2">
              <Label>Apt / Suite / Unit</Label>
              <Input value={street2} onChange={(e) => setStreet2(e.target.value)} placeholder="Apt 4B" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>City <span className="text-destructive">*</span></Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
              </div>
              <div className="space-y-2">
                <Label>State <span className="text-destructive">*</span></Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>ZIP Code <span className="text-destructive">*</span></Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="90210" maxLength={10} />
              {errors.zip && <p className="text-sm text-destructive">{errors.zip}</p>}
            </div>
          </div>
        )}

        {/* Step 4 — Avatar (Optional) */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <p className="text-sm text-muted-foreground">Add a profile photo (optional)</p>
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback className="text-xl">{firstName?.[0]}{lastName?.[0]}</AvatarFallback>
              </Avatar>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="onboarding-avatar" disabled={uploadingAvatar} />
              <Label htmlFor="onboarding-avatar" className="cursor-pointer">
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
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : <div />}

          {step < totalSteps ? (
            <Button onClick={handleNext}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={submitting}>
              {submitting ? 'Saving...' : 'Complete Setup'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingScreen;
