export interface Transaction {
  date: string;
  description: string;
  amount: number;
  category?: string;
}

export interface CategoryResult {
  name: string;
  amount: number;
}

export interface FixedExpense {
  name: string;
  amount: number;
  frequency: string;
}

export interface TopStore {
  name: string;
  amount: number;
  count: number;
  origDescs?: string[];
}

export interface Advice {
  text: string;
  category?: string;
  keywords?: string[];
}

export interface AnalysisResult {
  categories: CategoryResult[];
  fixedExpenses: FixedExpense[];
  topStores: TopStore[];
  advice: Advice[];
  summary: string;
  monthlyTrend: { month: string; income: number; expenses: number }[];
  txCategories: Record<string, string>;
  _allTx: Transaction[];
  _fname: string;
  _catColors: Record<string, string>;
}
