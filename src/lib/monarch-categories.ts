export type MonarchCategoryOption = {
  id: string
  name: string
}

/** Shown when the user has not saved quick categories yet. */
export const DEFAULT_PINNED_CATEGORY_NAMES = [
  'Auto Rikshaw',
  'Coffee shop',
  'Groceries',
  'Fast Food',
  'Rental Car & Taxi',
  'Restaurants & Bars',
  'Travel',
] as const

/** Categories whose merchants should not be remembered for auto-mapping. */
export const DEFAULT_NO_REMEMBER_TAGS = ['Auto Rikshaw'] as const

export type MonarchCategoryPickerGroups = {
  pinned: MonarchCategoryOption[]
  rest: MonarchCategoryOption[]
}

export function partitionMonarchCategoriesForPicker(
  categories: MonarchCategoryOption[],
  pinnedCategoryNames: string[]
): MonarchCategoryPickerGroups {
  if (pinnedCategoryNames.length === 0) {
    return { pinned: [], rest: categories }
  }

  const pinned: MonarchCategoryOption[] = []
  const pinnedIds = new Set<string>()

  for (const pinnedName of pinnedCategoryNames) {
    const match = categories.find(
      (c) => c.name.localeCompare(pinnedName, undefined, { sensitivity: 'accent' }) === 0
    )
    if (match) {
      pinned.push(match)
      pinnedIds.add(match.id)
    }
  }

  const rest = categories.filter((c) => !pinnedIds.has(c.id))
  return { pinned, rest }
}
