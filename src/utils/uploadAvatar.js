import { supabase } from '../lib/supabaseClient';

export const uploadAvatar = async (userId, file) => {
  const fileExt = file.name.split('.').pop();
  const filePath = `${userId}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  // Get public URL
  const { data: publicUrlData } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};
