import { currentUser } from '@/lib/auth';
import { saveUpload } from '@/lib/uploads';
import { logActivity } from '@/lib/data/site';

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'Not signed in.' }, { status: 401 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: 'No file received.' }, { status: 400 });
  const alt = typeof form.get('alt') === 'string' ? String(form.get('alt')).slice(0, 500) : '';
  const credit = typeof form.get('credit') === 'string' ? String(form.get('credit')).slice(0, 300) : '';
  try {
    const media = await saveUpload(file, user.id, { alt, credit });
    await logActivity(user.id, 'uploaded', 'media', media.id, media.original_name);
    return Response.json(media);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 400 });
  }
}
