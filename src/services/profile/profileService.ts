import { supabase } from '@/lib/supabase';
import type { Currency, Profile } from '@/types';
import { useAuthStore } from '@/store/authStore';

export interface UpdateProfileInput {
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  currency?: Currency;
  language?: string;
}

function getUserId(): string {
  const userId = useAuthStore.getState().userId;
  if (!userId) throw new Error('User not authenticated');
  return userId;
}

export class ProfileService {
  /**
   * Obtiene el perfil del usuario autenticado.
   * Si no existe, crea uno con valores por defecto.
   */
  async get(): Promise<Profile> {
    const userId = getUserId();

    const { data, error } = await supabase
      .from('profiles')
      .select()
      .eq('user_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // No profile found — create one
      return this.createDefault(userId);
    }

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   */
  async update(input: UpdateProfileInput): Promise<Profile> {
    const userId = getUserId();

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (input.displayName !== undefined) updatePayload.display_name = input.displayName;
    if (input.avatarUrl !== undefined) updatePayload.avatar_url = input.avatarUrl;
    if (input.phone !== undefined) updatePayload.phone = input.phone;
    if (input.currency !== undefined) updatePayload.currency = input.currency;
    if (input.language !== undefined) updatePayload.language = input.language;

    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  /**
   * Sube un avatar y devuelve la URL pública.
   */
  async uploadAvatar(uri: string): Promise<string> {
    const userId = getUserId();
    const fileName = `${userId}/avatar-${Date.now()}.jpg`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  }

  private async createDefault(userId: string): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        currency: 'COP',
        language: 'es',
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return this.mapRow(data);
  }

  private mapRow(row: any): Profile {
    return {
      id: row.id,
      userId: row.user_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      phone: row.phone,
      currency: row.currency as Currency,
      language: row.language,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
