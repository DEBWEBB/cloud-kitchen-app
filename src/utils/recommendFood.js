const PREFERENCES_KEY = "user_preferences";
const FOOD_KEYWORDS = {
  cake: ["cake", "cakes", "truffle", "red velvet", "black forest", "cheesecake"],
  pastry: ["pastry", "pastries", "mousse", "eclair", "slice", "swiss roll", "brownie"],
  snack: ["snack", "snacks", "sandwich", "burger", "roll", "puff", "patty", "devil"],
  sweet: ["sweet", "dessert", "desserts", "chocolate", "strawberry", "blueberry", "butterscotch"],
};

const RECOMMENDATION_TRIGGERS = [
  "suggest",
  "recommend",
  "what should i eat",
  "what to eat",
  "hungry",
  "cake",
  "pastry",
  "snack",
  "dessert",
  "sweet",
  "pizza",
  "burger",
];

const normalize = (value = "") => value.toLowerCase().trim();

const splitTerms = (value = "") =>
  normalize(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const getStoredPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
  } catch {
    return {};
  }
};

export const saveUserPreferences = (updates = {}) => {
  const current = getStoredPreferences();
  const next = { ...current, ...updates };

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // Storage write failures are non-critical.
  }

  return next;
};

export const isRecommendationQuery = (query = "") => {
  const text = normalize(query);
  return RECOMMENDATION_TRIGGERS.some((trigger) => text.includes(trigger));
};

const scoreItem = (item, terms, query, preferences, pastOrders) => {
  const name = normalize(item.name);
  const category = normalize(item.category);
  const description = normalize(item.description);
  const haystack = `${name} ${category} ${description}`;
  let score = 0;

  if (!query) score += 1;

  terms.forEach((term) => {
    if (name.includes(term)) score += 6;
    if (category.includes(term)) score += 5;
    if (description.includes(term)) score += 2;
  });

  Object.entries(FOOD_KEYWORDS).forEach(([group, keywords]) => {
    const groupMatched = keywords.some((keyword) => query.includes(keyword));
    if (groupMatched && (category.includes(group) || keywords.some((keyword) => haystack.includes(keyword)))) {
      score += 4;
    }
  });

  const historyText = [
    normalize(preferences.lastSearch),
    normalize(preferences.lastOrder),
    ...pastOrders.map((entry) => normalize(entry)),
  ].join(" ");

  splitTerms(historyText).forEach((term) => {
    if (term && haystack.includes(term)) {
      score += 3;
    }
  });

  if (preferences.favoriteCategory && category.includes(normalize(preferences.favoriteCategory))) {
    score += 4;
  }

  if (item.price <= 120) score += 1;

  return score;
};

export const recommendFood = (menu = [], query = "", options = {}) => {
  const preferences = options.preferences || getStoredPreferences();
  const pastOrders = Array.isArray(options.pastOrders) ? options.pastOrders : [];
  const normalizedQuery = normalize(query);
  const terms = splitTerms(normalizedQuery);

  return [...menu]
    .map((item) => ({
      ...item,
      _score: scoreItem(item, terms, normalizedQuery, preferences, pastOrders),
    }))
    .filter((item) => item._score > 0)
    .sort((left, right) => right._score - left._score || left.price - right.price)
    .slice(0, 5)
    .map((item) => {
      const cleanedItem = { ...item };
      delete cleanedItem._score;
      return cleanedItem;
    });
};

export const buildRecommendationResponse = (menu = [], query = "", options = {}) => {
  const recommendations = recommendFood(menu, query, options);

  if (recommendations.length === 0) {
    return {
      reply: "I couldn't find a strong match yet. Try asking for cakes, pastries, snacks, or desserts.",
      source: "rule",
      actions: [],
    };
  }

  return {
    reply: "Recommended for you:",
    source: "rule",
    actions: recommendations.map((item) => ({
      label: item.name,
      type: "add_to_cart",
      value: item,
    })),
  };
};
