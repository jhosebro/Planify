/**
 * Tipos de navegación para React Navigation v7.
 * Define los param lists para cada navigator del árbol de navegación.
 */

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Accounts: undefined;
  Budgets: undefined;
  More: undefined;
  // Hidden from tab bar but accessible via More screen
  Debts: undefined;
  Goals: undefined;
  Tracking: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  // Modals
  AddTransaction: { transactionId?: string } | undefined;
  AddTransfer: { sourceAccountId?: string } | undefined;
  AddBudget: undefined;
  AddReminder: { reminderId?: string } | undefined;
  AddGoal: { goalId?: string } | undefined;
  AddDebt: { category?: 'credit_card' | 'installment' | 'personal'; direction?: 'i_owe' | 'they_owe_me' } | undefined;
  GenerateReport: undefined;
  ExportForAI: undefined;
  EditProfile: undefined;
  AddTrackingList: { listId?: string } | undefined;
  AddTrackingItem: { listId: string; itemId?: string };
  // Details
  AccountDetail: { accountId: string };
  TransactionDetail: { transactionId: string };
  BudgetDetail: { budgetId: string };
  GoalDetail: { goalId: string };
  DebtDetail: { debtId: string };
  TrackingListDetail: { listId: string };
  SingleInstallmentDebts: { linkedAccountId: string; cardName: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
