'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaEnvelope,
  FaFacebookF,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaLock,
  FaPhone,
  FaWhatsapp,
  FaXTwitter,
} from 'react-icons/fa6';
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
  worker_seen?: boolean | null;
  is_archived?: boolean | null;
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

type WorkerReview = {
  id: string;
  worker_id: string | null;
  user_id: string | null;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
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

function formatStatus(value: string | null) {
  if (!value) return 'Available';
  if (value === 'available') return 'Available';
  if (value === 'busy') return 'Busy';
  if (value === 'unavailable') return 'Unavailable';

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getStars(rating: number | null) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating ?? 0)));
  return '★'.repeat(safeRating) + '☆'.repeat(5 - safeRating);
}

function normalizeUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  return `https://${cleanValue}`;
}

function getWhatsappUrl(value: string | null) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (!cleanValue) return null;

  if (cleanValue.startsWith('http://') || cleanValue.startsWith('https://')) {
    return cleanValue;
  }

  const number = cleanValue.replace(/[^\d+]/g, '').replace(/^\+/, '');

  if (!number) return null;

  return `https://wa.me/${number}`;
}

function getPhoneUrl(value: string | null) {
  if (!value) return null;

  const phone = value.trim().replace(/\s/g, '');

  if (!phone) return null;

  return `tel:${phone}`;
}

