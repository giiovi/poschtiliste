export interface ShoppingList {
  id: number;
  title: string;
  due_date: string | null;
  responsible_user_id: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
}
