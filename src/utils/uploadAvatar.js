import { supabase } from '../lib/supabaseClient';

export const uploadAvatar = async (userId, file) => {
  if (!file || !userId) throw new Error("Missing file or userId");

  const fileExt = file.name.split('.').pop();
  const filePath = `avatars/${userId}/${Date.now()}.${fileExt}`; // safer unique path

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError.message);
    throw uploadError;
  }

  // Get public URL
  const { data, error: urlError } = supabase
    .storage
    .from('avatars')
    .getPublicUrl(filePath);

  if (urlError || !data || !data.publicUrl) {
    throw urlError ?? new Error("Could not get avatar public URL");
  }

  return data.publicUrl;
};