function getMailUrl(value: string | null) {
  if (!value) return null;

  const email = value.trim();

  if (!email) return null;

  return `mailto:${email}`;
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
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
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
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const imageGalleryCount = gallery.filter(
    (item) => item.type === 'image'
  ).length;

  const videoGalleryCount = gallery.filter(
    (item) => item.type === 'video'
  ).length;

  const imageItems = gallery.filter((item) => item.type === 'image');
  const videoItems = gallery.filter((item) => item.type === 'video');
  const latestRequests = requests.slice(0, 3);
  const profileCompletionItems = worker
    ? [
        { label: 'Profile Photo', complete: Boolean(worker.avatar) },
        { label: 'Name', complete: Boolean(worker.name?.trim()) },
        { label: 'Profession', complete: Boolean(worker.profession?.trim()) },
        { label: 'City', complete: Boolean(worker.city?.trim()) },
        { label: 'Status', complete: Boolean(worker.status?.trim()) },
        {
          label: 'Contact',
          complete: Boolean(
            worker.phone?.trim() ||
              worker.email?.trim() ||
              worker.website?.trim() ||
              worker.whatsapp?.trim()
          ),
        },
        { label: 'About', complete: Boolean(worker.description?.trim()) },
        { label: 'Services', complete: services.length > 0 },
        { label: 'Skills', complete: skills.length > 0 },
        { label: 'Gallery', complete: gallery.length > 0 },
      ]
    : [];
  const completedProfileItems = profileCompletionItems.filter(
    (item) => item.complete
  ).length;
  const profileCompletionPercent = profileCompletionItems.length
    ? Math.round((completedProfileItems / profileCompletionItems.length) * 100)
    : 0;
  const missingProfileItems = profileCompletionItems
    .filter((item) => !item.complete)
    .map((item) => item.label);

  const contactActions = worker
    ? [
        { label: 'Phone', href: getPhoneUrl(worker.phone), icon: FaPhone },
        { label: 'Email', href: getMailUrl(worker.email), icon: FaEnvelope },
        {
          label: 'WhatsApp',
          href: getWhatsappUrl(worker.whatsapp),
          icon: FaWhatsapp,
        },
        { label: 'Website', href: normalizeUrl(worker.website), icon: FaGlobe },
        {
          label: 'Facebook',
          href: normalizeUrl(socialLinks?.facebook ?? null),
          icon: FaFacebookF,
        },
        {
          label: 'Instagram',
          href: normalizeUrl(socialLinks?.instagram ?? null),
          icon: FaInstagram,
        },
        {
          label: 'LinkedIn',
          href: normalizeUrl(socialLinks?.linkedin ?? null),
          icon: FaLinkedinIn,
        },
        {
          label: 'X',
          href: normalizeUrl(socialLinks?.x ?? null),
          icon: FaXTwitter,
        },
      ].filter((action) => action.href)
    : [];

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
      setReviews([]);
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
      reviewsResult,
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
        .from('worker_reviews')
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
    setReviews((reviewsResult.data ?? []) as WorkerReview[]);
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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

      <section className="flex min-h-80 w-full max-w-[1502px] flex-col justify-center rounded-2xl bg-[#c7f7f1] p-6 shadow-sm md:p-8">
        <div className="flex flex-col items-start gap-5">
          <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-4xl font-bold text-gray-700 shadow-sm">
            {worker.avatar ? (
              <Image
                src={worker.avatar}
                alt={worker.name}
                fill
                className="object-cover"
                sizes="112px"
              />
            ) : (
              worker.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-bold">{worker.name}</h2>
            <p className="text-base font-semibold text-gray-700">
              {worker.profession || 'Profession not added yet'}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#e8f9f2] px-4 py-2 text-sm font-bold text-gray-800">
                {worker.city || 'City not added yet'}
              </span>
              <span className="rounded-full bg-[#e8f9f2] px-4 py-2 text-sm font-bold text-gray-800">
                {formatStatus(worker.status)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="#basic-info"
              className="rounded-full bg-[#23a7f1] px-5 py-2 text-sm font-bold text-white hover:bg-[#168ed1]"
            >
              Edit Profile
            </a>
            <a
              href="#media-management"
              className="rounded-full bg-[#23a7f1] px-5 py-2 text-sm font-bold text-white hover:bg-[#168ed1]"
            >
              Upload Media
            </a>
          </div>
        </div>
      </section>

      <section id="profile-completion" className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl bg-[#e8f9f2] p-4 shadow-sm">
          <p className="text-sm text-gray-500">Views</p>
          <p className="mt-2 text-2xl font-bold">{worker.views ?? 0}</p>
        </div>

        <div className="rounded-2xl bg-[#e8f9f2] p-4 shadow-sm">
          <p className="text-sm text-gray-500">Requests</p>
          <p className="mt-2 text-2xl font-bold">{requests.length}</p>
        </div>

        <div className="rounded-2xl bg-[#e8f9f2] p-4 shadow-sm">
          <p className="text-sm text-gray-500">Rating</p>
          <p className="mt-2 text-2xl font-bold">
            {(worker.rating ?? 0).toFixed(1)}
          </p>
        </div>

        <div className="rounded-2xl bg-[#e8f9f2] p-4 shadow-sm">
          <p className="text-sm text-gray-500">Reviews Count</p>
          <p className="mt-2 text-2xl font-bold">
            {worker.reviews_count ?? reviews.length}
          </p>
        </div>

        <div className="rounded-2xl bg-[#e8f9f2] p-4 shadow-sm">
          <p className="text-sm text-gray-500">Reviews</p>
          <p className="mt-2 text-lg font-bold text-[#23a7f1]">
            {getStars(worker.rating)}
          </p>
        </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold">Profile Completion</h3>
              <p className="text-sm font-semibold text-gray-600">
                {profileCompletionPercent}% complete
              </p>
            </div>
            <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#23a7f1]"
                style={{ width: `${profileCompletionPercent}%` }}
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Missing:{' '}
            {missingProfileItems.length
              ? missingProfileItems.join(', ')
              : 'Nothing'}
          </p>
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <div id="profile-photo" className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
        <div>
          <h3 className="text-xl font-bold">Profile Photo</h3>

          <div className="mt-5 grid gap-4">
            <div className="max-w-[370px] rounded-[24px] bg-[#e8f9f2] p-4">
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
                className="mt-4 w-full max-w-[345px] text-sm"
                disabled={uploadingAvatar}
              />

              <p className="mt-3 text-sm text-gray-600">
                {uploadingAvatar ? 'Uploading profile image...' : 'Avatar'}
              </p>
            </div>

          </div>
        </div>
        <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />

        <div className="hidden rounded-2xl bg-white p-6 shadow-sm">
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
        </div>

        <div id="skills" className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Skills</h3>

          <form onSubmit={handleAddSkill} className="mt-5 flex max-w-[370px] gap-2">
            <input
              type="text"
              value={skillForm.title}
              onChange={(event) =>
                setSkillForm({
                  title: event.target.value,
                })
              }
              placeholder="Skill title"
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
              required
            />

            <button
              type="submit"
              disabled={savingSkill}
              className="h-11 rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSkill ? 'Adding...' : 'Add'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex h-10 items-center gap-2 rounded-[22px] bg-[#e8f9f2] px-4 text-sm font-medium text-gray-800"
              >
                <span>{skill.title}</span>

                <button
                  type="button"
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="font-bold text-red-600"
                >
                  x
                </button>
              </div>
            ))}

            {skills.length === 0 ? (
              <p className="text-sm text-gray-500">No skills added yet.</p>
            ) : null}
          </div>
          <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>
      </section>
      <section className="grid gap-3">
      <section id="media-management" className="grid items-start gap-3 xl:grid-cols-3">
        <div className="w-full max-w-[486px] justify-self-center rounded-2xl bg-white p-4 shadow-sm xl:justify-self-stretch">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Videos</h3>
            <span className="rounded-full bg-[#e8f9f2] px-3 py-1 text-xs font-bold text-gray-700">
              {videoGalleryCount}/{MAX_ACHIEVEMENT_VIDEOS} free
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, index) => {
              const item = videoItems[index];
              const locked = index >= MAX_ACHIEVEMENT_VIDEOS;

              return (
                <div
                  key={item?.id ?? `video-slot-${index}`}
                  className="aspect-square max-h-28 max-w-28 overflow-hidden rounded-xl border bg-gray-50"
                >
                  {item ? (
                    <div className="flex h-full flex-col">
                      <video
                        src={item.url}
                        controls
                        className="min-h-0 flex-1 object-cover"
                      />
                      <div className="flex shrink-0 items-center justify-center gap-1 p-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#23a7f1]"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(item)}
                          className="text-[11px] font-bold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : locked ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
                      <FaLock />
                      <span className="text-[11px] font-bold">Paid</span>
                    </div>
                  ) : (
                    <label className="flex h-full cursor-pointer flex-col items-center justify-center px-2 text-center text-[11px] font-bold text-gray-600">
                      Add Video
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(event) =>
                          handleGalleryUpload(event.target.files?.[0], 'video')
                        }
                        className="sr-only"
                        disabled={
                          uploadingGallery ||
                          videoGalleryCount >= MAX_ACHIEVEMENT_VIDEOS
                        }
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>

        <div id="reviews" className="w-full max-w-[486px] justify-self-center overflow-hidden rounded-2xl bg-white p-4 shadow-sm xl:justify-self-stretch">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Reviews</h3>
            <span className="text-sm font-bold text-[#23a7f1]">
              {getStars(worker.rating)}
            </span>
          </div>

          <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-sm">{review.user_name}</strong>
                  <span className="text-xs font-bold text-[#23a7f1]">
                    {getStars(review.rating)}
                  </span>
                </div>
                {review.created_at ? (
                  <p className="mt-1 text-xs font-bold text-green-700">
                    {formatDate(review.created_at)}
                  </p>
                ) : null}
                {review.comment ? (
                  <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
                ) : null}
              </article>
            ))}

            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet.</p>
            ) : null}
          </div>
          <div className="mt-4 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>

        <div className="w-full max-w-[486px] justify-self-center rounded-2xl bg-white p-4 shadow-sm xl:justify-self-stretch">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold">Images</h3>
            <span className="rounded-full bg-[#e8f9f2] px-3 py-1 text-xs font-bold text-gray-700">
              {imageGalleryCount}/{MAX_ACHIEVEMENT_IMAGES} free
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {Array.from({ length: 12 }).map((_, index) => {
              const item = imageItems[index];
              const locked = index >= MAX_ACHIEVEMENT_IMAGES;

              return (
                <div
                  key={item?.id ?? `image-slot-${index}`}
                  className="aspect-square max-h-28 max-w-28 overflow-hidden rounded-xl border bg-gray-50"
                >
                  {item ? (
                    <div className="flex h-full flex-col">
                      <div className="relative min-h-0 flex-1">
                        <Image
                          src={item.url}
                          alt="Worker achievement"
                          fill
                          className="object-cover"
                          sizes="112px"
                        />
                      </div>
                      <div className="flex shrink-0 items-center justify-center gap-1 p-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#23a7f1]"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteGalleryItem(item)}
                          className="text-[11px] font-bold text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : locked ? (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-400">
                      <FaLock />
                      <span className="text-[11px] font-bold">Paid</span>
                    </div>
                  ) : (
                    <label className="flex h-full cursor-pointer flex-col items-center justify-center px-2 text-center text-[11px] font-bold text-gray-600">
                      Add Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleGalleryUpload(event.target.files?.[0], 'image')
                        }
                        className="sr-only"
                        disabled={
                          uploadingGallery ||
                          imageGalleryCount >= MAX_ACHIEVEMENT_IMAGES
                        }
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>

          {uploadingGallery ? (
            <p className="mt-4 text-sm text-gray-600">
              Uploading achievement media...
            </p>
          ) : null}
          <div className="mt-4 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>
        </section>
      </section>


      <section className="grid items-start gap-6 lg:grid-cols-2">
        <div id="basic-info" className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold">Basic Information</h3>

        <form
          onSubmit={handleUpdateProfile}
          className="mt-5 grid max-w-[370px] gap-2"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Working Hours
            </label>
            <textarea
              value={editForm.working_hours}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  working_hours: event.target.value,
                }))
              }
              rows={1}
              className="min-h-11 w-full max-w-[345px] resize-none rounded-[24px] border-0 bg-[#e8f9f2] px-4 py-3 text-sm font-medium outline-none [field-sizing:content] focus:ring-2 focus:ring-[#23a7f1]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">About</label>
            <textarea
              value={editForm.description}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              rows={1}
              className="min-h-11 w-full max-w-[345px] resize-none rounded-[24px] border-0 bg-[#e8f9f2] px-4 py-3 text-sm font-medium outline-none [field-sizing:content] focus:ring-2 focus:ring-[#23a7f1]"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={savingProfile}
              className="h-11 rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
        <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>

        <div className="grid gap-6">
          <div id="contact" className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">Contact</h3>

            {contactActions.length > 0 ? (
              <div className="mt-5 grid gap-2">
                {contactActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <div key={action.label} className="flex items-center gap-2">
                      <a
                        href={action.href ?? '#'}
                        title={action.label}
                        aria-label={action.label}
                        target={action.href?.startsWith('http') ? '_blank' : undefined}
                        rel={action.href?.startsWith('http') ? 'noreferrer' : undefined}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#23a7f1] text-white shadow-sm hover:bg-[#168ed1]"
                      >
                        <Icon aria-hidden="true" />
                      </a>
                      <a
                        href={action.href ?? '#'}
                        title={action.label}
                        aria-label={action.label}
                        target={action.href?.startsWith('http') ? '_blank' : undefined}
                        rel={action.href?.startsWith('http') ? 'noreferrer' : undefined}
                        className="h-[39px] w-full max-w-[240px] rounded-[22px] bg-[#e8f9f2] hover:ring-2 hover:ring-[#23a7f1]"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}

            <form onSubmit={handleSaveSocialLinks} className="mt-5 grid max-w-[370px] gap-2">
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
                className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
                className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
                className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
                className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
                className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
              />

              <button
                type="submit"
                disabled={savingSocial}
                className="h-11 w-fit rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingSocial ? 'Saving...' : 'Save Social Links'}
              </button>
            </form>

            {socialLinks ? (
              <p className="mt-4 text-sm text-gray-500">
                Social links are saved for this worker profile.
              </p>
            ) : null}
            <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
          </div>

          <div id="latest-requests" className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-semibold">Latest Requests</h3>
              <Link
                href="/dashboard/worker/requests"
                className="rounded-full bg-[#23a7f1] px-4 py-2 text-sm font-bold text-white hover:bg-[#168ed1]"
              >
                Open All Requests
              </Link>
            </div>

            <div className="mt-5 grid max-w-[370px] gap-2">
              {latestRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-[24px] bg-[#e8f9f2] px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-semibold">{request.name}</h4>

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
                </div>
              ))}

              {latestRequests.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Requests sent to this worker will appear here.
                </p>
              ) : null}
            </div>
            <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
          </div>
        </div>
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-2">
        <div id="services" className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Services</h3>

          <form onSubmit={handleAddService} className="mt-5 grid max-w-[370px] gap-2">
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
              rows={1}
              className="min-h-11 w-full max-w-[345px] resize-none rounded-[24px] border-0 bg-[#e8f9f2] px-4 py-3 text-sm font-medium outline-none [field-sizing:content] focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
            />

            <button
              type="submit"
              disabled={savingService}
              className="h-11 w-fit rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingService ? 'Adding...' : 'Add Service'}
            </button>
          </form>

          <div className="mt-5 grid max-w-[370px] gap-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-[24px] bg-[#e8f9f2] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold">{service.title}</h4>

                    {service.description ? (
                      <p className="mt-1 break-words text-sm text-gray-600">
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
                    className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {services.length === 0 ? (
              <p className="text-sm text-gray-500">
                No services added yet.
              </p>
            ) : null}
          </div>
          <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>

        <div className="hidden overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Skills</h3>

          <form onSubmit={handleAddSkill} className="mt-5 flex max-w-[370px] gap-2">
            <input
              type="text"
              value={skillForm.title}
              onChange={(event) =>
                setSkillForm({
                  title: event.target.value,
                })
              }
              placeholder="Skill title"
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
              required
            />

            <button
              type="submit"
              disabled={savingSkill}
              className="h-11 rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSkill ? 'Adding...' : 'Add'}
            </button>
          </form>

          <div className="mt-5 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="flex h-10 items-center gap-2 rounded-[22px] bg-[#e8f9f2] px-4 text-sm font-medium text-gray-800"
              >
                <span>{skill.title}</span>

                <button
                  type="button"
                  onClick={() => handleDeleteSkill(skill.id)}
                  className="font-bold text-red-600"
                >
                  ×
                </button>
              </div>
            ))}

            {skills.length === 0 ? (
              <p className="text-sm text-gray-500">
                No skills added yet.
              </p>
            ) : null}
          </div>
          <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>
      </section>

      <section className="hidden items-start gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold">Contact</h3>

          {contactActions.length > 0 ? (
            <div className="mt-5 grid gap-2">
              {contactActions.map((action) => {
                const Icon = action.icon;

                return (
                  <div key={action.label} className="flex items-center gap-2">
                    <a
                      href={action.href ?? '#'}
                      title={action.label}
                      aria-label={action.label}
                      target={action.href?.startsWith('http') ? '_blank' : undefined}
                      rel={action.href?.startsWith('http') ? 'noreferrer' : undefined}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#23a7f1] text-white shadow-sm hover:bg-[#168ed1]"
                    >
                      <Icon aria-hidden="true" />
                    </a>
                    <a
                      href={action.href ?? '#'}
                      title={action.label}
                      aria-label={action.label}
                      target={action.href?.startsWith('http') ? '_blank' : undefined}
                      rel={action.href?.startsWith('http') ? 'noreferrer' : undefined}
                      className="h-[39px] w-full max-w-[240px] rounded-[22px] bg-[#e8f9f2] hover:ring-2 hover:ring-[#23a7f1]"
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          <form onSubmit={handleSaveSocialLinks} className="mt-5 grid max-w-[370px] gap-2">
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
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
              className="h-11 w-full max-w-[345px] rounded-[24px] border-0 bg-[#e8f9f2] px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-[#23a7f1]"
            />

            <button
              type="submit"
              disabled={savingSocial}
              className="h-11 w-fit rounded-[24px] bg-[#23a7f1] px-5 text-sm font-bold text-white hover:bg-[#168ed1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingSocial ? 'Saving...' : 'Save Social Links'}
            </button>
          </form>

          {socialLinks ? (
            <p className="mt-4 text-sm text-gray-500">
              Social links are saved for this worker profile.
            </p>
          ) : null}
          <div className="mt-5 h-3 rounded-b-2xl bg-[#c7f7f1]" />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">Latest Requests</h3>
            <Link
              href="/dashboard/worker/requests"
              className="rounded-full bg-[#23a7f1] px-4 py-2 text-sm font-bold text-white hover:bg-[#168ed1]"
            >
              Open All Requests
            </Link>
          </div>

          <div className="mt-5 grid max-w-[370px] gap-2">
            {latestRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-[24px] bg-[#e8f9f2] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-semibold">{request.name}</h4>

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
              </div>
            ))}

            {latestRequests.length === 0 ? (
              <p className="text-sm text-gray-500">
                Requests sent to this worker will appear here.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="flex items-center justify-between gap-4 rounded-2xl bg-[#c7f7f1] px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-bold uppercase text-gray-600">SENDIO</p>
          <h2 className="text-xl font-bold text-gray-900">
            Built to connect opportunity
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-700">
            All Sendio services are free. Keep your worker profile ready for
            better opportunities and stronger client connections.
          </p>
        </div>

        <Image
          src="/logo.png"
          alt="Sendio logo"
          width={92}
          height={92}
          className="h-20 w-20 shrink-0 object-contain"
          sizes="92px"
        />
      </footer>
    </div>
  );
}

