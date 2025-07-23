import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Heart, User } from 'lucide-react';

interface AccountTypeSelectionProps {
  onSelect: (accountType: 'personal' | 'business' | 'non-profit') => void;
}

export const AccountTypeSelection: React.FC<AccountTypeSelectionProps> = ({ onSelect }) => {
  const accountTypes = [
    {
      type: 'personal' as const,
      title: 'Personal Account',
      description: 'For individuals looking to monetize their data and build financial wellness',
      icon: User,
      features: [
        'Data monetization',
        'Personal financial tracking',
        'Social health metrics',
        'Credit building through trust'
      ]
    },
    {
      type: 'business' as const,
      title: 'Business Account',
      description: 'For businesses wanting to access consumer insights and support community growth',
      icon: Building2,
      features: [
        'Access to anonymized consumer data',
        'Community impact metrics',
        'Employee wellness programs',
        'Ethical data marketplace participation'
      ]
    },
    {
      type: 'non-profit' as const,
      title: 'Non-Profit Account',
      description: 'For organizations focused on social impact and community development',
      icon: Heart,
      features: [
        'Community health insights',
        'Grant funding opportunities',
        'Volunteer coordination tools',
        'Impact measurement and reporting'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-4">Choose Your Account Type</h2>
        <p className="text-lg text-muted-foreground">
          Select the account type that best fits your needs. You can upgrade later.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {accountTypes.map((account) => {
          const IconComponent = account.icon;
          return (
            <Card 
              key={account.type}
              className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-primary/50"
            >
              <CardHeader className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <IconComponent className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{account.title}</CardTitle>
                <CardDescription className="text-sm">
                  {account.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 text-sm">
                  {account.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => onSelect(account.type)}
                  className="w-full"
                  variant={account.type === 'personal' ? 'default' : 'outline'}
                >
                  Select {account.title}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground">
          All account types include end-to-end encryption and full data control
        </p>
      </div>
    </div>
  );
};