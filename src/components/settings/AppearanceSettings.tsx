import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Monitor, Moon, Sun, Eye, Palette } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useProfile } from '@/hooks/useProfile';

export function AppearanceSettings() {
  const { theme, accessibilityMode, toggleTheme, toggleAccessibilityMode } = useTheme();
  const { preferences, updatePreferences } = useProfile();

  const handleFontSizeChange = (fontSize: 'small' | 'medium' | 'large') => {
    updatePreferences({ font_size: fontSize });
  };

  const handleHighContrastChange = (enabled: boolean) => {
    updatePreferences({ high_contrast: enabled });
  };

  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred app theme
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div 
              onClick={() => theme !== 'light' && toggleTheme()}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                theme === 'light' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5" />
                <div>
                  <div className="font-medium">Light</div>
                  <div className="text-sm text-muted-foreground">Bright and clean</div>
                </div>
              </div>
            </div>
            
            <div 
              onClick={() => theme !== 'dark' && toggleTheme()}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5" />
                <div>
                  <div className="font-medium">Dark</div>
                  <div className="text-sm text-muted-foreground">Easy on the eyes</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Accessibility
          </CardTitle>
          <CardDescription>
            Customize the app for better accessibility
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Colorblind Mode */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="colorblind-mode" className="text-base font-medium">
                Colorblind Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Use high contrast black and white colors for better visibility
              </p>
            </div>
            <Switch
              id="colorblind-mode"
              checked={accessibilityMode === 'colorblind'}
              onCheckedChange={toggleAccessibilityMode}
            />
          </div>

          {/* High Contrast */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="high-contrast" className="text-base font-medium">
                High Contrast
              </Label>
              <p className="text-sm text-muted-foreground">
                Increase contrast for better readability
              </p>
            </div>
            <Switch
              id="high-contrast"
              checked={preferences?.high_contrast || false}
              onCheckedChange={handleHighContrastChange}
            />
          </div>

          {/* Font Size */}
          <div className="space-y-3">
            <div>
              <Label className="text-base font-medium">Font Size</Label>
              <p className="text-sm text-muted-foreground">
                Adjust text size for better readability
              </p>
            </div>
            <Select
              value={preferences?.font_size || 'medium'}
              onValueChange={(value: 'small' | 'medium' | 'large') => handleFontSizeChange(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            See how your settings affect the app appearance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Monitor className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-medium">Sample Title</div>
                <div className="text-sm text-muted-foreground">This is sample text to preview your settings</div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm">Primary Button</Button>
              <Button size="sm" variant="outline">Secondary Button</Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Current theme: {theme} | Accessibility: {accessibilityMode}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}