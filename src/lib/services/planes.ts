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

const LOCAL_STORAGE_KEY_DELETED = 'studio_deleted_plan_ids';
const LOCAL_STORAGE_KEY_CUSTOM = 'studio_custom_planes';

function getDeletedPlanIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DELETED);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDeletedPlanId(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const deleted = getDeletedPlanIds();
    if (!deleted.includes(id)) {
      deleted.push(id);
      localStorage.setItem(LOCAL_STORAGE_KEY_DELETED, JSON.stringify(deleted));
    }
  } catch {
    // ignore
  }
}

function getCustomPlanes(): PlanItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_CUSTOM);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomPlan(plan: PlanItem) {
  if (typeof window === 'undefined') return;
  try {
    const custom = getCustomPlanes();
    const idx = custom.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      custom[idx] = plan;
    } else {
      custom.push(plan);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY_CUSTOM, JSON.stringify(custom));
  } catch {
    // ignore
  }
}

export async function getPlanes(): Promise<{ data: PlanItem[]; error: string | null }> {
  const deletedIds = getDeletedPlanIds();
  const customPlanes = getCustomPlanes();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('planes')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      // Si la tabla no existe o hay error, combinar predeterminados + personalizados no borrados
      const combined = [...DEFAULT_PLANES, ...customPlanes].filter((p) => !deletedIds.includes(p.id));
      return { data: combined, error: null };
    }

    if (data && data.length > 0) {
      const filtered = (data as PlanItem[]).filter((p) => !deletedIds.includes(p.id));
      return { data: filtered, error: null };
    }

    // Si data es array vacío (todos fueron eliminados en la BD o tabla vacía sin error)
    const fallbackFiltered = [...DEFAULT_PLANES, ...customPlanes].filter((p) => !deletedIds.includes(p.id));
    return { data: fallbackFiltered, error: null };
  } catch {
    const fallbackFiltered = [...DEFAULT_PLANES, ...customPlanes].filter((p) => !deletedIds.includes(p.id));
    return { data: fallbackFiltered, error: null };
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

    if (error) {
      // Crear localmente si falla BD por tabla faltante
      const newPlan: PlanItem = {
        id: `p-custom-${Date.now()}`,
        name: planData.name,
        weekly_classes: planData.weekly_classes,
        price: planData.price,
        description: planData.description || null,
        is_active: planData.is_active ?? true,
      };
      saveCustomPlan(newPlan);
      return { data: newPlan, error: null };
    }

    return { data: data as PlanItem, error: null };
  } catch {
    const newPlan: PlanItem = {
      id: `p-custom-${Date.now()}`,
      name: planData.name,
      weekly_classes: planData.weekly_classes,
      price: planData.price,
      description: planData.description || null,
      is_active: planData.is_active ?? true,
    };
    saveCustomPlan(newPlan);
    return { data: newPlan, error: null };
  }
}

export async function updatePlan(
  id: string,
  updateData: Partial<PlanItem>
): Promise<{ error: string | null }> {
  try {
    if (id.startsWith('p-')) {
      const custom = getCustomPlanes();
      const item = custom.find((p) => p.id === id) || DEFAULT_PLANES.find((p) => p.id === id);
      if (item) {
        saveCustomPlan({ ...item, ...updateData });
      }
      return { error: null };
    }

    const supabase = createClient();
    const { error } = await supabase
      .from('planes')
      .update(updateData)
      .eq('id', id);

    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('schema cache')) {
        return { error: null };
      }
      return { error: error.message };
    }
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
  return updatePlan(id, { is_active: isActive });
}

export async function deletePlan(id: string): Promise<{ error: string | null }> {
  try {
    // Marcar como eliminado localmente de forma persistente
    saveDeletedPlanId(id);

    if (!id.startsWith('p-')) {
      const supabase = createClient();
      await supabase
        .from('planes')
        .delete()
        .eq('id', id);
    }

    return { error: null };
  } catch {
    saveDeletedPlanId(id);
    return { error: null };
  }
}
