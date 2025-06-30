
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Search, 
  Star, 
  Clock,
  Coffee,
  ShoppingBag,
  Utensils,
  Fuel,
  Heart,
  Tag
} from 'lucide-react';

const ShopScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All', icon: ShoppingBag },
    { id: 'food', name: 'Food', icon: Utensils },
    { id: 'coffee', name: 'Coffee', icon: Coffee },
    { id: 'gas', name: 'Gas', icon: Fuel },
  ];

  const merchants = [
    {
      id: 1,
      name: 'Green Bean Coffee',
      category: 'coffee',
      distance: '0.2 miles',
      rating: 4.8,
      reviews: 127,
      loyaltyPoints: 145,
      nextReward: '50 points',
      rewardType: 'Free Medium Coffee',
      isOpen: true,
      hours: 'Open until 8 PM',
      specialOffer: '20% off with IDIA Pay',
      image: '☕'
    },
    {
      id: 2,
      name: 'Fresh Market Grocery',
      category: 'food',
      distance: '0.5 miles',
      rating: 4.6,
      reviews: 89,
      loyaltyPoints: 289,
      nextReward: '200 points',
      rewardType: '$10 off groceries',
      isOpen: true,
      hours: 'Open until 10 PM',
      specialOffer: 'Double loyalty points today',
      image: '🛒'
    },
    {
      id: 3,
      name: 'Bella Vista Italian',
      category: 'food',
      distance: '0.8 miles',
      rating: 4.9,
      reviews: 203,
      loyaltyPoints: 67,
      nextReward: '25 points',
      rewardType: 'Free Appetizer',
      isOpen: false,
      hours: 'Opens at 5 PM',
      specialOffer: 'Happy hour 5-7 PM',
      image: '🍝'
    },
    {
      id: 4,
      name: 'Quick Stop Gas',
      category: 'gas',
      distance: '1.2 miles',
      rating: 4.3,
      reviews: 45,
      loyaltyPoints: 12,
      nextReward: '15 points',
      rewardType: '5¢ off per gallon',
      isOpen: true,
      hours: 'Open 24 hours',
      specialOffer: 'IDIA members save extra 3¢/gal',
      image: '⛽'
    }
  ];

  const filteredMerchants = merchants.filter(merchant => {
    const matchesCategory = selectedCategory === 'all' || merchant.category === selectedCategory;
    const matchesSearch = merchant.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getLoyaltyProgress = (current: number, needed: number) => {
    const progress = (current / (current + needed)) * 100;
    return Math.min(progress, 100);
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nearby Merchants</h1>
          <p className="text-gray-600">Discover local businesses and earn rewards</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search merchants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const isActive = selectedCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 whitespace-nowrap ${
                  isActive ? 'bg-teal-500 hover:bg-teal-600' : ''
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Merchants List */}
      <div className="space-y-4">
        {filteredMerchants.map((merchant) => (
          <Card key={merchant.id} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-3xl">{merchant.image}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-gray-900">{merchant.name}</h3>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium">{merchant.rating}</span>
                        <span className="text-sm text-gray-500">({merchant.reviews})</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{merchant.distance}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span className={merchant.isOpen ? 'text-green-600' : 'text-orange-600'}>
                          {merchant.hours}
                        </span>
                      </span>
                    </div>

                    {/* Loyalty Progress */}
                    <div className="bg-gray-50 p-3 rounded-lg mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">Loyalty Progress</span>
                        <span className="text-sm font-bold text-teal-600">{merchant.loyaltyPoints} pts</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className="bg-gradient-to-r from-teal-500 to-cyan-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${getLoyaltyProgress(merchant.loyaltyPoints, parseInt(merchant.nextReward.split(' ')[0]))}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        {merchant.nextReward} to unlock: <span className="font-medium">{merchant.rewardType}</span>
                      </p>
                    </div>

                    {/* Special Offer */}
                    <div className="flex items-center justify-between">
                      <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
                        <Tag className="w-3 h-3" />
                        <span>{merchant.specialOffer}</span>
                      </Badge>
                      <Button 
                        size="sm" 
                        className="bg-teal-500 hover:bg-teal-600"
                        disabled={!merchant.isOpen}
                      >
                        {merchant.isOpen ? 'Shop Now' : 'Closed'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 mb-1">Total Loyalty Points</p>
              <p className="text-2xl font-bold">513 pts</p>
              <p className="text-sm text-purple-100">Across 12 merchants</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShopScreen;
