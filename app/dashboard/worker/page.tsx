'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getWorkerId } from '@/lib/getWorkerId';

type WorkerProfile = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  profession: string | null;
  description: string | null;
  avatar: string | null;
  cover: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  whatsapp: string | null;
  status: string | null;
  working_hours: string | null;
  experience_years: number | null;
  views: number | null;
  requests_count: number | null;
  rating: number | null;
  reviews_count: number | null;
  created_at: string | null;
};

type WorkerService = {
  id: string;
  worker_id: string;
  title: string;
  description: string | null;
  price: string | null;
};

type WorkerSkill = {
  id: string;
  worker_id: string;
  title: string;
};

type WorkerGalleryItem = {
  id: string;
  worker_id: string;
  url: string;
  type: 'image' | 'video' | string | null;
  created_at: string | null;
};

type WorkerRequest = {
  id: string;
  worker_id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string | null;
  created_at: string | null;
};

type WorkerSocialLinks = {
  id: string;
  worker_id: string;
  facebook: string | null;
  instagram: string | null;
  linkedin: string | null;
  x: string | null;
  website: string | null;
};

type CreateWorkerForm = {
  name: string;
  profession: string;
  city: string;
};

type EditWorkerForm = {
  name: string;
  profession: string;
  description: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  status: string;
  working_hours: string;
  experience_years: string;
};

type ServiceForm = {
  title: string;
  description: string;
  price: string;
};

type SkillForm = {
  title: string;
};

type SocialForm = {
  facebook: string;
  instagram: string;
  linkedin: string;
  x: string;
  website: string;
};

const WORKER_MEDIA_BUCKET = 'worker-media';
const MAX_ACHIEVEMENT_IMAGES = 4;
const MAX_ACHIEVEMENT_VIDEOS = 2;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

function formatDate(value: string | null) {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return date.toLocaleDateString('en', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getFileExtension(file: File) {
  const fileNameParts = file.name.split('.');
  const extension = fileNameParts[fileNameParts.length - 1];

  if (!extension || extension === file.name) {
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    if (file.type === 'video/mp4') return 'mp4';
    if (file.type === 'video/webm') return 'webm';

    return 'file';
  }

  return extension.toLowerCase();
}

function getUniqueFilePath(workerId: string, folder: string, file: File) {
  const extension = getFileExtension(file);
  const randomValue =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${workerId}/${folder}/${randomValue}.${extension}`;
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);
    const marker = `/storage/v1/object/public/${WORKER_MEDIA_BUCKET}/`;
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    return decodeURIComponent(
      parsedUrl.pathname.slice(markerIndex + marker.length)
    );
  } catch {
    return null;
  }
}

function isImageFile(file: File) {
  return file.type.startsWith('image/');
}

function isVideoFile(file: File) {
  const videoExtensions = /\.(mp4|webm|mov|m4v|avi|mkv|3gp|mpeg|mpg|ogv)$/i;

  return file.type.startsWith('video/') || videoExtensions.test(file.name);
}

function validateImageFile(file: File) {
  if (!isImageFile(file)) {
    return 'Please upload an image file.';
  }

  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image size must be ${MAX_IMAGE_SIZE_MB}MB or less.`;
  }

  return null;
}

function validateVideoFile(file: File) {
  if (!isVideoFile(file)) {
    return 'Please upload a video file.';
  }

  if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
    return `Video size must be ${MAX_VIDEO_SIZE_MB}MB or less.`;
  }

  return null;
}

