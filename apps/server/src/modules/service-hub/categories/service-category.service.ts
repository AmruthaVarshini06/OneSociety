export interface ServiceOptionDef {
  name: string;
  slug: string;
  description: string;
}

export interface ServiceCategoryDocument {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  isDomesticHelp: boolean;
  options: ServiceOptionDef[];
  isActive: boolean;
}

const DEFAULT_CATEGORIES: ServiceCategoryDocument[] = [
  {
    id: 'cat-domestic',
    name: 'Domestic Help & Maid',
    slug: 'domestic-help',
    description: 'Housekeeping, daily cleaning, washing, and cooking assistance',
    icon: 'broom',
    isDomesticHelp: true,
    isActive: true,
    options: [
      { name: 'Full House Cleaning', slug: 'cleaning', description: 'Daily floor mopping, dusting, and kitchen cleaning' },
      { name: 'Cooking & Meal Prep', slug: 'cooking', description: 'Breakfast, lunch, and dinner cooking' },
    ],
  },
  {
    id: 'cat-electrician',
    name: 'Electrician',
    slug: 'electrician',
    description: 'Switchboard wiring, fan/light installations, and fuse repairs',
    icon: 'flash',
    isDomesticHelp: false,
    isActive: true,
    options: [
      { name: 'Wiring & Switch Repair', slug: 'wiring', description: 'Fault finding and replacement of switches' },
      { name: 'Appliance Installation', slug: 'installation', description: 'Fan, geyser, and chandelier setup' },
    ],
  },
  {
    id: 'cat-plumber',
    name: 'Plumber',
    slug: 'plumber',
    description: 'Leakages, pipe fixes, tap replacements, and drain unblocking',
    icon: 'water-pump',
    isDomesticHelp: false,
    isActive: true,
    options: [
      { name: 'Leakage Fixing', slug: 'leakage', description: 'Pipe and faucet leak repair' },
      { name: 'Drain Cleaning', slug: 'drainage', description: 'Unclogging sinks and bathroom drains' },
    ],
  },
  {
    id: 'cat-tutor',
    name: 'Resident Tutor',
    slug: 'tutor',
    description: 'School curriculum coaching, language teaching, and music lessons',
    icon: 'school',
    isDomesticHelp: false,
    isActive: true,
    options: [
      { name: 'Math & Science (Classes 1-10)', slug: 'math-science', description: 'Foundational concepts and homework help' },
      { name: 'Music & Piano', slug: 'music', description: 'Keyboard and vocal coaching' },
    ],
  },
];

export async function listCategories(): Promise<ServiceCategoryDocument[]> {
  return DEFAULT_CATEGORIES;
}

export async function getCategoryBySlug(slug: string): Promise<ServiceCategoryDocument | null> {
  const found = DEFAULT_CATEGORIES.find(c => c.slug === slug.toLowerCase());
  return found || null;
}

export async function createCategory(data: any): Promise<ServiceCategoryDocument> {
  const cat: ServiceCategoryDocument = {
    id: 'cat-' + Date.now(),
    name: data.name,
    slug: data.slug.toLowerCase(),
    description: data.description,
    icon: data.icon ?? 'briefcase',
    isDomesticHelp: data.isDomesticHelp ?? false,
    options: data.options ?? [],
    isActive: true,
  };
  DEFAULT_CATEGORIES.push(cat);
  return cat;
}

export async function addOptionToCategory(
  categorySlug: string,
  option: ServiceOptionDef,
): Promise<ServiceCategoryDocument> {
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) throw new Error('Category not found');
  cat.options.push(option);
  return cat;
}
