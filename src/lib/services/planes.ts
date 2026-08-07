import { createClient } from '@/lib/supabase/client';

export interface PlanItem {
  id: string;
  name: string;
  weekly_classes: number;
  price: number;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_PLANES: PlanItem[] = [
  { id: 'p-1', name: '1 vez por semana', weekly_classes: 1, price: 35000, description: '4 clases al mes', is_active: true },
  { id: 'p-2', name: '2 veces por semana', weekly_classes: 2, price: 45000, description: '8 clases al mes', is_active: true },
  { id: 'p-3', name: '3 veces por semana', weekly_classes: 3, price: 55000, description: '12 clases al mes', is_active: true },
  { id: 'p-4', name: 'Pase Libre', weekly_classes: 5, price: 65000, description: 'Clases ilimitadas por mes', is_active: true },
];

export async function getPlanes(): Promise<{ data: PlanItem[]; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('planes')
      .select('*')
      .order('price', { ascending: true });

    if (error || !data || data.length === 0) {
      return { data: DEFAULT_PLANES, error: null };
    }

    return { data: data as PlanItem[], error: null };
  } catch (err) {
    return { data: DEFAULT_PLANES, error: null };
  }
}

export async function createPlan(planData: {
  name: string;
  weekly_classes: number;
  price: number;
  description?: string;
  is_active?: boolean;
}): Promise<{ data: PlanItem | null; error: string | null }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('planes')
      .insert({
        name: planData.name,
        weekly_classes: planData.weekly_classes,
        price: planData.price,
        description: planData.description || null,
        is_active: planData.is_active ?? true,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as PlanItem, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Error al crear el plan',
    };
  }
}

export async function updatePlan(
  id: string,
  updateData: Partial<PlanItem>
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('planes')
      .update(updateData)
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al actualizar el plan',
    };
  }
}

export async function togglePlanActive(
  id: string,
  isActive: boolean
): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('planes')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al cambiar estado del plan',
    };
  }
}

export async function deletePlan(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('planes')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Error al eliminar el plan',
    };
  }
}