export default function WorkerDashboardPage() {
  const router = useRouter();

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [services, setServices] = useState<WorkerService[]>([]);
  const [skills, setSkills] = useState<WorkerSkill[]>([]);
  const [gallery, setGallery] = useState<WorkerGalleryItem[]>([]);
  const [requests, setRequests] = useState<WorkerRequest[]>([]);
  const [socialLinks, setSocialLinks] = useState<WorkerSocialLinks | null>(
    null
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateWorkerForm>({
    name: '',
    profession: '',
    city: '',
  });

  const [editForm, setEditForm] = useState<EditWorkerForm>({
    name: '',
    profession: '',
    description: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    whatsapp: '',
    status: 'available',
    working_hours: '',
    experience_years: '0',
  });

  const [serviceForm, setServiceForm] = useState<ServiceForm>({
    title: '',
    description: '',
    price: '',
  });

  const [skillForm, setSkillForm] = useState<SkillForm>({
    title: '',
  });

  const [socialForm, setSocialForm] = useState<SocialForm>({
    facebook: '',
    instagram: '',
    linkedin: '',
    x: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [savingSkill, setSavingSkill] = useState(false);
  const [savingSocial, setSavingSocial] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const imageGalleryCount = gallery.filter(
    (item) => item.type === 'image'
  ).length;

  const videoGalleryCount = gallery.filter(
    (item) => item.type === 'video'
  ).length;

  function fillEditForm(workerData: WorkerProfile) {
    setEditForm({
      name: workerData.name ?? '',
      profession: workerData.profession ?? '',
      description: workerData.description ?? '',
      city: workerData.city ?? '',
      address: workerData.address ?? '',
      phone: workerData.phone ?? '',
      email: workerData.email ?? '',
      website: workerData.website ?? '',
      whatsapp: workerData.whatsapp ?? '',
      status: workerData.status ?? 'available',
      working_hours: workerData.working_hours ?? '',
      experience_years: String(workerData.experience_years ?? 0),
    });
  }

  function fillSocialForm(links: WorkerSocialLinks | null) {
    setSocialForm({
      facebook: links?.facebook ?? '',
      instagram: links?.instagram ?? '',
      linkedin: links?.linkedin ?? '',
      x: links?.x ?? '',
      website: links?.website ?? '',
    });
  }

  async function uploadFileToWorkerStorage(
    workerId: string,
    folder: string,
    file: File
  ) {
    const filePath = getUniqueFilePath(workerId, folder, file);

    const { error: uploadError } = await supabase.storage
      .from(WORKER_MEDIA_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage
      .from(WORKER_MEDIA_BUCKET)
      .getPublicUrl(filePath);

    return {
      publicUrl: data.publicUrl,
      path: filePath,
    };
  }

  async function removeStorageFileByUrl(url: string | null) {
    const path = getStoragePathFromPublicUrl(url);

    if (!path) return;

    await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([path]);
  }

  async function loadWorkerDashboard() {
    setLoading(true);
    setError(null);
    setNotice(null);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.replace('/login');
      return;
    }

    setUserId(user.id);
    setAuthEmail(user.email ?? null);

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.user_type && profile.user_type !== 'worker') {
      setError('This dashboard is only for worker accounts.');
      setLoading(false);
      return;
    }

    const workerId = await getWorkerId();

    if (!workerId) {
      setWorker(null);
      setServices([]);
      setSkills([]);
      setGallery([]);
      setRequests([]);
      setSocialLinks(null);
      fillSocialForm(null);
      setLoading(false);
      return;
    }

    const { data: workerData, error: workerError } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .maybeSingle();

    if (workerError || !workerData) {
      setError(workerError?.message || 'Worker profile could not be loaded.');
      setLoading(false);
      return;
    }

    const [
      servicesResult,
      skillsResult,
      galleryResult,
      requestsResult,
      socialLinksResult,
    ] = await Promise.all([
      supabase
        .from('worker_services')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_skills')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_gallery')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_requests')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false }),

      supabase
        .from('worker_social_links')
        .select('*')
        .eq('worker_id', workerId)
        .maybeSingle(),
    ]);

    const typedWorker = workerData as WorkerProfile;
    const typedSocialLinks =
      (socialLinksResult.data as WorkerSocialLinks | null) ?? null;

    setWorker(typedWorker);
    fillEditForm(typedWorker);

    setServices((servicesResult.data ?? []) as WorkerService[]);
    setSkills((skillsResult.data ?? []) as WorkerSkill[]);
    setGallery((galleryResult.data ?? []) as WorkerGalleryItem[]);
    setRequests((requestsResult.data ?? []) as WorkerRequest[]);
    setSocialLinks(typedSocialLinks);
    fillSocialForm(typedSocialLinks);

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadWorkerDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreateWorkerProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setError('User session was not found.');
      return;
    }

    const name = createForm.name.trim();
    const profession = createForm.profession.trim();
    const city = createForm.city.trim();

    if (!name) {
      setError('Worker name is required.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setNotice(null);

    const { data, error: insertError } = await supabase
      .from('workers')
      .insert({
        user_id: userId,
        name,
        profession: profession || null,
        city: city || null,
        email: authEmail,
      })
      .select('*')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSavingProfile(false);
      return;
    }

    const createdWorker = data as WorkerProfile;

    setWorker(createdWorker);
    fillEditForm(createdWorker);
    setNotice('Worker profile created successfully.');
    setSavingProfile(false);
  }

  async function handleUpdateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const name = editForm.name.trim();

    if (!name) {
      setError('Worker name is required.');
      return;
    }

    const experienceYears = Number(editForm.experience_years || 0);

    if (Number.isNaN(experienceYears) || experienceYears < 0) {
      setError('Experience years must be zero or more.');
      return;
    }

    setSavingProfile(true);
    setError(null);
    setNotice(null);

    const { data, error: updateError } = await supabase
      .from('workers')
      .update({
        name,
        profession: editForm.profession.trim() || null,
        description: editForm.description.trim() || null,
        city: editForm.city.trim() || null,
        address: editForm.address.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        website: editForm.website.trim() || null,
        whatsapp: editForm.whatsapp.trim() || null,
        status: editForm.status,
        working_hours: editForm.working_hours.trim() || null,
        experience_years: experienceYears,
      })
      .eq('id', worker.id)
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
      setSavingProfile(false);
      return;
    }

    const updatedWorker = data as WorkerProfile;

    setWorker(updatedWorker);
    fillEditForm(updatedWorker);
    setNotice('Profile updated successfully.');
    setSavingProfile(false);
  }

  async function handleAvatarUpload(file: File | undefined) {
    if (!worker || !file) return;

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadingAvatar(true);
    setError(null);
    setNotice(null);

    try {
      const oldAvatar = worker.avatar;
      const uploaded = await uploadFileToWorkerStorage(worker.id, 'avatar', file);

      const { data, error: updateError } = await supabase
        .from('workers')
        .update({
          avatar: uploaded.publicUrl,
        })
        .eq('id', worker.id)
        .select('*')
        .single();

      if (updateError) {
        await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([uploaded.path]);
        throw new Error(updateError.message);
      }

      await removeStorageFileByUrl(oldAvatar);

      const updatedWorker = data as WorkerProfile;

      setWorker(updatedWorker);
      fillEditForm(updatedWorker);
      setNotice('Profile image uploaded successfully.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Profile image could not be uploaded.'
      );
    }

    setUploadingAvatar(false);
  }

  async function handleCoverUpload(file: File | undefined) {
    if (!worker || !file) return;

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadingCover(true);
    setError(null);
    setNotice(null);

    try {
      const oldCover = worker.cover;
      const uploaded = await uploadFileToWorkerStorage(worker.id, 'cover', file);

      const { data, error: updateError } = await supabase
        .from('workers')
        .update({
          cover: uploaded.publicUrl,
        })
        .eq('id', worker.id)
        .select('*')
        .single();

      if (updateError) {
        await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([uploaded.path]);
        throw new Error(updateError.message);
      }

      await removeStorageFileByUrl(oldCover);

      const updatedWorker = data as WorkerProfile;

      setWorker(updatedWorker);
      fillEditForm(updatedWorker);
      setNotice('Cover image uploaded successfully.');
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Cover image could not be uploaded.'
      );
    }

    setUploadingCover(false);
  }

  async function handleGalleryUpload(
    file: File | undefined,
    mediaType: 'image' | 'video'
  ) {
    if (!worker || !file) return;

    if (mediaType === 'image') {
      if (imageGalleryCount >= MAX_ACHIEVEMENT_IMAGES) {
        setError(`Maximum ${MAX_ACHIEVEMENT_IMAGES} achievement images allowed.`);
        return;
      }

      const validationError = validateImageFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (mediaType === 'video') {
      if (videoGalleryCount >= MAX_ACHIEVEMENT_VIDEOS) {
        setError(`Maximum ${MAX_ACHIEVEMENT_VIDEOS} achievement videos allowed.`);
        return;
      }

      const validationError = validateVideoFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setUploadingGallery(true);
    setError(null);
    setNotice(null);

    try {
      const uploaded = await uploadFileToWorkerStorage(
        worker.id,
        mediaType === 'image' ? 'achievements/images' : 'achievements/videos',
        file
      );

      const { data, error: insertError } = await supabase
        .from('worker_gallery')
        .insert({
          worker_id: worker.id,
          url: uploaded.publicUrl,
          type: mediaType,
        })
        .select('*')
        .single();

      if (insertError) {
        await supabase.storage.from(WORKER_MEDIA_BUCKET).remove([uploaded.path]);
        throw new Error(insertError.message);
      }

      setGallery((current) => [data as WorkerGalleryItem, ...current]);
      setNotice(
        mediaType === 'image'
          ? 'Achievement image uploaded successfully.'
          : 'Achievement video uploaded successfully.'
      );
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Achievement media could not be uploaded.'
      );
    }

    setUploadingGallery(false);
  }

  async function handleDeleteGalleryItem(item: WorkerGalleryItem) {
    const confirmed = window.confirm('Delete this achievement item?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_gallery')
      .delete()
      .eq('id', item.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await removeStorageFileByUrl(item.url);

    setGallery((current) =>
      current.filter((galleryItem) => galleryItem.id !== item.id)
    );
    setNotice('Achievement item deleted successfully.');
  }

  async function handleAddService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const title = serviceForm.title.trim();

    if (!title) {
      setError('Service title is required.');
      return;
    }

    setSavingService(true);
    setError(null);
    setNotice(null);

    const { error: insertError } = await supabase
      .from('worker_services')
      .insert({
        worker_id: worker.id,
        title,
        description: serviceForm.description.trim() || null,
        price: serviceForm.price.trim() || null,
      });

    if (insertError) {
      setError(insertError.message);
      setSavingService(false);
      return;
    }

    setServiceForm({
      title: '',
      description: '',
      price: '',
    });

    setNotice('Service added successfully.');
    setSavingService(false);
    await loadWorkerDashboard();
  }

  async function handleDeleteService(serviceId: string) {
    const confirmed = window.confirm('Delete this service?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_services')
      .delete()
      .eq('id', serviceId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setServices((current) =>
      current.filter((service) => service.id !== serviceId)
    );
    setNotice('Service deleted successfully.');
  }

  async function handleAddSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    const title = skillForm.title.trim();

    if (!title) {
      setError('Skill title is required.');
      return;
    }

    setSavingSkill(true);
    setError(null);
    setNotice(null);

    const { error: insertError } = await supabase.from('worker_skills').insert({
      worker_id: worker.id,
      title,
    });

    if (insertError) {
      setError(insertError.message);
      setSavingSkill(false);
      return;
    }

    setSkillForm({ title: '' });
    setNotice('Skill added successfully.');
    setSavingSkill(false);
    await loadWorkerDashboard();
  }

  async function handleDeleteSkill(skillId: string) {
    const confirmed = window.confirm('Delete this skill?');

    if (!confirmed) return;

    setError(null);
    setNotice(null);

    const { error: deleteError } = await supabase
      .from('worker_skills')
      .delete()
      .eq('id', skillId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSkills((current) => current.filter((skill) => skill.id !== skillId));
    setNotice('Skill deleted successfully.');
  }

  async function handleSaveSocialLinks(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!worker) return;

    setSavingSocial(true);
    setError(null);
    setNotice(null);

    const payload = {
      worker_id: worker.id,
      facebook: socialForm.facebook.trim() || null,
      instagram: socialForm.instagram.trim() || null,
      linkedin: socialForm.linkedin.trim() || null,
      x: socialForm.x.trim() || null,
      website: socialForm.website.trim() || null,
    };

    const { data, error: upsertError } = await supabase
      .from('worker_social_links')
      .upsert(payload, {
        onConflict: 'worker_id',
      })
      .select('*')
      .single();

    if (upsertError) {
      setError(upsertError.message);
      setSavingSocial(false);
      return;
    }

    const updatedSocialLinks = data as WorkerSocialLinks;

    setSocialLinks(updatedSocialLinks);
    fillSocialForm(updatedSocialLinks);
    setNotice('Social links saved successfully.');
    setSavingSocial(false);
  }

  async function handleUpdateRequestStatus(requestId: string, status: string) {
    setError(null);
    setNotice(null);

    const { error: updateError } = await supabase
      .from('worker_requests')
      .update({ status })
      .eq('id', requestId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setRequests((current) =>
      current.map((request) =>
        request.id === requestId ? { ...request, status } : request
      )
    );

    setNotice('Request status updated.');
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">Loading worker dashboard...</p>
      </div>
    );
  }

  if (error && !worker) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-700">Dashboard Error</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Create Worker Profile</h2>
        <p className="mt-2 text-sm text-gray-600">
          Create your real worker profile. This data will be saved in Supabase.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {notice}
          </div>
        ) : null}

        <form onSubmit={handleCreateWorkerProfile} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Worker Name
            </label>
            <input
              type="text"
              value={createForm.name}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Profession
            </label>
            <input
              type="text"
              value={createForm.profession}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  profession: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              type="text"
              value={createForm.city}
              onChange={(event) =>
                setCreateForm((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full rounded-xl bg-green-700 px-4 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? 'Creating...' : 'Create Worker Profile'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="h-40 bg-green-800">
          {worker.cover ? (
            <img
              src={worker.cover}
              alt={worker.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-4 px-6 pb-6 pt-0 md:flex-row md:items-end md:justify-between">
          <div className="-mt-12 flex items-end gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 text-3xl font-bold text-gray-700">
              {worker.avatar ? (
                <img
                  src={worker.avatar}
                  alt={worker.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                worker.name.charAt(0).toUpperCase()
              )}
            </div>

            <div className="pb-2">
              <h2 className="text-2xl font-bold">{worker.name}</h2>
              <p className="text-sm text-gray-600">
                {worker.profession || 'Profession not added yet'}
              </p>
              <p className="text-sm text-gray-500">
                {worker.city || 'City not added yet'}
              </p>
            </div>
          </div>

          <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
            {worker.status || 'available'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Views</p>
          <p className="mt-2 text-2xl font-bold">{worker.views ?? 0}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Requests</p>
          <p className="mt-2 text-2xl font-bold">{requests.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Rating</p>
          <p className="mt-2 text-2xl font-bold">{worker.rating ?? 0}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Reviews</p>
          <p className="mt-2 text-2xl font-bold">
            {worker.reviews_count ?? 0}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Profile Media</h3>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold">Profile Image</p>
              <p className="mt-1 text-xs text-gray-500">
                Image only, max {MAX_IMAGE_SIZE_MB}MB.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleAvatarUpload(event.target.files?.[0])
                }
                className="mt-4 w-full text-sm"
                disabled={uploadingAvatar}
              />

              <p className="mt-3 text-sm text-gray-600">
                {uploadingAvatar ? 'Uploading profile image...' : 'Avatar'}
              </p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold">Cover Image</p>
              <p className="mt-1 text-xs text-gray-500">
                Image only, max {MAX_IMAGE_SIZE_MB}MB.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleCoverUpload(event.target.files?.[0])}
                className="mt-4 w-full text-sm"
                disabled={uploadingCover}
              />

              <p className="mt-3 text-sm text-gray-600">
                {uploadingCover ? 'Uploading cover image...' : 'Cover'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Achievement Uploads</h3>

          <p className="mt-2 text-sm text-gray-600">
            Images: {imageGalleryCount}/{MAX_ACHIEVEMENT_IMAGES} — Videos:{' '}
            {videoGalleryCount}/{MAX_ACHIEVEMENT_VIDEOS}
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold">Add Achievement Image</p>
              <p className="mt-1 text-xs text-gray-500">
                Max {MAX_ACHIEVEMENT_IMAGES} images, {MAX_IMAGE_SIZE_MB}MB each.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={(event) =>
                  handleGalleryUpload(event.target.files?.[0], 'image')
                }
                className="mt-4 w-full text-sm"
                disabled={
                  uploadingGallery ||
                  imageGalleryCount >= MAX_ACHIEVEMENT_IMAGES
                }
              />
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <p className="text-sm font-semibold">Add Achievement Video</p>
              <p className="mt-1 text-xs text-gray-500">
                Max {MAX_ACHIEVEMENT_VIDEOS} videos. Any video format, max{' '}
                {MAX_VIDEO_SIZE_MB}MB.
              </p>

              <input
                type="file"
                accept="video/*"
                onChange={(event) =>
                  handleGalleryUpload(event.target.files?.[0], 'video')
                }
                className="mt-4 w-full text-sm"
                disabled={
                  uploadingGallery ||
                  videoGalleryCount >= MAX_ACHIEVEMENT_VIDEOS
                }
              />
            </div>
          </div>

          {uploadingGallery ? (
            <p className="mt-4 text-sm text-gray-600">
              Uploading achievement media...
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Achievements Gallery</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {gallery.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-xl border">
              <div className="h-44 bg-gray-100">
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    controls
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={item.url}
                    alt="Worker achievement"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                  {item.type === 'video' ? 'Video' : 'Image'}
                </span>

                {item.type === 'video' ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                  >
                    Open Video
                  </a>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleDeleteGalleryItem(item)}
                  className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {gallery.length === 0 ? (
            <p className="text-sm text-gray-500">
              Uploaded achievements will appear here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Edit Worker Profile</h3>

        <form
          onSubmit={handleUpdateProfile}
          className="mt-5 grid gap-4 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Profession
            </label>
            <input
              type="text"
              value={editForm.profession}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  profession: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">City</label>
            <input
              type="text"
              value={editForm.city}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Address</label>
            <input
              type="text"
              value={editForm.address}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  address: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Phone</label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              value={editForm.email}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Website</label>
            <input
              type="text"
              value={editForm.website}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  website: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">WhatsApp</label>
            <input
              type="text"
              value={editForm.whatsapp}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  whatsapp: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Status</label>
            <select
              value={editForm.status}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            >
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Experience Years
            </label>
            <input
              type="number"
              min="0"
              value={editForm.experience_years}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  experience_years: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">
              Working Hours
            </label>
            <input
              type="text"
              value={editForm.working_hours}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  working_hours: event.target.value,
                }))
              }
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium">About</label>
            <textarea
              value={editForm.description}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={5}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Services</h3>

          <form onSubmit={handleAddService} className="mt-5 space-y-3">
            <input
              type="text"
              value={serviceForm.title}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Service title"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
              required
            />

            <textarea
              value={serviceForm.description}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Service description"
              rows={3}
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              value={serviceForm.price}
              onChange={(event) =>
                setServiceForm((current) => ({
                  ...current,
                  price: event.target.value,
                }))
              }
              placeholder="Price"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <button
              type="submit"
              disabled={savingService}
              className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingService ? 'Adding...' : 'Add Service'}
            </button>
          </form>

          <div className="mt-5 space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-xl border bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{service.title}</h4>

                    {service.description ? (
                      <p className="mt-1 text-sm text-gray-600">
                        {service.description}
                      </p>
                    ) : null}

                    {service.price ? (
                      <p className="mt-2 text-sm font-medium text-green-700">
                        {service.price}
                      </p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteService(service.id)}
                    className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {services.length === 0 ? (
              <p className="text-sm text-gray-500">
                Worker services will appear here.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Skills</h3>

          <form onSubmit={handleAddSkill} className="mt-5 flex gap-3">
            <input
              type="text"
              value={skillForm.title}
              onChange={(event) =>
                setSkillForm({
                  title: event.target.value,
                })
              }
              placeholder="Skill title"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
              required
            />

            <button
              type="submit"
              disabled={savingSkill}
              className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSkill ? 'Adding...' : 'Add'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-medium text-green-800"
              >
                <span>{skill.title}</span>

                <button
                  type="button"
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="text-red-600"
                >
                  ×
                </button>
              </div>
            ))}

            {skills.length === 0 ? (
              <p className="text-sm text-gray-500">
                Worker skills will appear here.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Social Links</h3>

          <form onSubmit={handleSaveSocialLinks} className="mt-5 space-y-3">
            <input
              type="text"
              value={socialForm.facebook}
              onChange={(event) =>
                setSocialForm((current) => ({
                  ...current,
                  facebook: event.target.value,
                }))
              }
              placeholder="Facebook"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              value={socialForm.instagram}
              onChange={(event) =>
                setSocialForm((current) => ({
                  ...current,
                  instagram: event.target.value,
                }))
              }
              placeholder="Instagram"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              value={socialForm.linkedin}
              onChange={(event) =>
                setSocialForm((current) => ({
                  ...current,
                  linkedin: event.target.value,
                }))
              }
              placeholder="LinkedIn"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              value={socialForm.x}
              onChange={(event) =>
                setSocialForm((current) => ({
                  ...current,
                  x: event.target.value,
                }))
              }
              placeholder="X"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <input
              type="text"
              value={socialForm.website}
              onChange={(event) =>
                setSocialForm((current) => ({
                  ...current,
                  website: event.target.value,
                }))
              }
              placeholder="Website"
              className="w-full rounded-xl border px-4 py-3 outline-none focus:border-green-600"
            />

            <button
              type="submit"
              disabled={savingSocial}
              className="rounded-xl bg-green-700 px-5 py-3 font-medium text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSocial ? 'Saving...' : 'Save Social Links'}
            </button>
          </form>

          {socialLinks ? (
            <p className="mt-4 text-sm text-gray-500">
              Social links are saved for this worker profile.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Requests</h3>

          <div className="mt-5 space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold">{request.name}</h4>
                    <p className="text-sm text-gray-600">{request.email}</p>

                    {request.phone ? (
                      <p className="text-sm text-gray-600">{request.phone}</p>
                    ) : null}

                    <p className="mt-3 text-sm text-gray-700">
                      {request.message}
                    </p>

                    <p className="mt-3 text-xs text-gray-500">
                      {formatDate(request.created_at)}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                    {request.status || 'new'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {['seen', 'accepted', 'rejected', 'completed'].map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() =>
                          handleUpdateRequestStatus(request.id, status)
                        }
                        className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-white"
                      >
                        {status}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}

            {requests.length === 0 ? (
              <p className="text-sm text-gray-500">
                Requests sent to this worker will appear here.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
