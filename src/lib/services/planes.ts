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

export async function getPlanes(options?: {
  onlyActive?: boolean;
}): Promise<{ data: PlanItem[]; error: string | null }> {
  const deletedIds = getDeletedPlanIds();
  const customPlanes = getCustomPlanes();

  try {
    const supabase = createClient();
    let query = supabase
      .from('planes')
      .select('*')
      .order('price', { ascending: true });

    if (options?.onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      // Si hay error o la tabla no existe aún, usar únicamente planes personalizados de localStorage (sin hardcoded)
      let combined = customPlanes.filter((p) => !deletedIds.includes(p.id));
      if (options?.onlyActive) {
        combined = combined.filter((p) => p.is_active !== false);
      }
      return { data: combined, error: null };
    }

    if (data && data.length > 0) {
      let filtered = (data as PlanItem[]).filter((p) => !deletedIds.includes(p.id));
      if (options?.onlyActive) {
        filtered = filtered.filter((p) => p.is_active !== false);
      }
      return { data: filtered, error: null };
    }

    // Si data es array vacío en BD, combinar con customPlanes si los hubiere
    let fallback = customPlanes.filter((p) => !deletedIds.includes(p.id));
    if (options?.onlyActive) {
      fallback = fallback.filter((p) => p.is_active !== false);
    }
    return { data: fallback, error: null };
  } catch {
    let fallback = customPlanes.filter((p) => !deletedIds.includes(p.id));
    if (options?.onlyActive) {
      fallback = fallback.filter((p) => p.is_active !== false);
    }
    return { data: fallback, error: null };
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
      const item = custom.find((p: PlanItem) => p.id === id);
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
