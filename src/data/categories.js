// Must match CATEGORIES / COLLECTIONS in backend/models/Product.js.
// Labels and icons are dashboard-only.
export const CATEGORIES = [
  { id: 'rings', label: 'Rings', icon: '💍', description: 'Engagement, wedding & fashion rings' },
  { id: 'necklaces', label: 'Necklaces', icon: '📿', description: 'Pendants, chains & chokers' },
  { id: 'earrings', label: 'Earrings', icon: '💎', description: 'Studs, drops & hoops' },
  { id: 'bracelets', label: 'Bracelets', icon: '🔗', description: 'Bangles, tennis & charm bracelets' },
  { id: 'watches', label: 'Watches', icon: '⌚', description: 'Luxury & everyday timepieces' },
]

export const COLLECTIONS = [
  { id: 'fine-jewellery', label: 'Fine Jewellery' },
  { id: '80s-collection', label: '80s Collection' },
]

export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id)
}

export function getCollection(id) {
  return COLLECTIONS.find((collection) => collection.id === id)
}

// Must match GENDERS in backend/models/Product.js. Unisex shows under both women's and men's on the store.
export const GENDERS = [
  { id: 'women', label: 'Female', icon: '👩' },
  { id: 'men', label: 'Male', icon: '👨' },
  { id: 'unisex', label: 'Unisex', icon: '🧑' },
]

export function getGender(id) {
  return GENDERS.find((gender) => gender.id === id) ?? GENDERS[2]
}
