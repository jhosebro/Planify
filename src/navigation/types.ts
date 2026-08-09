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
  Goals: undefined;
  Settings: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  // Modals
  AddTransaction: { transactionId?: string } | undefined;
  AddTransfer: undefined;
  AddBudget: undefined;
  AddReminder: { reminderId?: string } | undefined;
  AddGoal: { goalId?: string } | undefined;
  GenerateReport: undefined;
  ExportForAI: undefined;
  // Details
  AccountDetail: { accountId: string };
  TransactionDetail: { transactionId: string };
  BudgetDetail: { budgetId: string };
  GoalDetail: { goalId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};
