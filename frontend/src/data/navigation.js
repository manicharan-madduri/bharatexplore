export const INDIAN_STATES = [
  { name: 'Andhra Pradesh', slug: 'andhra-pradesh' },
  { name: 'Arunachal Pradesh', slug: 'arunachal-pradesh' },
  { name: 'Assam', slug: 'assam' },
  { name: 'Bihar', slug: 'bihar' },
  { name: 'Chhattisgarh', slug: 'chhattisgarh' },
  { name: 'Goa', slug: 'goa' },
  { name: 'Gujarat', slug: 'gujarat' },
  { name: 'Haryana', slug: 'haryana' },
  { name: 'Himachal Pradesh', slug: 'himachal-pradesh' },
  { name: 'Jharkhand', slug: 'jharkhand' },
  { name: 'Karnataka', slug: 'karnataka' },
  { name: 'Kerala', slug: 'kerala' },
  { name: 'Madhya Pradesh', slug: 'madhya-pradesh' },
  { name: 'Maharashtra', slug: 'maharashtra' },
  { name: 'Manipur', slug: 'manipur' },
  { name: 'Meghalaya', slug: 'meghalaya' },
  { name: 'Mizoram', slug: 'mizoram' },
  { name: 'Nagaland', slug: 'nagaland' },
  { name: 'Odisha', slug: 'odisha' },
  { name: 'Punjab', slug: 'punjab' },
  { name: 'Rajasthan', slug: 'rajasthan' },
  { name: 'Sikkim', slug: 'sikkim' },
  { name: 'Tamil Nadu', slug: 'tamil-nadu' },
  { name: 'Telangana', slug: 'telangana' },
  { name: 'Tripura', slug: 'tripura' },
  { name: 'Uttar Pradesh', slug: 'uttar-pradesh' },
  { name: 'Uttarakhand', slug: 'uttarakhand' },
  { name: 'West Bengal', slug: 'west-bengal' }
];

export const UNION_TERRITORIES = [
  { name: 'Andaman and Nicobar Islands', slug: 'andaman-nicobar' },
  { name: 'Chandigarh', slug: 'chandigarh' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', slug: 'daman-and-diu' },
  { name: 'Delhi', slug: 'delhi' },
  { name: 'Jammu and Kashmir', slug: 'jammu-and-kashmir' },
  { name: 'Ladakh', slug: 'ladakh' },
  { name: 'Lakshadweep', slug: 'lakshadweep' },
  { name: 'Puducherry', slug: 'puducherry' }
];

export const CATEGORIES = [
  { name: 'Historical',  slug: 'Historical'  },
  { name: 'Religious',   slug: 'Religious'   },
  { name: 'Nature',      slug: 'Nature'      },
  { name: 'Wildlife',    slug: 'Wildlife'    },
  { name: 'Beach',       slug: 'Beach'       },
  { name: 'Adventure',   slug: 'Adventure'   },
  { name: 'Cultural',    slug: 'Cultural'    },
  { name: 'Monument',    slug: 'Monument'    },
];

export const STATE_SLUG_ALIASES = {
  'andaman-and-nicobar-islands': 'andaman-nicobar',
  'andaman-and-nicobar': 'andaman-nicobar',
  'andaman-nicobar-islands': 'andaman-nicobar',
  'dadra-nagar-haveli-daman-diu': 'daman-and-diu',
  'dadra-and-nagar-haveli-and-daman-and-diu': 'daman-and-diu',
  'dadra-and-nagar-haveli': 'daman-and-diu',
  'daman-diu': 'daman-and-diu',
  'jammu-kashmir': 'jammu-and-kashmir',
  'pondicherry': 'puducherry',
  'new-delhi': 'delhi',
  'nct-of-delhi': 'delhi',
  'orissa': 'odisha',
  'uttaranchal': 'uttarakhand',
};

export function normalizeStateSlug(slug) {
  if (!slug || typeof slug !== 'string') return '';
  const cleaned = slug.trim().toLowerCase();
  return STATE_SLUG_ALIASES[cleaned] || cleaned;
}

export const CATEGORY_GROUPS = {
  historical: [
    'historical', 'heritage', 'fort', 'palace', 'archaeological',
    'archaeological ruins', 'heritage village', 'heritage town',
    'caves', 'war memorial', 'memorial',
  ],
  religious: [
    'religious', 'temple', 'monastery', 'spiritual', 'pilgrimage',
    'buddhist site', 'buddhist stupa', 'church',
  ],
  nature: [
    'nature', 'lake', 'hill station', 'waterfall', 'valley',
    'garden', 'gardens', 'hill town', 'dam', 'mountain pass',
    'peak', 'hills', 'meadow', 'backwaters', 'viewpoint',
    'river viewpoint', 'desert', 'hill village', 'eco village',
    'nature & wildlife', 'island',
  ],
  wildlife: [
    'wildlife', 'national park', 'wildlife sanctuary',
    'marine life', 'zoo', 'nature & wildlife',
  ],
  beach: [
    'beach', 'island', 'marine life', 'backwaters',
  ],
  adventure: [
    'adventure', 'mountain pass', 'peak', 'desert',
    'caves', 'waterfall', 'valley', 'hills',
  ],
  cultural: [
    'cultural', 'museum', 'heritage village', 'heritage town',
    'art & sculpture', 'cultural capital', 'village',
    'tourist village', 'eco village', 'capital',
    'border ceremony', 'science center', 'entertainment',
    'urban & shopping', 'architecture',
  ],
  monument: [
    'monument', 'fort', 'palace', 'memorial', 'war memorial',
    'architecture', 'archaeological', 'archaeological ruins',
    'heritage', 'buddhist stupa',
  ],
};

export function matchesCategory(destinationCategory, selectedCategory) {
  if (!selectedCategory || !selectedCategory.trim()) return true;
  if (!destinationCategory) return false;
  const target = selectedCategory.trim().toLowerCase();
  const actual = destinationCategory.trim().toLowerCase();
  if (actual === target) return true;
  const group = CATEGORY_GROUPS[target];
  return Array.isArray(group) ? group.includes(actual) : false;
}

