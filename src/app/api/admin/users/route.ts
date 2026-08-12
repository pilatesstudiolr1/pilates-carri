import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getAnonClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      full_name,
      first_name,
      last_name,
      role = 'PROFESORA',
      phone,
      dni,
      username,
      sede_id,
      turno = 'Mañana',
      hire_date,
      observations,
      commission_rate = 0.40,
      is_active = true,
      work_days = [],
      work_hours = [],
    } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'El correo electrónico es requerido.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const computedFullName = full_name || `${first_name || ''} ${last_name || ''}`.trim() || cleanEmail;
    const adminClient = getAdminClient();
    const client = adminClient || getAnonClient();

    let userId: string | null = null;

    // Buscar si el usuario ya existe en Supabase Auth (creado manualmente o previamente)
    if (adminClient) {
      try {
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

        if (existingAuthUser) {
          userId = existingAuthUser.id;
          // Actualizar contraseña si se proporcionó una nueva
          if (password && password.trim().length >= 6) {
            await adminClient.auth.admin.updateUserById(userId, {
              password: password.trim(),
              email_confirm: true,
            });
          }
        } else if (password && password.trim().length >= 6) {
          // Crear en Auth si no existía y se ingresó contraseña
          const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
            email: cleanEmail,
            password: password.trim(),
            email_confirm: true,
            user_metadata: {
              full_name: computedFullName,
              role,
            },
          });
          if (authData?.user) {
            userId = authData.user.id;
          } else if (authErr) {
            console.warn('Advertencia al crear en Auth:', authErr.message);
          }
        }
      } catch (e) {
        console.warn('Excepción al consultar auth.users:', e);
      }
    } else if (password && password.trim().length >= 6) {
      // Fallback sin service role key
      const serverAnon = getAnonClient();
      const { data: authData } = await serverAnon.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: { data: { full_name: computedFullName, role } },
      });
      if (authData?.user?.id) {
        userId = authData.user.id;
      }
    }

    // Verificar si ya existe en la tabla profiles por email
    const { data: existingProfile } = await client
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      if (!userId) {
        userId = existingProfile.id;
      } else if (existingProfile.id !== userId) {
        // Limpiar posible ID viejo o descalzado para usar el ID de auth.users
        await client.from('profiles').delete().eq('id', existingProfile.id);
      }
    }

    if (!userId) {
      userId = crypto.randomUUID();
    }

    const profilePayload = {
      id: userId,
      email: cleanEmail,
      full_name: computedFullName,
      first_name: first_name || null,
      last_name: last_name || null,
      role,
      phone: phone || null,
      dni: dni || null,
      username: username || cleanEmail.split('@')[0],
      password_text: password || null,
      sede_id: sede_id || null,
      turno,
      hire_date: hire_date || new Date().toISOString().split('T')[0],
      observations: observations || null,
      commission_rate: Number(commission_rate),
      is_active,
      work_days: Array.isArray(work_days) ? work_days : [],
      work_hours: Array.isArray(work_hours) ? work_hours : [],
      updated_at: new Date().toISOString(),
    };

    const { data: savedProfile, error: profileError } = await client
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'email' })
      .select()
      .single();

    if (profileError) {
      return NextResponse.json({ error: `Error al guardar perfil: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({ data: savedProfile, error: null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error inesperado al procesar perfil' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, password, email, full_name, role, ...updateFields } = body;

    if (!id && !email) {
      return NextResponse.json({ error: 'El ID o email de usuario es requerido.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const client = adminClient || getAnonClient();
    let currentId = id;

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      updateFields.email = cleanEmail;

      if (adminClient) {
        try {
          const { data: listData } = await adminClient.auth.admin.listUsers();
          const existingAuthUser = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);

          if (existingAuthUser) {
            currentId = existingAuthUser.id;
            if (password && password.trim().length >= 6) {
              await adminClient.auth.admin.updateUserById(currentId, {
                password: password.trim(),
                email_confirm: true,
              });
            }
          }
        } catch (e) {
          console.warn('Error al verificar Auth en PUT:', e);
        }
      }
    }

    if (password && password.trim().length >= 6) {
      updateFields.password_text = password.trim();
    }

    if (currentId) updateFields.id = currentId;
    if (full_name) updateFields.full_name = full_name;
    if (role) updateFields.role = role;
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedProfile, error: updateError } = await client
      .from('profiles')
      .upsert(updateFields, { onConflict: 'email' })
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ data: updatedProfile, error: null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error inesperado al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'El ID es requerido para eliminar.' }, { status: 400 });
    }

    const adminClient = getAdminClient();
    const client = adminClient || getAnonClient();

    if (adminClient) {
      try {
        await adminClient.auth.admin.deleteUser(id);
      } catch (e) {
        console.warn('No se pudo eliminar en Auth o no existía:', e);
      }
    }

    const { error: profileDeleteError } = await client
      .from('profiles')
      .delete()
      .eq('id', id);

    if (profileDeleteError) {
      return NextResponse.json({ error: profileDeleteError.message }, { status: 500 });
    }

    return NextResponse.json({ error: null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
