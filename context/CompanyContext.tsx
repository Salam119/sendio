'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { getCompanyId } from "@/lib/getCompanyId";

/* ================= TYPES ================= */

type Service = {
  id: string;
  title: string;
  description?: string;
};

type Project = {
  id: string;
  title: string;
  description?: string;
};

type GalleryItem = {
  id: string;
  url: string;
  type?: 'image' | 'video';
};

type Article = {
  id: string;
  title: string;
  content: string;
};

type Feature = {
  id: string;
  title: string;
};

type Review = {
  id: string;
  user: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type Message = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

type Ad = {
  id: string;
  title: string;
  logo?: string;
  active: boolean;
};

type SocialLinks = {
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  x?: string;
  website?: string;
};

type Company = {
  name: string;
  slug?: string;
  description: string;
  logo?: string;
  cover?: string;
  category?: string;

  city: string;
  address: string;

  phone: string;
  email: string;
  website?: string;

  status: 'available' | 'busy' | 'closed';
  workingHours?: string;

  social: SocialLinks;

  services: Service[];
  projects: Project[];
  gallery: GalleryItem[];
  articles: Article[];
  features: Feature[];

  reviews: Review[];
  messages: Message[];
  ads: Ad[];

  views: number;
  connections: number;
  rating: number;
  reviewsCount: number;
};

/* ================= CONTEXT TYPE ================= */

type CompanyContextType = {
  company: Company;

  addService: (title: string) => Promise<void>;
  deleteService: (id: string) => Promise<void>;

  addProject: (title: string, description?: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addGalleryItem: (url: string, type?: 'image' | 'video') => void;
  deleteGalleryItem: (id: string) => void;

  addFeature: (title: string) => void;
  deleteFeature: (id: string) => void;

  addArticle: (title: string, content: string) => void;
  deleteArticle: (id: string) => void;

  updateSocial: (data: SocialLinks) => void;

  addReview: (user: string, rating: number, comment: string) => void;

  addMessage: (name: string, email: string, message: string) => void;

  createAd: (title: string) => void;
  toggleAd: (id: string) => void;
  deleteAd: (id: string) => void;

  incrementViews: () => void;
  addConnection: () => void;
  addRating: (value: number) => void;
};

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

/* ================= PROVIDER ================= */

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [company, setCompany] = useState<Company>({
    name: "",
    slug: "",
    description: "",
    logo: "",
    cover: "",
    category: "",

    city: "",
    address: "",

    phone: "",
    email: "",
    website: "",

    status: 'available',
    workingHours: "",

    social: {},

    services: [],
    projects: [],
    gallery: [],
    articles: [],
    features: [],

    reviews: [],
    messages: [],
    ads: [],

    views: 0,
    connections: 0,
    rating: 0,
    reviewsCount: 0,
  });

  const uid = () => Date.now().toString();

  /* ================= LOAD COMPANY ID ================= */

  useEffect(() => {
    let isMounted = true;

    async function initCompany() {
      try {
        const id = await getCompanyId();

        if (!isMounted || !id) {
          return;
        }

        setCompanyId(id);

        await Promise.all([
          loadServices(id),
          loadProjects(id),
        ]);
      } catch {
        if (!isMounted) {
          return;
        }

        setCompanyId(null);
      }
    }

    initCompany();

    return () => {
      isMounted = false;
    };
  }, []);

  /* ================= SERVICES ================= */

  async function loadServices(id: string) {
    const { data, error } = await supabase
      .from('company_services')
      .select('id, title, description')
      .eq('company_id', id)
      .order('id', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCompany(prev => ({
      ...prev,
      services: data || [],
    }));
  }

  const addService = async (title: string) => {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return;
    }

    const { error } = await supabase
      .from('company_services')
      .insert({
        company_id: companyId,
        title: cleanTitle,
      });

    if (error) {
      alert(error.message);
      return;
    }

    await loadServices(companyId);
  };

  const deleteService = async (id: string) => {
    const { error } = await supabase
      .from('company_services')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    if (companyId) {
      await loadServices(companyId);
    }
  };

  /* ================= PROJECTS ================= */

  async function loadProjects(id: string) {
    const { data, error } = await supabase
      .from('company_projects')
      .select('id, title, description')
      .eq('company_id', id)
      .order('id', { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setCompany(prev => ({
      ...prev,
      projects: data || [],
    }));
  }

  const addProject = async (
    title: string,
    description?: string
  ) => {
    if (!companyId) {
      alert('Company ID not found.');
      return;
    }

    const cleanTitle = title.trim();
    const cleanDescription = description?.trim() || null;

    if (!cleanTitle) {
      return;
    }

    const { error } = await supabase
      .from('company_projects')
      .insert({
        company_id: companyId,
        title: cleanTitle,
        description: cleanDescription,
      });

    if (error) {
      alert(error.message);
      return;
    }

    await loadProjects(companyId);
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase
      .from('company_projects')
      .delete()
      .eq('id', id);

    if (error) {
      alert(error.message);
      return;
    }

    if (companyId) {
      await loadProjects(companyId);
    }
  };

  /* ================= GALLERY ================= */

  const addGalleryItem = (url: string, type: 'image' | 'video' = 'image') => {
    setCompany(prev => ({
      ...prev,
      gallery: [...prev.gallery, { id: uid(), url, type }]
    }));
  };

  const deleteGalleryItem = (id: string) => {
    setCompany(prev => ({
      ...prev,
      gallery: prev.gallery.filter(g => g.id !== id)
    }));
  };

  /* ================= FEATURES ================= */

  const addFeature = (title: string) => {
    setCompany(prev => ({
      ...prev,
      features: [...prev.features, { id: uid(), title }]
    }));
  };

  const deleteFeature = (id: string) => {
    setCompany(prev => ({
      ...prev,
      features: prev.features.filter(f => f.id !== id)
    }));
  };

  /* ================= ARTICLES ================= */

  const addArticle = (title: string, content: string) => {
    setCompany(prev => ({
      ...prev,
      articles: [...prev.articles, { id: uid(), title, content }]
    }));
  };

  const deleteArticle = (id: string) => {
    setCompany(prev => ({
      ...prev,
      articles: prev.articles.filter(a => a.id !== id)
    }));
  };

  /* ================= SOCIAL ================= */

  const updateSocial = (data: SocialLinks) => {
    setCompany(prev => ({
      ...prev,
      social: { ...prev.social, ...data }
    }));
  };

  /* ================= REVIEWS ================= */

  const addReview = (user: string, rating: number, comment: string) => {
    setCompany(prev => {
      const newReviews = [
        ...prev.reviews,
        {
          id: uid(),
          user,
          rating,
          comment,
          createdAt: new Date().toISOString(),
        }
      ];

      const avg =
        newReviews.reduce((acc, r) => acc + r.rating, 0) /
        newReviews.length;

      return {
        ...prev,
        reviews: newReviews,
        reviewsCount: newReviews.length,
        rating: Number(avg.toFixed(1))
      };
    });
  };

  /* ================= MESSAGES ================= */

  const addMessage = (name: string, email: string, message: string) => {
    setCompany(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: uid(),
          name,
          email,
          message,
          createdAt: new Date().toISOString(),
        }
      ]
    }));
  };

  /* ================= ADS ================= */

  const createAd = (title: string) => {
    setCompany(prev => ({
      ...prev,
      ads: [...prev.ads, { id: uid(), title, active: true }]
    }));
  };

  const toggleAd = (id: string) => {
    setCompany(prev => ({
      ...prev,
      ads: prev.ads.map(ad =>
        ad.id === id ? { ...ad, active: !ad.active } : ad
      )
    }));
  };

  const deleteAd = (id: string) => {
    setCompany(prev => ({
      ...prev,
      ads: prev.ads.filter(ad => ad.id !== id)
    }));
  };

  /* ================= ANALYTICS ================= */

  const incrementViews = () => {
    setCompany(prev => ({
      ...prev,
      views: prev.views + 1
    }));
  };

  const addConnection = () => {
    setCompany(prev => ({
      ...prev,
      connections: prev.connections + 1
    }));
  };

  const addRating = (value: number) => {
    setCompany(prev => ({
      ...prev,
      rating: (prev.rating + value) / 2
    }));
  };

  return (
    <CompanyContext.Provider
      value={{
        company,

        addService,
        deleteService,

        addProject,
        deleteProject,

        addGalleryItem,
        deleteGalleryItem,

        addFeature,
        deleteFeature,

        addArticle,
        deleteArticle,

        updateSocial,

        addReview,

        addMessage,

        createAd,
        toggleAd,
        deleteAd,

        incrementViews,
        addConnection,
        addRating,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

/* ================= HOOK ================= */

export function useCompany() {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error("useCompany must be used inside CompanyProvider");
  }

  return context;
}